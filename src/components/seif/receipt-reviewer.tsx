"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Check,
} from "lucide-react";
import { api } from "~/trpc/react";
import type { ReceiptLineItem, ReceiptReview } from "~/types/receipt-review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileType(url: string): "image" | "pdf" | "other" {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  } catch {
    return "other";
  }
}

function newItem(): ReceiptLineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    amount: 0,
    eligible: true,
  };
}

function buildInitialReviews(
  urls: string[],
  saved: ReceiptReview[],
): Record<string, ReceiptReview> {
  return Object.fromEntries(
    urls.map((url) => {
      const existing = saved.find((r) => r.url === url);
      return [url, existing ?? { url, ocrStatus: "pending" as const, items: [] }];
    }),
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReceiptReviewer({
  reportId,
  receiptsFilePaths,
  initialReviews,
}: {
  reportId: string;
  receiptsFilePaths: string[];
  initialReviews: ReceiptReview[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, ReceiptReview>>(() =>
    buildInitialReviews(receiptsFilePaths, initialReviews),
  );
  // Track which receipt URLs have been saved (start with whatever came from DB)
  const [savedUrls, setSavedUrls] = useState<Set<string>>(
    () => new Set(initialReviews.map((r) => r.url)),
  );

  const currentUrl = receiptsFilePaths[currentIndex]!;
  const currentReview = reviews[currentUrl]!;
  const fileType = getFileType(currentUrl);

  // Mark the current receipt as dirty whenever the review changes
  const updateCurrentReview = useCallback(
    (updater: (prev: ReceiptReview) => ReceiptReview) => {
      setReviews((prev) => ({ ...prev, [currentUrl]: updater(prev[currentUrl]!) }));
      setSavedUrls((prev) => {
        const next = new Set(prev);
        next.delete(currentUrl);
        return next;
      });
    },
    [currentUrl],
  );

  // tRPC mutations
  const saveReview = api.report.saveReceiptReview.useMutation({
    onSuccess: () => setSavedUrls((prev) => new Set([...prev, currentUrl])),
  });

  const triggerOcr = api.report.triggerReceiptOcr.useMutation({
    onSuccess: () =>
      // Update local state to show "processing" — real AI will populate items later
      setReviews((prev) => ({
        ...prev,
        [currentUrl]: { ...prev[currentUrl]!, ocrStatus: "processing" },
      })),
  });

  // Item handlers
  const addItem = () =>
    updateCurrentReview((prev) => ({ ...prev, items: [...prev.items, newItem()] }));

  const updateItem = (id: string, patch: Partial<ReceiptLineItem>) =>
    updateCurrentReview((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const deleteItem = (id: string) =>
    updateCurrentReview((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));

  const handleSave = () => {
    const review = reviews[currentUrl]!;
    saveReview.mutate({
      reportId,
      receiptUrl: currentUrl,
      items: review.items,
      detectedSubtotal: review.detectedSubtotal,
      detectedTax: review.detectedTax,
      detectedTotal: review.detectedTotal,
    });
  };

  const handleTriggerOcr = () =>
    triggerOcr.mutate({ reportId, receiptUrl: currentUrl });

  // Totals
  const eligibleTotal = currentReview.items
    .filter((item) => item.eligible)
    .reduce((sum, item) => sum + item.amount, 0);

  const isDirty = !savedUrls.has(currentUrl);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Receipt Review</h2>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {receiptsFilePaths.length}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* ------------------------------------------------------------------ */}
        {/* Left: Receipt Viewer                                                */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <div className="sticky top-4">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {fileType === "image" && (
                <MagnifiableImage
                  src={currentUrl}
                  alt={`Receipt ${currentIndex + 1}`}
                />
              )}
              {fileType === "pdf" && (
                <iframe
                  src={currentUrl}
                  title={`Receipt ${currentIndex + 1}`}
                  className="h-[620px] w-full"
                />
              )}
              {fileType === "other" && (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-gray-500">
                  <span className="text-sm">Cannot preview this file type.</span>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    Open receipt in new tab →
                  </a>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {/* Dot indicators */}
              <div className="flex gap-2">
                {receiptsFilePaths.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    title={`Receipt ${i + 1}${savedUrls.has(url) ? " (saved)" : ""}`}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      i === currentIndex
                        ? "bg-indigo-600"
                        : savedUrls.has(url)
                          ? "bg-green-400"
                          : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setCurrentIndex((i) => Math.min(receiptsFilePaths.length - 1, i + 1))
                }
                disabled={currentIndex === receiptsFilePaths.length - 1}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Right: Item Editor                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* OCR controls */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">AI Analysis</span>
              <OcrStatusBadge status={currentReview.ocrStatus} />
            </div>
            <button
              onClick={handleTriggerOcr}
              disabled={
                triggerOcr.isPending || currentReview.ocrStatus === "processing"
              }
              className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {currentReview.ocrStatus === "processing" ? "Processing…" : "Analyze with AI"}
            </button>
          </div>

          {/* Line items */}
          <div className="mt-3 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Line Items
              </span>
              <span className="text-xs text-gray-400">
                {currentReview.items.length} item
                {currentReview.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {currentReview.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                {currentReview.ocrStatus === "pending" &&
                  "Run AI analysis or add items manually."}
                {currentReview.ocrStatus === "processing" &&
                  "Analyzing receipt — check back shortly."}
                {currentReview.ocrStatus === "complete" &&
                  "No items detected. Add items manually."}
                {currentReview.ocrStatus === "error" &&
                  "Analysis failed. Add items manually."}
              </p>
            ) : (
              <div className="space-y-3">
                {currentReview.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onChange={(patch) => updateItem(item.id, patch)}
                    onDelete={() => deleteItem(item.id)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-900"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
          </div>

          {/* Summary */}
          {currentReview.items.length > 0 && (
            <div className="mt-4 space-y-1 rounded-md bg-gray-50 px-3 py-2 text-sm">
              {currentReview.detectedTotal != null && (
                <div className="flex justify-between text-gray-500">
                  <span>Detected total</span>
                  <span>${currentReview.detectedTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-gray-900">
                <span>Eligible total</span>
                <span className="text-green-700">${eligibleTotal.toFixed(2)}</span>
              </div>
              {currentReview.items.some((item) => !item.eligible) && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>
                    {currentReview.items.filter((i) => !i.eligible).length} item
                    {currentReview.items.filter((i) => !i.eligible).length !== 1
                      ? "s"
                      : ""}{" "}
                    marked ineligible
                  </span>
                  <span>
                    −$
                    {currentReview.items
                      .filter((i) => !i.eligible)
                      .reduce((s, i) => s + i.amount, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Save */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <span className="text-xs">
              {isDirty ? (
                <span className="text-amber-600">Unsaved changes</span>
              ) : savedUrls.has(currentUrl) ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />
                  Saved
                </span>
              ) : null}
            </span>
            <button
              onClick={handleSave}
              disabled={saveReview.isPending || !isDirty}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveReview.isPending ? "Saving…" : "Save review"}
            </button>
          </div>

          {saveReview.error && (
            <p className="mt-2 text-sm text-red-600">{saveReview.error.message}</p>
          )}
          {triggerOcr.error && (
            <p className="mt-2 text-sm text-red-600">{triggerOcr.error.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Magnifier
// ---------------------------------------------------------------------------

const ZOOM = 2.5;
const LENS = 200; // lens diameter in px

function MagnifiableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);

  /**
   * Compute the actual rendered image rect inside the container.
   * `object-contain` scales the image to fit while preserving aspect ratio,
   * centring it with letterbox/pillarbox space around it.
   */
  const getRenderedImageRect = () => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img?.naturalWidth) return null;

    const cW = container.offsetWidth;
    const cH = container.offsetHeight;
    const scale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
    const renderedW = img.naturalWidth * scale;
    const renderedH = img.naturalHeight * scale;

    return {
      left: (cW - renderedW) / 2,
      top: (cH - renderedH) / 2,
      width: renderedW,
      height: renderedH,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    const imageRect = getRenderedImageRect();
    if (!imageRect) return;

    // Only show the lens when the cursor is actually over the image, not the padding
    if (
      x < imageRect.left ||
      x > imageRect.left + imageRect.width ||
      y < imageRect.top ||
      y > imageRect.top + imageRect.height
    ) {
      setLens(null);
      return;
    }

    setLens({ x, y });
  };

  const getLensStyle = () => {
    if (!lens) return null;
    const imageRect = getRenderedImageRect();
    if (!imageRect) return null;

    // Position of cursor within the rendered image
    const relX = lens.x - imageRect.left;
    const relY = lens.y - imageRect.top;

    return {
      backgroundSize: `${imageRect.width * ZOOM}px ${imageRect.height * ZOOM}px`,
      // Shift so that the point under the cursor is centred in the lens
      backgroundPosition: `${-(relX * ZOOM - LENS / 2)}px ${-(relY * ZOOM - LENS / 2)}px`,
    };
  };

  const lensStyle = getLensStyle();

  return (
    <div
      ref={containerRef}
      className="relative h-[620px] w-full cursor-crosshair overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} alt={alt} className="h-full w-full object-contain" />

      {lens && lensStyle && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-indigo-400 shadow-lg ring-1 ring-black/10"
          style={{
            width: LENS,
            height: LENS,
            left: lens.x - LENS / 2,
            top: lens.y - LENS / 2,
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            ...lensStyle,
          }}
        />
      )}
    </div>
  );
}

function OcrStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    processing: "bg-blue-100 text-blue-700",
    complete: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "Not analyzed",
    processing: "Processing…",
    complete: "Complete",
    error: "Error",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}
    >
      {labels[status] ?? "Unknown"}
    </span>
  );
}

function ItemRow({
  item,
  onChange,
  onDelete,
}: {
  item: ReceiptLineItem;
  onChange: (patch: Partial<ReceiptLineItem>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-2">
      {/* Eligible toggle */}
      <button
        type="button"
        onClick={() => onChange({ eligible: !item.eligible })}
        title={
          item.eligible
            ? "Eligible — click to mark ineligible"
            : "Ineligible — click to mark eligible"
        }
        className={`mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          item.eligible
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 bg-white"
        }`}
      >
        {item.eligible && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      {/* Fields */}
      <div className="min-w-0 flex-1">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Item description"
          className={`w-full border-0 border-b border-transparent bg-transparent px-0 py-0 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-0 ${
            !item.eligible ? "line-through opacity-50" : ""
          }`}
        />
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-xs text-gray-400">$</span>
          <input
            type="number"
            value={item.amount === 0 ? "" : item.amount}
            onChange={(e) =>
              onChange({ amount: Math.max(0, parseFloat(e.target.value) || 0) })
            }
            step="0.01"
            min="0"
            placeholder="0.00"
            className={`w-20 border-0 border-b border-transparent bg-transparent px-0 py-0 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-0 ${
              !item.eligible ? "opacity-50" : ""
            }`}
          />
          {item.tax != null && item.tax > 0 && (
            <>
              <span className="text-xs text-gray-400">+ $</span>
              <input
                type="number"
                value={item.tax === 0 ? "" : item.tax}
                onChange={(e) =>
                  onChange({ tax: Math.max(0, parseFloat(e.target.value) || 0) })
                }
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-16 border-0 border-b border-transparent bg-transparent px-0 py-0 text-xs text-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-0"
              />
              <span className="text-xs text-gray-400">tax</span>
            </>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="mt-1 flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
