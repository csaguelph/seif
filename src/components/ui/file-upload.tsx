"use client";

import { useRef, useState } from "react";
import { CheckCircle, Trash2, Upload, XCircle } from "lucide-react";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
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
  uploadUrl = "/api/upload?type=application-budget",
  disabled = false,
  hint = "Excel only (.xlsx, .xls) (max 5 MB)",
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
      setError("File too large (max 5 MB)");
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

// --- Report uploads (final budget: Excel only; receipts: multiple types) ---
const REPORT_BUDGET_ACCEPT = ".xlsx,.xls";
const REPORT_BUDGET_EXT = [".xlsx", ".xls"];
const REPORT_BUDGET_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const RECEIPT_MAX_SIZE = 5 * 1024 * 1024; // 5MB per receipt
const RECEIPT_ACCEPT = ".xlsx,.xls,.pdf,.png,.jpg,.jpeg";
const RECEIPT_EXT = [".xlsx", ".xls", ".pdf", ".png", ".jpg", ".jpeg"];
const MAX_RECEIPTS = 10;

interface ReportFileUploadProps {
  value: string;
  onChange: (path: string) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

/** Single file upload for SEIF report final budget — Excel only (same as application form). */
export function ReportBudgetUpload({
  value,
  onChange,
  disabled = false,
  label = "Final budget",
  hint = "Use the specified format from the SEIF website. Excel only (.xlsx, .xls) (max 5 MB).",
}: ReportFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = (file: File) => {
    setError(null);
    setFileName(file.name);
    if (file.size > REPORT_BUDGET_MAX_SIZE) {
      setError("File too large (max 5 MB)");
      setStatus("failed");
      return;
    }
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!REPORT_BUDGET_EXT.includes(ext)) {
      setError("Excel files only (.xlsx, .xls)");
      setStatus("failed");
      return;
    }
    setStatus("uploading");
    setProgress(0);
    const formData = new FormData();
    formData.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
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
    xhr.open("POST", "/api/upload?type=report-budget");
    xhr.send(formData);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-gray-700">{label}</p>
      )}
      <div
        onDrop={(e) => {
          e.preventDefault();
          if (!disabled && e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${
          disabled ? "cursor-not-allowed bg-gray-50" : "cursor-pointer bg-white hover:bg-gray-50/50"
        } border-gray-300`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={REPORT_BUDGET_ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
            e.target.value = "";
          }}
          disabled={disabled}
          className="sr-only"
        />
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-1 text-gray-600">{hint}</p>
      </div>
      {status !== "idle" && fileName && (
        <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <span className="truncate">{fileName}</span>
          <div className="flex items-center gap-2">
            {status === "uploading" && <span className="text-xs text-gray-500">{progress}%</span>}
            {status === "complete" && <CheckCircle className="h-4 w-4 text-green-600" />}
            {status === "failed" && <span className="text-xs text-red-600">{error}</span>}
            {(status === "complete" || status === "failed") && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setStatus("idle");
                  setFileName(null);
                  setError(null);
                }}
                disabled={disabled}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
      {value && status === "idle" && !fileName && (
        <div className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <span className="truncate">Uploaded: {value}</span>
          <button type="button" onClick={() => onChange("")} disabled={disabled} className="text-indigo-600 hover:text-indigo-800">Remove</button>
        </div>
      )}
    </div>
  );
}

interface ReportReceiptsUploadProps {
  value: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
}

/** Multiple file upload for SEIF report receipts (max 10, 5 MB each). */
export function ReportReceiptsUpload({
  value,
  onChange,
  disabled = false,
}: ReportReceiptsUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.size > RECEIPT_MAX_SIZE) {
        setError("File too large (max 5 MB per receipt)");
        resolve(null);
        return;
      }
      const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
      if (!RECEIPT_EXT.includes(ext)) {
        setError("Allowed: Excel, PDF, or images");
        resolve(null);
        return;
      }
      const formData = new FormData();
      formData.set("file", file);
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as { path: string };
            resolve(data.path);
          } catch {
            resolve(null);
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText) as { error?: string };
            setError(data.error ?? "Upload failed");
          } catch {
            setError("Upload failed");
          }
          resolve(null);
        }
      });
      xhr.addEventListener("error", () => {
        setError("Upload failed");
        resolve(null);
      });
      xhr.open("POST", "/api/upload?type=report-receipt");
      xhr.send(formData);
    });
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const remaining = MAX_RECEIPTS - value.length;
    if (remaining <= 0) {
      setError(`Maximum ${MAX_RECEIPTS} receipts. Contact the clubs coordinator if you need to submit more.`);
      return;
    }
    const toAdd = files.slice(0, remaining);
    setUploading(true);
    setError(null);
    const paths: string[] = [];
    for (const file of toAdd) {
      const path = await uploadFile(file);
      if (path) paths.push(path);
    }
    if (paths.length > 0) onChange([...value, ...paths]);
    if (files.length > remaining && paths.length > 0) {
      setError(`Only ${remaining} receipt(s) could be added (max ${MAX_RECEIPTS}). Contact the clubs coordinator if you need more.`);
    }
    setUploading(false);
  };

  const removeOne = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const atLimit = value.length >= MAX_RECEIPTS;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Upload all receipts</p>
      <p className="text-xs text-gray-500">
        Up to {MAX_RECEIPTS} receipts, 5 MB each. For issues or to submit more than {MAX_RECEIPTS}, contact the clubs coordinator (csaclubs@uoguelph.ca).
      </p>
      <div
        onDrop={async (e) => {
          e.preventDefault();
          if (disabled || uploading || atLimit) return;
          const files = Array.from(e.dataTransfer.files ?? []).slice(0, MAX_RECEIPTS - value.length);
          if (files.length === 0) return;
          setUploading(true);
          setError(null);
          const paths: string[] = [];
          for (const file of files) {
            const path = await uploadFile(file);
            if (path) paths.push(path);
          }
          if (paths.length > 0) onChange([...value, ...paths]);
          setUploading(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !disabled && !uploading && !atLimit && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-sm ${
          disabled || uploading || atLimit ? "cursor-not-allowed bg-gray-50" : "cursor-pointer bg-white hover:bg-gray-50/50"
        } border-gray-300`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={RECEIPT_ACCEPT}
          multiple
          onChange={handleSelect}
          disabled={disabled || uploading || atLimit}
          className="sr-only"
        />
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-1 text-gray-600">
          {uploading ? "Uploading…" : atLimit ? `${MAX_RECEIPTS} receipts uploaded` : `Click or drag to add receipts (${value.length}/${MAX_RECEIPTS})`}
        </p>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {value.length > 0 && (
        <ul className="space-y-1 rounded border border-gray-200 bg-gray-50 p-2">
          {value.map((path, i) => (
            <li key={path + i} className="flex items-center justify-between text-sm">
              <span className="truncate">{path}</span>
              <button
                type="button"
                onClick={() => removeOne(i)}
                disabled={disabled}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
