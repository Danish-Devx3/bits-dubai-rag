"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from "lucide-react";
import { documentApi } from "@/lib/api";
import { Button } from "../ui/Button";

interface UploadedFile {
  id: string;
  filename: string;
  status: "pending" | "processing" | "completed" | "failed";
  uploadedAt: Date;
  error?: string;
}

// Storage key for persisting files
const STORAGE_KEY = "rag_uploaded_files";

export function DocumentUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files from localStorage
  useEffect(() => {
    try {
      const savedFiles = localStorage.getItem(STORAGE_KEY);
      if (savedFiles) {
        const parsed = JSON.parse(savedFiles);
        setFiles(parsed.map((f: any) => ({
          ...f,
          uploadedAt: new Date(f.uploadedAt),
        })));
      }
    } catch (error) {
      console.error("Failed to load files:", error);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }, [files]);

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
        status: "processing",
        uploadedAt: new Date(),
      };

      setFiles((prev) => [newFile, ...prev]);

      try {
        const response = await documentApi.upload(file);

        // Backend returns { success: true, ... } immediately upon success
        if (response && response.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "completed" }
                : f
            )
          );
        } else {
          throw new Error(response?.message || "Upload failed");
        }

      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                ...f,
                status: "failed",
                error: error.response?.data?.message || error.message || "Upload failed",
              }
              : f
          )
        );
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const clearHistory = () => {
    setFiles([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-gray-300 bg-gray-50/50"
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-white rounded-full shadow-sm">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              Click or drag files to upload
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Supports PDF, TXT, MD (Max 10MB)
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.txt,.md"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Select Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Uploaded Files</h3>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white border border-gray-100 rounded-lg p-3 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${file.status === "completed" ? "bg-green-50" :
                      file.status === "failed" ? "bg-red-50" : "bg-blue-50"
                    }`}>
                    <FileText className={`w-4 h-4 ${file.status === "completed" ? "text-green-600" :
                        file.status === "failed" ? "text-red-600" : "text-blue-600"
                      }`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {file.uploadedAt.toLocaleDateString()}
                      </span>
                      {file.error && (
                        <span className="text-xs text-red-500 truncate max-w-[200px]" title={file.error}>
                          • {file.error}
                        </span>
                      )}
                    </div>

                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {file.status === "completed" && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {file.status === "failed" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {(file.status === "processing" || file.status === "pending") && (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
