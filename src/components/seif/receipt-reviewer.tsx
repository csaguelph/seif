"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Check,
  X,
  Lock,
} from "lucide-react";
import { api } from "~/trpc/react";
import type { ParsedReceipt, ReceiptLineItem, ReceiptReview, OcrStatus } from "~/types/receipt-review";
import { calcReceiptEligible, migrateReview as migrateReviewFromLib } from "~/lib/receipt-eligible";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileType(url: string): "image" | "pdf" | "other" {
  try {
    const ext = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  } catch {
    return "other";
  }
}

function newItem(): ReceiptLineItem {
  return { id: crypto.randomUUID(), description: "", amount: 0, eligible: true };
}

function newReceipt(): ParsedReceipt {
  return { items: [] };
}

const migrateReview = migrateReviewFromLib;

function buildInitialReviews(
  urls: string[],
  saved: ReceiptReview[],
): Record<string, ReceiptReview> {
  return Object.fromEntries(
    urls.map((url) => {
      const existing = saved.find((r) => r.url === url);
      if (existing) return [url, migrateReview(existing)];
      return [url, { url, ocrStatus: "pending" as const, receipts: [] }];
    }),
  );
}

const calcEligible = calcReceiptEligible;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReceiptReviewer({
  reportId,
  receiptsFilePaths,
  initialReviews,
  initialStatus,
}: {
  reportId: string;
  receiptsFilePaths: string[];
  initialReviews: ReceiptReview[];
  initialStatus: string;
}) {
  if (receiptsFilePaths.length === 0) {
    return <p className="text-sm text-gray-500">No receipts were submitted with this report.</p>;
  }
  return (
    <ReceiptReviewerInner
      reportId={reportId}
      receiptsFilePaths={receiptsFilePaths}
      initialReviews={initialReviews}
      initialStatus={initialStatus}
    />
  );
}

