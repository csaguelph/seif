"use client";

import { useRef, useState } from "react";
import { CheckCircle, Trash2, Upload, XCircle } from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT = ".xlsx,.xls";
const ALLOWED_EXT = [".xlsx", ".xls"];

function getReadableFileSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const suffixes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.floor(bytes / Math.pow(1024, i)) + " " + suffixes[i];
}

type UploadStatus = "idle" | "uploading" | "complete" | "failed";

interface BudgetFileUploadProps {
  /** Current file path after successful upload (e.g. /uploads/xxx.pdf) */
  value: string;
  /** Callback when upload completes with server path */
  onChange: (path: string) => void;
  /** Upload endpoint */
  uploadUrl?: string;
  disabled?: boolean;
  /** Hint text under the drop zone */
  hint?: string;
}

export function BudgetFileUpload({
  value,
  onChange,
  uploadUrl = "/api/upload",
  disabled = false,
  hint = "Excel only (.xlsx, .xls) (max. 10 MB)",
}: BudgetFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = (file: File) => {
    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    if (file.size > MAX_SIZE) {
      setError("File too large (max 10 MB)");
      setStatus("failed");
      return;
    }
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError("Excel files only (.xlsx, .xls)");
      setStatus("failed");
      return;
    }

    setStatus("uploading");
    setProgress(0);

    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.set("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { path: string };
          onChange(data.path);
          setProgress(100);
          setStatus("complete");
        } catch {
          setError("Invalid response");
          setStatus("failed");
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          setError(data.error ?? "Upload failed");
        } catch {
          setError("Upload failed");
        }
        setStatus("failed");
      }
    });

    xhr.addEventListener("error", () => {
      setError("Upload failed");
      setStatus("failed");
    });

    xhr.open("POST", uploadUrl);
    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange("");
    setStatus("idle");
    setProgress(0);
    setFileName(null);
    setFileSize(0);
    setError(null);
  };

  const handleRetry = () => {
    if (fileName) {
      setError(null);
      setStatus("uploading");
      setProgress(0);
      // Re-upload would need the File again; we don't keep it. So "retry" means just reset and let them pick again.
      setStatus("idle");
      setFileName(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone - show when no file or when we have a file (list below) */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-50"
            : "cursor-pointer border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label="Upload budget file"
        />
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Click to upload or drag and drop
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{hint}</p>
      </div>

      {/* File list - single item with progress/complete/failed */}
      {status !== "idle" && fileName && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <Upload className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {fileName}
              </p>
              <p className="text-xs text-gray-500">
                {getReadableFileSize(fileSize)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                {status === "uploading" && (
                  <>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">Uploading… {progress}%</span>
                  </>
                )}
                {status === "complete" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </span>
                )}
                {status === "failed" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                    <XCircle className="h-4 w-4" />
                    {error ?? "Failed"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {status === "failed" && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Try again
                </button>
              )}
              {(status === "complete" || status === "failed") && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Show simple "uploaded" line when we have value from draft but no local state */}
      {value && status === "idle" && !fileName && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          <span className="truncate">Uploaded: {value}</span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="shrink-0 text-indigo-600 hover:text-indigo-800"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
