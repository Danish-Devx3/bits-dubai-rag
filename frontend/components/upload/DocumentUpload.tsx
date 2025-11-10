"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { Button } from "../ui/Button";
import { documentApi } from "@/lib/api";
import { Card } from "../ui/Card";

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

interface UploadStatus {
  type: "success" | "error" | "processing";
  message: string;
  trackId?: string;
  progress?: number;
}

export function DocumentUpload({
  onUploadComplete,
}: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const checkProcessingStatus = async (trackId: string) => {
    try {
      // Use track_status endpoint instead of doc status endpoint
      const statusData = await documentApi.getTrackStatus(trackId);
      
      // Handle the response structure from track_status endpoint
      // Response format: { track_id, documents: [{ status, ... }], status_summary, total_count }
      if (statusData.documents && statusData.documents.length > 0) {
        // Get the first document status (or check all if multiple)
        const docStatuses = statusData.documents.map((doc: any) => doc.status);
        const hasCompleted = docStatuses.some((s: string) => s === "processed" || s === "completed");
        const hasFailed = docStatuses.some((s: string) => s === "failed");
        const isProcessing = docStatuses.some((s: string) => s === "processing" || s === "pending");
        
        if (hasCompleted) {
          localStorage.removeItem(`status_check_${trackId}`);
          setUploadStatus({
            type: "success",
            message: `Document "${selectedFile?.name}" has been processed and is now searchable!`,
            trackId,
            progress: 100,
          });
          setProcessingProgress(100);
          setUploading(false);
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
          onUploadComplete?.();
        } else if (hasFailed) {
          localStorage.removeItem(`status_check_${trackId}`);
          const failedDoc = statusData.documents.find((doc: any) => doc.status === "failed");
          const errorMsg = failedDoc?.error_msg || failedDoc?.error || "Unknown error";
          
          // Provide user-friendly error messages
          let userFriendlyMessage = errorMsg;
          if (errorMsg.includes("UTF-8") || errorMsg.includes("encoding") || errorMsg.includes("surrogates")) {
            userFriendlyMessage = `The PDF file contains encoding issues that prevent processing. This often happens with PDFs that have special characters or emojis.\n\nPlease try:\n1. Re-saving the PDF without special characters\n2. Converting the PDF to a different format\n3. Using a different PDF file\n\nTechnical error: ${errorMsg}`;
          }
          
          setUploadStatus({
            type: "error",
            message: `Processing failed: ${userFriendlyMessage}`,
            trackId,
          });
          setUploading(false);
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
        } else if (isProcessing) {
          localStorage.removeItem(`status_check_${trackId}`); // Reset counter when we get valid status
          // Calculate progress from status_summary if available
          const progress = statusData.status_summary?.processed 
            ? Math.round((statusData.status_summary.processed / statusData.total_count) * 100)
            : 50; // Default to 50% if processing
          
          setUploadStatus({
            type: "processing",
            message: `Processing document... ${progress}%`,
            trackId,
            progress,
          });
          setProcessingProgress(progress);
        }
      } else {
        // No documents found yet, still processing
        setUploadStatus({
          type: "processing",
          message: `Processing document...`,
          trackId,
          progress: 25,
        });
        setProcessingProgress(25);
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
      // If 404, document might not be found yet - keep checking (but limit retries)
      if (error.response?.status === 404) {
        // Keep checking for up to 2 minutes (40 checks at 3 second intervals)
        const checkCount = parseInt(localStorage.getItem(`status_check_${trackId}`) || '0');
        if (checkCount < 40) {
          localStorage.setItem(`status_check_${trackId}`, String(checkCount + 1));
          setUploadStatus({
            type: "processing",
            message: `Processing document... (checking status)`,
            trackId,
            progress: Math.min(50 + checkCount * 2, 90),
          });
          setProcessingProgress(Math.min(50 + checkCount * 2, 90));
        } else {
          // Too many 404s - might be an issue
          localStorage.removeItem(`status_check_${trackId}`);
          setUploadStatus({
            type: "error",
            message: `Document uploaded but status could not be retrieved. The document may still be processing. Track ID: ${trackId}`,
            trackId,
          });
          setUploading(false);
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }
        }
      } else {
        // Other errors - show error but don't stop checking immediately
        const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          "Unknown error";
        setUploadStatus({
          type: "error",
          message: `Error checking status: ${errorMessage}`,
          trackId,
        });
        setUploading(false);
        if (statusCheckInterval.current) {
          clearInterval(statusCheckInterval.current);
        }
        localStorage.removeItem(`status_check_${trackId}`);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus(null);
      setProcessingProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "Please select a file to upload",
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setProcessingProgress(0);

    try {
      const response = await documentApi.upload(selectedFile);
      
      // Handle different response formats
      const trackId = response.track_id || response.trackId || response.data?.track_id;
      
      if (trackId) {
        // Show initial success message
        setUploadStatus({
          type: "processing",
          message: `File "${selectedFile.name}" uploaded successfully! Processing in background...`,
          trackId: trackId,
          progress: 0,
        });

        // Wait a moment before starting status checks (give server time to process)
        setTimeout(() => {
          // Start checking processing status
          statusCheckInterval.current = setInterval(() => {
            checkProcessingStatus(trackId);
          }, 3000); // Check every 3 seconds
        }, 2000); // Wait 2 seconds before first check

        // Clear file selection
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        // Fallback if no track_id - check if upload was successful anyway
        if (response.status === "success" || response.message?.includes("success")) {
          setUploadStatus({
            type: "success",
            message: `File "${selectedFile.name}" uploaded successfully!`,
          });
        } else {
          setUploadStatus({
            type: "error",
            message: `Upload response: ${response.message || JSON.stringify(response)}`,
          });
        }
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setUploading(false);
        onUploadComplete?.();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           error.message || 
                           "Upload failed. Please try again.";
      setUploadStatus({
        type: "error",
        message: errorMessage,
      });
      setUploading(false);
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            Upload Document
          </h3>
          <p className="text-sm text-gray-600">
            Upload course materials, syllabi, or other university documents to make them searchable.
          </p>
        </div>

        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              selectedFile
                ? "border-primary bg-primary/5"
                : "border-gray-300 hover:border-primary hover:bg-gray-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.md"
              className="hidden"
              id="file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer flex flex-col items-center ${
                uploading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {selectedFile ? (
                <>
                  <File className="w-12 h-12 text-primary mb-3" />
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                  {!uploading && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="font-medium text-gray-700 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    PDF, DOC, DOCX, TXT, or MD (Max 50MB)
                  </p>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Upload Status - Clean Display */}
        {uploadStatus && (
          <div className="space-y-3">
            <div
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                uploadStatus.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : uploadStatus.type === "error"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {uploadStatus.type === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : uploadStatus.type === "error" ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5 animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium whitespace-pre-line">{uploadStatus.message}</p>
                {uploadStatus.trackId && uploadStatus.type === "processing" && (
                  <p className="text-xs mt-1 opacity-75">
                    Track ID: {uploadStatus.trackId}
                  </p>
                )}
                {uploadStatus.type === "error" && uploadStatus.trackId && (
                  <p className="text-xs mt-1 opacity-75">
                    Track ID: {uploadStatus.trackId}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Bar for Processing */}
            {uploadStatus.type === "processing" && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 text-center">
                  {processingProgress}% complete
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {uploadStatus?.type === "processing" ? "Processing..." : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Upload Document
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
