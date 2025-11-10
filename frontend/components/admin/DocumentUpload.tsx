"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from "lucide-react";
import { documentApi } from "@/lib/api";
import { Button } from "../ui/Button";

interface UploadedFile {
  id: string;
  filename: string;
  trackId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  uploadedAt: Date;
  error?: string;
  retryCount?: number;
  canRetry?: boolean;
  fileData?: File; // Store file for retry (not persisted)
}

// Storage key for persisting files
const STORAGE_KEY = "rag_uploaded_files";

export function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const autoRetryTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load files from localStorage and API on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        // Load from localStorage
        const savedFiles = localStorage.getItem(STORAGE_KEY);
        if (savedFiles) {
          const parsed = JSON.parse(savedFiles);
          // Convert date strings back to Date objects
          const restoredFiles: UploadedFile[] = parsed.map((f: any) => ({
            ...f,
            uploadedAt: new Date(f.uploadedAt),
            fileData: undefined, // Don't restore File objects
          }));
          setFiles(restoredFiles);
        }

        // Also load from API to sync with server - fetch ALL documents
        try {
          const apiResponse = await documentApi.list({ limit: 1000 });
          console.log("API Response:", apiResponse); // Debug log
          
          // Handle the actual API response structure: { statuses: { processed: [...], failed: [...] } }
          let documents: any[] = [];
          
          if (apiResponse?.statuses) {
            // Extract documents from statuses object
            const processed = apiResponse.statuses.processed || [];
            const failed = apiResponse.statuses.failed || [];
            const processing = apiResponse.statuses.processing || [];
            const pending = apiResponse.statuses.pending || [];
            
            // Combine all documents from different status categories
            documents = [...processed, ...failed, ...processing, ...pending];
            console.log(`Found ${documents.length} documents from API (processed: ${processed.length}, failed: ${failed.length}, processing: ${processing.length}, pending: ${pending.length})`);
          } else if (apiResponse?.documents) {
            // Fallback to direct documents array
            documents = apiResponse.documents;
            console.log(`Found ${documents.length} documents from API (direct documents array)`);
          } else if (Array.isArray(apiResponse)) {
            // Fallback to array response
            documents = apiResponse;
            console.log(`Found ${documents.length} documents from API (array response)`);
          }
          
          if (documents.length > 0) {
            // Convert API documents to our format
            const apiFiles: UploadedFile[] = documents.map((doc: any, index: number) => {
              // Get filename from file_path field
              const filename = doc.file_path || doc.filename || doc.name || `Document ${index + 1}`;
              
              // Map status - API uses "processed", "failed", "processing", "pending"
              let docStatus: "pending" | "processing" | "completed" | "failed" = "pending";
              if (doc.status === "processed") {
                docStatus = "completed";
              } else if (doc.status === "processing") {
                docStatus = "processing";
              } else if (doc.status === "failed") {
                docStatus = "failed";
              } else if (doc.status === "pending") {
                docStatus = "pending";
              }
              
              return {
                id: doc.id || doc.doc_id || doc.track_id || `doc_${index}_${Date.now()}`,
                filename: filename,
                trackId: doc.track_id || doc.id || doc.doc_id || "",
                status: docStatus,
                progress: docStatus === "completed" ? 100 : undefined,
                uploadedAt: doc.created_at ? new Date(doc.created_at) : 
                           doc.updated_at ? new Date(doc.updated_at) : 
                           new Date(),
                retryCount: 0,
                canRetry: docStatus === "failed",
                error: docStatus === "failed" ? (doc.error_msg || doc.error || undefined) : undefined,
              };
            });

            console.log("Converted API files:", apiFiles);

            // Use API documents as primary source, merge with localStorage for failed uploads
            setFiles((prev) => {
              const apiFilesMap = new Map<string, UploadedFile>();
              
              // Add all API files
              apiFiles.forEach((file) => {
                apiFilesMap.set(file.filename, file);
              });
              
              // Add localStorage files that aren't in API (failed uploads that haven't been processed)
              prev.forEach((file) => {
                if (!apiFilesMap.has(file.filename) && file.status === "failed") {
                  apiFilesMap.set(file.filename, file);
                }
              });

              const finalFiles = Array.from(apiFilesMap.values());
              console.log(`Final files list: ${finalFiles.length} documents`);
              return finalFiles;
            });
          } else {
            // If API returns empty, keep localStorage files
            console.log("No documents found in API response. Response structure:", apiResponse);
          }
        } catch (apiError) {
          console.error("Failed to load documents from API:", apiError);
        }
      } catch (error) {
        console.error("Failed to load files from localStorage:", error);
      }
    };

    loadFiles();
  }, []);

  // Persist files to localStorage whenever they change
  useEffect(() => {
    try {
      // Don't persist File objects
      const filesToSave = files.map(({ fileData, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
    } catch (error) {
      console.error("Failed to save files to localStorage:", error);
    }
  }, [files]);

  // Check status for processing files
  useEffect(() => {
    const checkStatuses = async () => {
      const processingFiles = files.filter(
        (f) => f.status === "pending" || f.status === "processing"
      );

      for (const file of processingFiles) {
        if (!file.trackId) continue;
        
        try {
          const statusData = await documentApi.getStatus(file.trackId);
          
          // Handle the actual API response structure
          // Response: { track_id, documents: [{ status, ... }], status_summary, total_count }
          let newStatus: "pending" | "processing" | "completed" | "failed" = "pending";
          let progress: number | undefined;
          let error: string | undefined;

          if (statusData.documents && statusData.documents.length > 0) {
            // Get the first document's status (or aggregate if multiple)
            const docStatuses = statusData.documents.map((doc: any) => doc.status);
            
            // Map API statuses to our statuses
            if (docStatuses.every((s: string) => s === "processed")) {
              newStatus = "completed";
              progress = 100;
            } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
              newStatus = "failed";
              const failedDoc = statusData.documents.find((doc: any) => 
                doc.status === "failed" || doc.status === "error" || doc.error_msg
              );
              error = failedDoc?.error_msg || "Processing failed";
            } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
              newStatus = "processing";
              // Calculate progress based on processed vs total
              const processedCount = docStatuses.filter((s: string) => s === "processed").length;
              progress = Math.round((processedCount / docStatuses.length) * 100);
            } else {
              newStatus = "processing";
            }
          } else if (statusData.status_summary) {
            // Fallback to status_summary if documents array is empty
            const summary = statusData.status_summary;
            if (summary.processed && summary.processed > 0) {
              newStatus = "completed";
              progress = 100;
            } else if (summary.failed && summary.failed > 0) {
              newStatus = "failed";
              error = "Processing failed";
            } else {
              newStatus = "processing";
            }
          }
          
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === file.id) {
                return {
                  ...f,
                  status: newStatus,
                  progress,
                  error,
                };
              }
              return f;
            })
          );

          // Clear interval if completed or failed
          if (newStatus === "completed" || newStatus === "failed") {
            const interval = statusCheckIntervals.current.get(file.id);
            if (interval) {
              clearInterval(interval);
              statusCheckIntervals.current.delete(file.id);
            }
          }
        } catch (error: any) {
          console.error(`Error checking status for ${file.filename}:`, error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { 
                    ...f, 
                    status: "failed", 
                    error: error.response?.data?.detail || error.message || "Failed to check status"
                  }
                : f
            )
          );
          const interval = statusCheckIntervals.current.get(file.id);
          if (interval) {
            clearInterval(interval);
            statusCheckIntervals.current.delete(file.id);
          }
        }
      }
    };

    const interval = setInterval(checkStatuses, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [files]);

  // Cleanup intervals and timers on unmount
  useEffect(() => {
    return () => {
      statusCheckIntervals.current.forEach((interval) => clearInterval(interval));
      statusCheckIntervals.current.clear();
      autoRetryTimers.current.forEach((timer) => clearTimeout(timer));
      autoRetryTimers.current.clear();
    };
  }, []);

  // Function to retry a failed upload
  const retryUpload = useCallback(async (fileId: string, fileData: File, retryCount: number = 0) => {
    if (retryCount >= 3) {
      // Max 3 retries
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, canRetry: false, status: "failed", error: "Maximum retry attempts (3) reached. Please try uploading again manually." }
            : f
        )
      );
      return;
    }

    // Clear any existing auto-retry timer
    const existingTimer = autoRetryTimers.current.get(fileId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      autoRetryTimers.current.delete(fileId);
    }

    // Update file to show retrying
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              status: "pending",
              error: undefined,
              canRetry: false,
              retryCount: retryCount + 1,
            }
          : f
      )
    );

    try {
      // Create a new File object from the original to ensure it's not consumed
      // If fileData is already a File, use it directly; otherwise create a new one
      let fileToUpload: File;
      if (fileData instanceof File) {
        // Create a new File object from the original file's data
        // Read the file as blob and create a new File
        const fileBlob = await fileData.arrayBuffer();
        fileToUpload = new File([fileBlob], fileData.name, { type: fileData.type });
      } else {
        fileToUpload = fileData;
      }
      
      const response = await documentApi.upload(fileToUpload);
      
      // Handle different response formats
      const trackId = response?.track_id || response?.trackId || response?.data?.track_id;
      
      if (response && trackId) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, trackId: trackId, status: "processing" }
              : f
          )
        );

        // Start polling for status
        const interval = setInterval(async () => {
          try {
            const statusData = await documentApi.getStatus(trackId);
            
            let newStatus: "pending" | "processing" | "completed" | "failed" = "pending";
            let progress: number | undefined;
            let error: string | undefined;

            if (statusData.documents && statusData.documents.length > 0) {
              const docStatuses = statusData.documents.map((doc: any) => doc.status);
              
              if (docStatuses.every((s: string) => s === "processed")) {
                newStatus = "completed";
                progress = 100;
              } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                newStatus = "failed";
                const failedDoc = statusData.documents.find((doc: any) => 
                  doc.status === "failed" || doc.status === "error" || doc.error_msg
                );
                error = failedDoc?.error_msg || "Processing failed";
              } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                newStatus = "processing";
                const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                progress = Math.round((processedCount / docStatuses.length) * 100);
              } else {
                newStatus = "processing";
              }
            } else if (statusData.status_summary) {
              const summary = statusData.status_summary;
              if (summary.processed && summary.processed > 0) {
                newStatus = "completed";
                progress = 100;
              } else if (summary.failed && summary.failed > 0) {
                newStatus = "failed";
                error = "Processing failed";
              } else {
                newStatus = "processing";
              }
            }
            
            setFiles((prev) =>
              prev.map((f) => {
                if (f.trackId === trackId) {
                  if (newStatus === "completed" || newStatus === "failed") {
                    clearInterval(interval);
                    statusCheckIntervals.current.delete(fileId);
                    
                    // If failed, schedule automatic retry
                    if (newStatus === "failed") {
                      const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
                      const autoRetryTimer = setTimeout(() => {
                        retryUpload(fileId, fileData, retryCount + 1);
                      }, retryDelay);
                      autoRetryTimers.current.set(fileId, autoRetryTimer);
                    }
                  }

                  return {
                    ...f,
                    status: newStatus,
                    progress,
                    error,
                    canRetry: newStatus === "failed",
                  };
                }
                return f;
              })
            );
          } catch (error: any) {
            console.error(`Error checking status:`, error);
            clearInterval(interval);
            statusCheckIntervals.current.delete(fileId);
            
            // Schedule automatic retry on error
            const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
            const autoRetryTimer = setTimeout(() => {
              retryUpload(fileId, fileData, retryCount + 1);
            }, retryDelay);
            autoRetryTimers.current.set(fileId, autoRetryTimer);
          }
        }, 2000);

        statusCheckIntervals.current.set(fileId, interval);
      } else {
        // Log the actual response for debugging
        console.error("Retry upload response:", response);
        throw new Error(
          `No track_id received from server. Response: ${JSON.stringify(response)}`
        );
      }
    } catch (error: any) {
      console.error(`Error retrying upload ${fileData.name}:`, error);
      const errorMessage = error.response?.data?.detail || error.message || "Upload failed";
      
      // Schedule automatic retry after 2-3 minutes
      const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: "failed",
                error: `${errorMessage}\n\n🔄 Automatic retry scheduled in ${Math.round(retryDelay / 1000 / 60)} minutes...`,
                canRetry: true,
                retryCount: retryCount + 1,
              }
            : f
        )
      );

      // Schedule automatic retry - store file data for next retry
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, fileData: fileData } // Ensure fileData is stored
            : f
        )
      );

      const autoRetryTimer = setTimeout(() => {
        setFiles((prev) => {
          const fileToRetry = prev.find((f) => f.id === fileId);
          if (fileToRetry && fileToRetry.fileData) {
            retryUpload(fileId, fileToRetry.fileData, retryCount + 1);
          }
          return prev;
        });
      }, retryDelay);

      autoRetryTimers.current.set(fileId, autoRetryTimer);
    }
  }, []);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);
    await uploadFiles(fileArray);
  };

  const uploadFiles = async (fileArray: File[]) => {
    setIsUploading(true);

    for (const file of fileArray) {
      const fileId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      const newFile: UploadedFile = {
        id: fileId,
        filename: file.name,
        trackId: "",
        status: "pending",
        uploadedAt: new Date(),
        fileData: file, // Store file for potential retry
        retryCount: 0,
        canRetry: false,
      };

      setFiles((prev) => [...prev, newFile]);

      try {
        const response = await documentApi.upload(file);
        
        // Handle different response formats
        let trackId = response?.track_id || response?.trackId || response?.data?.track_id;
        
        // Handle duplicate file case - treat it as normal processing, not an error
        if (response?.status === "duplicated" || response?.status === "duplicate" || !trackId) {
          // First, try to parse status from response message if available
          let statusFromMessage: "pending" | "processing" | "completed" | "failed" | null = null;
          const responseMessage = response?.message || "";
          if (responseMessage.includes("Status: processed")) {
            statusFromMessage = "completed";
          } else if (responseMessage.includes("Status: processing")) {
            statusFromMessage = "processing";
          } else if (responseMessage.includes("Status: failed")) {
            statusFromMessage = "failed";
          }
          
          // File already exists, try to find it in the documents list
          try {
            const documentsList = await documentApi.list({ limit: 100 });
            if (documentsList && documentsList.documents) {
              const existingDoc = documentsList.documents.find(
                (doc: any) => (doc.file_path === file.name || doc.filename === file.name)
              );
              if (existingDoc) {
                trackId = existingDoc.track_id || existingDoc.id || "";
                
                // Immediately fetch current status to get progress - make it look like normal upload
                // Start with status from message if available, otherwise default to processing
                let currentStatus: "pending" | "processing" | "completed" | "failed" = statusFromMessage || "processing";
                let currentProgress: number | undefined = statusFromMessage === "completed" ? 100 : undefined;
                let currentError: string | undefined = undefined;
                
                if (trackId) {
                  try {
                    const statusData = await documentApi.getStatus(trackId);
                    
                    if (statusData.documents && statusData.documents.length > 0) {
                      const docStatuses = statusData.documents.map((doc: any) => doc.status);
                      
                      if (docStatuses.every((s: string) => s === "processed")) {
                        currentStatus = "completed";
                        currentProgress = 100;
                      } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                        currentStatus = "failed";
                        const failedDoc = statusData.documents.find((doc: any) => 
                          doc.status === "failed" || doc.status === "error" || doc.error_msg
                        );
                        currentError = failedDoc?.error_msg || "Processing failed";
                      } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                        currentStatus = "processing";
                        const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                        currentProgress = Math.round((processedCount / docStatuses.length) * 100);
                      } else {
                        currentStatus = "processing";
                      }
                    } else if (statusData.status_summary) {
                      const summary = statusData.status_summary;
                      if (summary.processed && summary.processed > 0) {
                        currentStatus = "completed";
                        currentProgress = 100;
                      } else if (summary.failed && summary.failed > 0) {
                        currentStatus = "failed";
                        currentError = "Processing failed";
                      } else {
                        currentStatus = "processing";
                      }
                    } else {
                      // Default to processing if we can't determine status
                      currentStatus = "processing";
                    }
                  } catch (statusError) {
                    console.warn("Failed to get status for duplicate file:", statusError);
                    // Default to processing - don't show as failed
                    currentStatus = "processing";
                  }
                } else {
                  // No trackId, default to processing
                  currentStatus = "processing";
                }
                
                // Update file status immediately - no error message unless actually failed
                // If status from message is completed, use that immediately
                const finalStatus = statusFromMessage === "completed" ? "completed" : currentStatus;
                const finalProgress = statusFromMessage === "completed" ? 100 : currentProgress;
                
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === fileId
                      ? {
                          ...f,
                          trackId: trackId,
                          status: finalStatus,
                          progress: finalProgress,
                          error: finalStatus === "failed" ? currentError : undefined, // Only set error if failed
                          canRetry: finalStatus === "failed",
                        }
                      : f
                  )
                );
                
                // Always start polling if we have a trackId and status is processing/pending - this ensures progress updates
                // Don't poll if already completed from message
                if (trackId && finalStatus !== "completed" && finalStatus !== "failed") {
                  // Start polling for status updates
                  const interval = setInterval(async () => {
                    try {
                      const statusData = await documentApi.getStatus(trackId);
                      
                      let newStatus: "pending" | "processing" | "completed" | "failed" = "processing";
                      let progress: number | undefined;
                      let error: string | undefined;

                      if (statusData.documents && statusData.documents.length > 0) {
                        const docStatuses = statusData.documents.map((doc: any) => doc.status);
                        
                        if (docStatuses.every((s: string) => s === "processed")) {
                          newStatus = "completed";
                          progress = 100;
                        } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                          newStatus = "failed";
                          const failedDoc = statusData.documents.find((doc: any) => 
                            doc.status === "failed" || doc.status === "error" || doc.error_msg
                          );
                          error = failedDoc?.error_msg || "Processing failed";
                        } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                          newStatus = "processing";
                          const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                          progress = Math.round((processedCount / docStatuses.length) * 100);
                        } else {
                          newStatus = "processing";
                        }
                      } else if (statusData.status_summary) {
                        const summary = statusData.status_summary;
                        if (summary.processed && summary.processed > 0) {
                          newStatus = "completed";
                          progress = 100;
                        } else if (summary.failed && summary.failed > 0) {
                          newStatus = "failed";
                          error = "Processing failed";
                        } else {
                          newStatus = "processing";
                        }
                      }
                      
                      setFiles((prev) =>
                        prev.map((f) => {
                          if (f.trackId === trackId) {
                            if (newStatus === "completed" || newStatus === "failed") {
                              clearInterval(interval);
                              statusCheckIntervals.current.delete(fileId);
                            }

                            return {
                              ...f,
                              status: newStatus,
                              progress,
                              error: newStatus === "failed" ? error : undefined,
                              canRetry: newStatus === "failed",
                            };
                          }
                          return f;
                        })
                      );
                    } catch (error) {
                      console.error(`Error checking status:`, error);
                      clearInterval(interval);
                      statusCheckIntervals.current.delete(fileId);
                    }
                  }, 2000);
                  statusCheckIntervals.current.set(fileId, interval);
                }
                
                continue; // Skip to next file - successfully handled as duplicate
              }
            }
          } catch (listError) {
            console.warn("Failed to check existing documents:", listError);
          }
          
          // If we couldn't find the existing document and no trackId, treat as error
          if (!trackId) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: "failed",
                      error: response?.message || "File already exists but could not be tracked",
                      canRetry: false, // Don't retry duplicates
                    }
                  : f
              )
            );
            continue; // Skip to next file
          }
        }
        
        if (response && trackId) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, trackId: trackId, status: "processing" }
                : f
            )
          );

          // Start polling for status
          const interval = setInterval(async () => {
            try {
              const statusData = await documentApi.getStatus(trackId);
              
              // Handle the actual API response structure
              let newStatus: "pending" | "processing" | "completed" | "failed" = "pending";
              let progress: number | undefined;
              let error: string | undefined;

              if (statusData.documents && statusData.documents.length > 0) {
                const docStatuses = statusData.documents.map((doc: any) => doc.status);
                
                if (docStatuses.every((s: string) => s === "processed")) {
                  newStatus = "completed";
                  progress = 100;
                } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                  newStatus = "failed";
                  const failedDoc = statusData.documents.find((doc: any) => 
                    doc.status === "failed" || doc.status === "error" || doc.error_msg
                  );
                  error = failedDoc?.error_msg || "Processing failed";
                  
                  // Schedule automatic retry for failed processing
                  const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
                  setFiles((prev) => {
                    const fileToRetry = prev.find((f) => f.trackId === trackId);
                    if (fileToRetry && fileToRetry.fileData) {
                      const autoRetryTimer = setTimeout(() => {
                        retryUpload(fileToRetry.id, fileToRetry.fileData!, fileToRetry.retryCount || 0);
                      }, retryDelay);
                      autoRetryTimers.current.set(fileToRetry.id, autoRetryTimer);
                    }
                    return prev;
                  });
                } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                  newStatus = "processing";
                  const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                  progress = Math.round((processedCount / docStatuses.length) * 100);
                } else {
                  newStatus = "processing";
                }
              } else if (statusData.status_summary) {
                const summary = statusData.status_summary;
                if (summary.processed && summary.processed > 0) {
                  newStatus = "completed";
                  progress = 100;
                } else if (summary.failed && summary.failed > 0) {
                  newStatus = "failed";
                  error = "Processing failed";
                } else {
                  newStatus = "processing";
                }
              }
              
              setFiles((prev) =>
                prev.map((f) => {
                  if (f.trackId === trackId) {
                    if (newStatus === "completed" || newStatus === "failed") {
                      clearInterval(interval);
                      statusCheckIntervals.current.delete(fileId);
                    }

                    return {
                      ...f,
                      status: newStatus,
                      progress,
                      error: newStatus === "failed" ? error : undefined, // Only set error if failed
                      canRetry: newStatus === "failed",
                    };
                  }
                  return f;
                })
              );
            } catch (error: any) {
              console.error(`Error checking status:`, error);
              clearInterval(interval);
              statusCheckIntervals.current.delete(fileId);
            }
          }, 2000);

          statusCheckIntervals.current.set(fileId, interval);
        } else {
          // Log the actual response for debugging
          console.error("Upload response:", response);
          
          // If status is duplicated but no track_id, try to find it - this should have been handled above, but just in case
          if (response?.status === "duplicated" || response?.status === "duplicate") {
            // This case should already be handled above, but if we reach here, handle it
            try {
              const documentsList = await documentApi.list({ limit: 100 });
              if (documentsList && documentsList.documents) {
                const existingDoc = documentsList.documents.find(
                  (doc: any) => (doc.file_path === file.name || doc.filename === file.name)
                );
                if (existingDoc) {
                  const foundTrackId = existingDoc.track_id || existingDoc.id || "";
                  
                  // First, try to parse status from response message if available
                  let statusFromMessage: "pending" | "processing" | "completed" | "failed" | null = null;
                  const responseMessage = response?.message || "";
                  if (responseMessage.includes("Status: processed")) {
                    statusFromMessage = "completed";
                  } else if (responseMessage.includes("Status: processing")) {
                    statusFromMessage = "processing";
                  } else if (responseMessage.includes("Status: failed")) {
                    statusFromMessage = "failed";
                  }
                  
                  // Immediately fetch status from track_status endpoint to get accurate status
                  // Start with status from message if available, otherwise default to processing
                  let existingStatus: "pending" | "processing" | "completed" | "failed" = statusFromMessage || "processing";
                  let existingProgress: number | undefined = statusFromMessage === "completed" ? 100 : undefined;
                  let existingError: string | undefined = undefined;
                  
                  if (foundTrackId) {
                    try {
                      const statusData = await documentApi.getStatus(foundTrackId);
                      
                      if (statusData.documents && statusData.documents.length > 0) {
                        const docStatuses = statusData.documents.map((doc: any) => doc.status);
                        
                        if (docStatuses.every((s: string) => s === "processed")) {
                          existingStatus = "completed";
                          existingProgress = 100;
                        } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                          existingStatus = "failed";
                          const failedDoc = statusData.documents.find((doc: any) => 
                            doc.status === "failed" || doc.status === "error" || doc.error_msg
                          );
                          existingError = failedDoc?.error_msg || "Processing failed";
                        } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                          existingStatus = "processing";
                          const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                          existingProgress = Math.round((processedCount / docStatuses.length) * 100);
                        } else {
                          existingStatus = "processing";
                        }
                      } else if (statusData.status_summary) {
                        const summary = statusData.status_summary;
                        if (summary.processed && summary.processed > 0) {
                          existingStatus = "completed";
                          existingProgress = 100;
                        } else if (summary.failed && summary.failed > 0) {
                          existingStatus = "failed";
                          existingError = "Processing failed";
                        } else {
                          existingStatus = "processing";
                        }
                      } else {
                        // Fallback to existingDoc status from list
                        existingStatus = existingDoc.status === "processed" ? "completed" :
                                      existingDoc.status === "processing" ? "processing" :
                                      existingDoc.status === "failed" ? "failed" : "pending";
                      }
                    } catch (statusError) {
                      console.warn("Failed to get status for duplicate file:", statusError);
                      // Fallback to existingDoc status
                      existingStatus = existingDoc.status === "processed" ? "completed" :
                                    existingDoc.status === "processing" ? "processing" :
                                    existingDoc.status === "failed" ? "failed" : "pending";
                    }
                  } else {
                    // No trackId, use existingDoc status
                    existingStatus = existingDoc.status === "processed" ? "completed" :
                                  existingDoc.status === "processing" ? "processing" :
                                  existingDoc.status === "failed" ? "failed" : "pending";
                  }
                  
                  // NEVER set error message unless status is actually failed
                  // If status from message is completed, use that immediately
                  const finalStatus = statusFromMessage === "completed" ? "completed" : existingStatus;
                  const finalProgress = statusFromMessage === "completed" ? 100 : (existingStatus === "completed" ? 100 : existingProgress);
                  const errorMessage = finalStatus === "failed" 
                    ? (existingError || existingDoc.error_msg || "Processing failed")
                    : undefined;
                  
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === fileId
                        ? {
                            ...f,
                            trackId: foundTrackId,
                            status: finalStatus,
                            progress: finalProgress,
                            error: errorMessage, // Only set if failed
                            canRetry: finalStatus === "failed",
                          }
                        : f
                    )
                  );
                  
                  // If processing or pending, start polling to show progress
                  // Don't poll if already completed from message
                  if (foundTrackId && finalStatus !== "completed" && finalStatus !== "failed") {
                    const interval = setInterval(async () => {
                      try {
                        const statusData = await documentApi.getStatus(foundTrackId);
                        
                        let newStatus: "pending" | "processing" | "completed" | "failed" = "processing";
                        let progress: number | undefined;
                        let error: string | undefined;

                        if (statusData.documents && statusData.documents.length > 0) {
                          const docStatuses = statusData.documents.map((doc: any) => doc.status);
                          
                          if (docStatuses.every((s: string) => s === "processed")) {
                            newStatus = "completed";
                            progress = 100;
                          } else if (docStatuses.some((s: string) => s === "failed" || s === "error")) {
                            newStatus = "failed";
                            const failedDoc = statusData.documents.find((doc: any) => 
                              doc.status === "failed" || doc.status === "error" || doc.error_msg
                            );
                            error = failedDoc?.error_msg || "Processing failed";
                          } else if (docStatuses.some((s: string) => s === "processing" || s === "pending")) {
                            newStatus = "processing";
                            const processedCount = docStatuses.filter((s: string) => s === "processed").length;
                            progress = Math.round((processedCount / docStatuses.length) * 100);
                          } else {
                            newStatus = "processing";
                          }
                        } else if (statusData.status_summary) {
                          const summary = statusData.status_summary;
                          if (summary.processed && summary.processed > 0) {
                            newStatus = "completed";
                            progress = 100;
                          } else if (summary.failed && summary.failed > 0) {
                            newStatus = "failed";
                            error = "Processing failed";
                          } else {
                            newStatus = "processing";
                          }
                        }
                        
                        setFiles((prev) =>
                          prev.map((f) => {
                            if (f.trackId === foundTrackId) {
                              if (newStatus === "completed" || newStatus === "failed") {
                                clearInterval(interval);
                                statusCheckIntervals.current.delete(fileId);
                              }

                              return {
                                ...f,
                                status: newStatus,
                                progress,
                                error: newStatus === "failed" ? error : undefined, // Only set error if failed
                                canRetry: newStatus === "failed",
                              };
                            }
                            return f;
                          })
                        );
                      } catch (error) {
                        console.error(`Error checking status:`, error);
                        clearInterval(interval);
                        statusCheckIntervals.current.delete(fileId);
                      }
                    }, 2000);
                    statusCheckIntervals.current.set(fileId, interval);
                  }
                  
                  continue; // Skip to next file
                }
              }
            } catch (listError) {
              console.warn("Failed to check existing documents:", listError);
            }
          }
          
          throw new Error(
            `No track_id received from server. Response: ${JSON.stringify(response)}`
          );
        }
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        const errorMessage = error.response?.data?.detail || error.message || "Upload failed";
        
        // Schedule automatic retry after 2-3 minutes
        const retryDelay = 120000 + Math.random() * 60000; // 2-3 minutes
        
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: "failed",
                  error: `${errorMessage}\n\n🔄 Automatic retry scheduled in ${Math.round(retryDelay / 1000 / 60)} minutes...`,
                  canRetry: true,
                  retryCount: 0,
                }
              : f
          )
        );

        // Schedule automatic retry - ensure file is stored
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, fileData: file } // Ensure fileData is stored
              : f
          )
        );

        const autoRetryTimer = setTimeout(() => {
          setFiles((prev) => {
            const fileToRetry = prev.find((f) => f.id === fileId);
            if (fileToRetry && fileToRetry.fileData) {
              retryUpload(fileId, fileToRetry.fileData, 0);
            }
            return prev;
          });
        }, retryDelay);

        autoRetryTimers.current.set(fileId, autoRetryTimer);
      }
    }

    setIsUploading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    const interval = statusCheckIntervals.current.get(id);
    if (interval) {
      clearInterval(interval);
      statusCheckIntervals.current.delete(id);
    }
    const autoRetryTimer = autoRetryTimers.current.get(id);
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      autoRetryTimers.current.delete(id);
    }
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      // Update localStorage
      try {
        const filesToSave = updated.map(({ fileData, ...rest }) => rest);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
      } catch (error) {
        console.error("Failed to update localStorage:", error);
      }
      return updated;
    });
  };

  // Function to refresh documents from API - fetches ALL documents from server
  const refreshDocuments = async () => {
    try {
      // Fetch all documents from API (increase limit to get more documents)
      const apiResponse = await documentApi.list({ limit: 1000 });
      console.log("Refresh API Response:", apiResponse); // Debug log
      
      // Handle the actual API response structure: { statuses: { processed: [...], failed: [...] } }
      let documents: any[] = [];
      
      if (apiResponse?.statuses) {
        // Extract documents from statuses object
        const processed = apiResponse.statuses.processed || [];
        const failed = apiResponse.statuses.failed || [];
        const processing = apiResponse.statuses.processing || [];
        const pending = apiResponse.statuses.pending || [];
        
        // Combine all documents from different status categories
        documents = [...processed, ...failed, ...processing, ...pending];
        console.log(`Refreshing: Found ${documents.length} documents from API (processed: ${processed.length}, failed: ${failed.length}, processing: ${processing.length}, pending: ${pending.length})`);
      } else if (apiResponse?.documents) {
        // Fallback to direct documents array
        documents = apiResponse.documents;
        console.log(`Refreshing: Found ${documents.length} documents from API (direct documents array)`);
      } else if (Array.isArray(apiResponse)) {
        // Fallback to array response
        documents = apiResponse;
        console.log(`Refreshing: Found ${documents.length} documents from API (array response)`);
      }
      
      if (documents.length > 0) {
        // Convert API documents to our format
        const apiFiles: UploadedFile[] = documents.map((doc: any, index: number) => {
          // Get filename from file_path field
          const filename = doc.file_path || doc.filename || doc.name || `Document ${index + 1}`;
          
          // Map status - API uses "processed", "failed", "processing", "pending"
          let docStatus: "pending" | "processing" | "completed" | "failed" = "pending";
          if (doc.status === "processed") {
            docStatus = "completed";
          } else if (doc.status === "processing") {
            docStatus = "processing";
          } else if (doc.status === "failed") {
            docStatus = "failed";
          } else if (doc.status === "pending") {
            docStatus = "pending";
          }
          
          return {
            id: doc.id || doc.doc_id || doc.track_id || `doc_${index}_${Date.now()}`,
            filename: filename,
            trackId: doc.track_id || doc.id || doc.doc_id || "",
            status: docStatus,
            progress: docStatus === "completed" ? 100 : 
                     docStatus === "processing" ? undefined : undefined,
            uploadedAt: doc.created_at ? new Date(doc.created_at) : 
                       doc.updated_at ? new Date(doc.updated_at) : 
                       new Date(),
            retryCount: 0,
            canRetry: docStatus === "failed",
            error: docStatus === "failed" ? (doc.error_msg || doc.error || undefined) : undefined,
          };
        });

        console.log("Refreshed API files:", apiFiles);

        // Replace files list with API documents (show only what's on server)
        setFiles(apiFiles);
        
        // Update localStorage with API data
        try {
          const filesToSave = apiFiles.map(({ fileData, ...rest }) => rest);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filesToSave));
        } catch (error) {
          console.error("Failed to update localStorage:", error);
        }
      } else {
        // If no documents in response, clear the list
        console.log("No documents in API response. Response structure:", apiResponse);
        setFiles([]);
      }
    } catch (error) {
      console.error("Failed to refresh documents:", error);
    }
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "processing":
        return "Processing";
      default:
        return "Pending";
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-gray-300">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Document Management
        </h1>
        <p className="text-gray-700 font-medium">
          Upload documents to make them available for the RAG assistant
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-gray-300">
        <div
          className={`border-3 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
            isDragging
              ? "border-blue-600 bg-blue-50"
              : "border-gray-400 bg-gray-50 hover:border-gray-500 hover:bg-gray-100"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Upload className="w-10 h-10 text-blue-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-sm text-gray-600 font-medium mb-4">
                Supported formats: PDF, DOC, DOCX, TXT, MD
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Select Files
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* All Documents List */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            All Documents ({files.length})
          </h2>
          <Button
            onClick={refreshDocuments}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh List</span>
          </Button>
        </div>
        
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              No documents found
            </p>
            <p className="text-sm text-gray-600">
              Upload documents using the upload area above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-4 border-2 rounded-lg hover:border-gray-400 transition-all ${
                  file.status === "failed"
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-gray-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {getStatusIcon(file.status)}
                      <span
                        className={`text-sm font-medium ${
                          file.status === "completed"
                            ? "text-green-600"
                            : file.status === "failed"
                            ? "text-red-600"
                            : file.status === "processing"
                            ? "text-blue-600"
                            : "text-gray-600"
                        }`}
                      >
                        {getStatusText(file.status)}
                      </span>
                      {file.status === "processing" && (
                        <span className="text-xs text-blue-600 font-medium">
                          {file.progress !== undefined ? `${file.progress}%` : "Processing..."}
                        </span>
                      )}
                      {file.retryCount !== undefined && file.retryCount > 0 && (
                        <span className="text-xs text-gray-500 font-medium">
                          (Retry {file.retryCount}/3)
                        </span>
                      )}
                    </div>
                    {file.error && file.status === "failed" && (
                      <p className="text-xs text-red-600 font-medium mt-1 whitespace-pre-wrap">
                        {file.error}
                      </p>
                    )}
                    {file.status === "processing" && file.progress === undefined && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        Processing in progress...
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-xs text-gray-600 font-medium">
                        Uploaded: {file.uploadedAt.toLocaleString()}
                      </p>
                      {file.trackId && (
                        <p className="text-xs text-gray-500 font-mono">
                          ID: {file.trackId.substring(0, 20)}...
                        </p>
                      )}
                    </div>
                    {file.canRetry && (
                      <div className="mt-2">
                        {file.fileData ? (
                          <Button
                            onClick={() => retryUpload(file.id, file.fileData!, file.retryCount || 0)}
                            disabled={file.status === "pending" || file.status === "processing"}
                            className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {file.status === "pending" || file.status === "processing" ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Retrying...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                <span>Retry Upload</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <p className="text-xs text-gray-600 font-medium">
                            File data not available. Please re-upload the file.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="flex-shrink-0 p-2 hover:bg-red-100 rounded-lg transition-colors ml-4"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