function ReceiptReviewerInner({
  reportId,
  receiptsFilePaths,
  initialReviews,
  initialStatus,
}: {
  reportId: string;
  receiptsFilePaths: string[];
  initialReviews: ReceiptReview[];
  initialStatus: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeReceiptIdx, setActiveReceiptIdx] = useState(0);
  const [reviews, setReviews] = useState<Record<string, ReceiptReview>>(() =>
    buildInitialReviews(receiptsFilePaths, initialReviews),
  );
  const [savedUrls, setSavedUrls] = useState<Set<string>>(
    () => new Set(initialReviews.map((r) => r.url)),
  );

  // Subscribe to live status so the panel locks as soon as the pipeline panel finalizes
  const { data: latestReport } = api.report.getById.useQuery(
    { id: reportId },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );
  const locked = (latestReport?.status ?? initialStatus) !== "SUBMITTED";

  const currentUrl = receiptsFilePaths[currentIndex]!;
  const currentReview = reviews[currentUrl]!;
  const fileType = getFileType(currentUrl);
  // Clamp so the active tab index is always valid
  const safeReceiptIdx = Math.min(
    activeReceiptIdx,
    Math.max(0, currentReview.receipts.length - 1),
  );
  const activeReceipt = currentReview.receipts[safeReceiptIdx] ?? null;

  const navigateTo = (idx: number) => {
    setCurrentIndex(idx);
    setActiveReceiptIdx(0);
  };

  const markDirty = useCallback(
    (url: string) =>
      setSavedUrls((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      }),
    [],
  );

  const updateCurrentReview = useCallback(
    (updater: (prev: ReceiptReview) => ReceiptReview) => {
      setReviews((prev) => ({ ...prev, [currentUrl]: updater(prev[currentUrl]!) }));
      markDirty(currentUrl);
    },
    [currentUrl, markDirty],
  );

  const updateReceipt = useCallback(
    (idx: number, updater: (r: ParsedReceipt) => ParsedReceipt) =>
      updateCurrentReview((prev) => ({
        ...prev,
        receipts: prev.receipts.map((r, i) => (i === idx ? updater(r) : r)),
      })),
    [updateCurrentReview],
  );

  const addReceipt = () => {
    updateCurrentReview((prev) => {
      const newReceipts = [...prev.receipts, newReceipt()];
      setActiveReceiptIdx(newReceipts.length - 1);
      return { ...prev, receipts: newReceipts };
    });
  };

  const deleteReceipt = (idx: number) => {
    updateCurrentReview((prev) => ({
      ...prev,
      receipts: prev.receipts.filter((_, i) => i !== idx),
    }));
    setActiveReceiptIdx(Math.max(0, idx - 1));
  };

  // Mutations
  const utils = api.useUtils();
  const saveReview = api.report.saveReceiptReview.useMutation({
    onSuccess: () => {
      setSavedUrls((prev) => new Set([...prev, currentUrl]));
      // Invalidate so the pipeline panel recalculates eligible totals
      void utils.report.getById.invalidate({ id: reportId });
    },
  });

  const triggerOcr = api.report.triggerReceiptOcr.useMutation({
    onSuccess: (data) => {
      setReviews((prev) => ({ ...prev, [data.url]: data }));
      setSavedUrls((prev) => new Set([...prev, data.url]));
      setActiveReceiptIdx(0);
    },
  });

  const handleSave = () =>
    saveReview.mutate({
      reportId,
      receiptUrl: currentUrl,
      receipts: currentReview.receipts,
    });

  const isDirty = !savedUrls.has(currentUrl);

  const grandEligible = currentReview.receipts.reduce(
    (sum, r) => sum + calcEligible(r).total,
    0,
  );

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Receipt Review</h2>
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {receiptsFilePaths.length}
        </span>
      </div>

      {locked && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Lock className="h-3.5 w-3.5 flex-shrink-0" />
          Receipt review is locked — the report has been finalised and can no longer be edited.
        </div>
      )}

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
                onClick={() => navigateTo(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex gap-2">
                {receiptsFilePaths.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => navigateTo(i)}
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
                  navigateTo(Math.min(receiptsFilePaths.length - 1, currentIndex + 1))
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
        <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* OCR controls */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">AI Analysis</span>
              <OcrStatusBadge status={currentReview.ocrStatus} />
            </div>
            {!locked && (
              <button
                onClick={() => triggerOcr.mutate({ reportId, receiptUrl: currentUrl })}
                disabled={triggerOcr.isPending}
                className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {triggerOcr.isPending ? "Analyzing…" : "Analyze with AI"}
              </button>
            )}
          </div>

          {/* Receipt tabs (always visible — lets admins add more) */}
          {currentReview.receipts.length > 0 && (
            <div className="flex items-center gap-1 border-b border-gray-100 px-4 py-2">
              {currentReview.receipts.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActiveReceiptIdx(i)}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors ${
                    i === safeReceiptIdx
                      ? "bg-indigo-50 font-medium text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  {r.storeName ?? `Receipt ${i + 1}`}
                </button>
              ))}
              {!locked && (
                <button
                  onClick={addReceipt}
                  title="Add another receipt"
                  className="ml-1 rounded p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Receipt content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {activeReceipt ? (
              <ReceiptPane
                receipt={activeReceipt}
                receiptIdx={safeReceiptIdx}
                showDelete={currentReview.receipts.length > 1}
                ocrStatus={currentReview.ocrStatus}
                locked={locked}
                onUpdate={updateReceipt}
                onDelete={deleteReceipt}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <p className="text-sm text-gray-400">
                  {currentReview.ocrStatus === "error" ? (
                    <span className="text-red-600">
                      Analysis failed: {currentReview.ocrError ?? "unknown error"}
                    </span>
                  ) : (
                    "Run AI analysis or add a receipt manually."
                  )}
                </p>
                {!locked && (
                  <button
                    onClick={addReceipt}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add receipt manually
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Grand total across receipts in this file */}
          {currentReview.receipts.length > 1 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <div className="flex justify-between text-sm font-semibold text-gray-900">
                <span>Grand eligible total</span>
                <span className="text-green-700">${grandEligible.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Save */}
          {!locked && (
            <>
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
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
                <p className="px-4 pb-3 text-sm text-red-600">{saveReview.error.message}</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ReceiptPane — content for a single parsed receipt tab
// ---------------------------------------------------------------------------

function ReceiptPane({
  receipt,
  receiptIdx,
  showDelete,
  ocrStatus,
  locked,
  onUpdate,
  onDelete,
}: {
  receipt: ParsedReceipt;
  receiptIdx: number;
  showDelete: boolean;
  ocrStatus: OcrStatus;
  locked: boolean;
  onUpdate: (idx: number, updater: (r: ParsedReceipt) => ParsedReceipt) => void;
  onDelete: (idx: number) => void;
}) {
  const update = (updater: (r: ParsedReceipt) => ParsedReceipt) => onUpdate(receiptIdx, updater);

  const addItem = () =>
    update((r) => ({ ...r, items: [...r.items, newItem()] }));

  const updateItem = (id: string, patch: Partial<ReceiptLineItem>) =>
    update((r) => ({
      ...r,
      items: r.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));

  const deleteItem = (id: string) =>
    update((r) => ({ ...r, items: r.items.filter((item) => item.id !== id) }));

  const eligible = calcEligible(receipt);
  const ineligibleCount = receipt.items.filter((i) => !i.eligible).length;
  const ineligibleAmount = receipt.items
    .filter((i) => !i.eligible)
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      {/* Store name */}
      <input
        type="text"
        value={receipt.storeName ?? ""}
        onChange={(e) =>
          update((r) => ({ ...r, storeName: e.target.value || undefined }))
        }
        placeholder="Store name"
        readOnly={locked}
        className={`mb-3 w-full border-0 border-b bg-transparent px-0 py-0.5 text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 ${locked ? "border-transparent" : "border-transparent focus:border-indigo-300"}`}
      />

      {/* Items header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Line Items
        </span>
        <span className="text-xs text-gray-400">
          {receipt.items.length} item{receipt.items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Items list */}
      {receipt.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          {ocrStatus === "pending" && "Run AI analysis or add items manually."}
          {ocrStatus === "processing" && "Analyzing receipt…"}
          {(ocrStatus === "complete" || ocrStatus === "error") &&
            "No items detected. Add items manually."}
        </p>
      ) : (
        <div className="space-y-3">
          {receipt.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              locked={locked}
              onChange={(patch) => updateItem(item.id, patch)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}

      {!locked && (
        <button
          onClick={addItem}
          className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      )}

      {/* Per-receipt totals */}
      {receipt.items.length > 0 && (
        <div className="mt-4 space-y-1 rounded-md bg-gray-50 px-3 py-2 text-sm">
          {receipt.total != null && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>Receipt total</span>
              <span>${receipt.total.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>Eligible subtotal</span>
            <span>${eligible.subtotal.toFixed(2)}</span>
          </div>
          {receipt.tax != null && (
            <div className="flex justify-between text-gray-500 text-xs">
              <span>
                Tax (prorated
                {ineligibleCount > 0
                  ? ` — ${ineligibleCount} item${ineligibleCount > 1 ? "s" : ""} excluded`
                  : ""}
                )
              </span>
              <span>+${eligible.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-1 font-medium text-gray-900">
            <span>Eligible total</span>
            <span className="text-green-700">${eligible.total.toFixed(2)}</span>
          </div>
          {ineligibleCount > 0 && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>{ineligibleCount} item{ineligibleCount > 1 ? "s" : ""} excluded</span>
              <span>−${ineligibleAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {showDelete && !locked && (
        <button
          onClick={() => onDelete(receiptIdx)}
          className="mt-3 flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
        >
          <X className="h-3 w-3" />
          Remove this receipt
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ItemRow
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  locked,
  onChange,
  onDelete,
}: {
  item: ReceiptLineItem;
  locked: boolean;
  onChange: (patch: Partial<ReceiptLineItem>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-start gap-2">
      <button
        type="button"
        onClick={() => !locked && onChange({ eligible: !item.eligible })}
        disabled={locked}
        title={locked ? undefined : item.eligible ? "Eligible — click to exclude" : "Excluded — click to include"}
        className={`mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          item.eligible
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 bg-white"
        } ${locked ? "cursor-default" : ""}`}
      >
        {item.eligible && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Item description"
          readOnly={locked}
          className={`w-full border-0 border-b border-transparent bg-transparent px-0 py-0 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 ${
            !item.eligible ? "line-through opacity-50" : ""
          } ${locked ? "" : "focus:border-indigo-300"}`}
        />
        <div className="mt-0.5 flex items-center gap-1">
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
            readOnly={locked}
            className={`w-20 border-0 border-b border-transparent bg-transparent px-0 py-0 text-xs text-gray-700 focus:outline-none focus:ring-0 ${
              !item.eligible ? "opacity-50" : ""
            } ${locked ? "" : "focus:border-indigo-300"}`}
          />
        </div>
      </div>

      {!locked && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-1 flex-shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OcrStatusBadge
// ---------------------------------------------------------------------------

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
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? "Unknown"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MagnifiableImage
// ---------------------------------------------------------------------------

const ZOOM = 2.5;
const LENS = 200;

function MagnifiableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);

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
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imageRect = getRenderedImageRect();
    if (!imageRect) return;
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
    const relX = lens.x - imageRect.left;
    const relY = lens.y - imageRect.top;
    return {
      backgroundSize: `${imageRect.width * ZOOM}px ${imageRect.height * ZOOM}px`,
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
