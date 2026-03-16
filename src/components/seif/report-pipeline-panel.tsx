"use client";

import { useMemo, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, ArrowRight, RotateCcw } from "lucide-react";
import { api } from "~/trpc/react";
import { formatTorontoDateTime } from "~/lib/date";
import { calcAllReceiptsEligibleTotal, migrateReview } from "~/lib/receipt-eligible";
import type { ReceiptReview } from "~/types/receipt-review";

export function ReportPipelinePanel({
  reportId,
  initialStatus,
  amountAllocated,
  totalReceiptFiles,
  initialReviews,
  initialReviewedAt,
  initialReviewedByName,
}: {
  reportId: string;
  initialStatus: string;
  amountAllocated: number;
  totalReceiptFiles: number;
  initialReviews: ReceiptReview[];
  initialReviewedAt: Date | null;
  initialReviewedByName: string | null;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Re-fetches whenever the ReceiptReviewer invalidates this query after a save
  const { data: latestReport } = api.report.getById.useQuery(
    { id: reportId },
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );

  const status = latestReport?.status ?? initialStatus;
  const reviewedAt = latestReport?.reviewedAt ?? initialReviewedAt;
  const reviewedByName = latestReport?.reviewedBy?.name ?? initialReviewedByName;

  const currentReviews: ReceiptReview[] = useMemo(() => {
    const raw = latestReport?.receiptReviews;
    if (Array.isArray(raw)) return (raw as unknown[]).map(migrateReview);
    return initialReviews;
  }, [latestReport?.receiptReviews, initialReviews]);

  const reviewedFileCount = currentReviews.filter((r) => r.reviewedAt != null).length;
  const totalEligible = calcAllReceiptsEligibleTotal(currentReviews as unknown[]);
  const amountToReturn = Math.max(0, amountAllocated - totalEligible);
  const noFundsToReturn = amountToReturn < 0.005;

  const refresh = () => {
    void utils.report.getById.invalidate({ id: reportId });
    startTransition(() => router.refresh());
  };

  const finalizeReview = api.report.finalizeReview.useMutation({ onSuccess: refresh });
  const undoFinalize = api.report.undoFinalizeReview.useMutation({ onSuccess: refresh });
  const confirmReturned = api.report.confirmFundsReturned.useMutation({
    onSuccess: () => { setConfirmOpen(false); refresh(); },
  });
  const undoReturned = api.report.undoFundsReturned.useMutation({ onSuccess: refresh });

  // -------------------------------------------------------------------------
  // Completed states
  // -------------------------------------------------------------------------

  if (status === "COMPLETE") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-5">
        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
        <div className="flex-1">
          <p className="font-semibold text-green-800">Report complete</p>
          <p className="mt-0.5 text-sm text-green-700">
            All eligible expenses accounted for — no funds to return.
          </p>
          {reviewedAt && reviewedByName && (
            <p className="mt-1 text-xs text-green-600">
              Finalised {formatTorontoDateTime(reviewedAt)} by {reviewedByName}
            </p>
          )}
          {undoFinalize.error && (
            <p className="mt-2 text-sm text-red-600">{undoFinalize.error.message}</p>
          )}
        </div>
        <button
          onClick={() => undoFinalize.mutate({ id: reportId })}
          disabled={undoFinalize.isPending}
          className="flex items-center gap-1.5 rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {undoFinalize.isPending ? "Undoing…" : "Undo"}
        </button>
      </div>
    );
  }

  if (status === "FUNDS_RETURNED") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-500" />
        <div className="flex-1">
          <p className="font-semibold text-gray-800">Funds returned</p>
          <p className="mt-0.5 text-sm text-gray-600">
            ${amountAllocated.toFixed(2)} allocated · ${totalEligible.toFixed(2)} eligible
          </p>
          {reviewedAt && reviewedByName && (
            <p className="mt-1 text-xs text-gray-500">
              Confirmed {formatTorontoDateTime(reviewedAt)} by {reviewedByName}
            </p>
          )}
          {undoReturned.error && (
            <p className="mt-2 text-sm text-red-600">{undoReturned.error.message}</p>
          )}
        </div>
        <button
          onClick={() => undoReturned.mutate({ id: reportId })}
          disabled={undoReturned.isPending}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {undoReturned.isPending ? "Undoing…" : "Undo"}
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Finance panel — funds need to be returned
  // -------------------------------------------------------------------------

  if (status === "PENDING_FUNDS_RETURN") {
    return (
      <>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <h2 className="font-semibold text-amber-900">Funds return required</h2>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-amber-200 bg-white">
          <dl className="divide-y divide-amber-100 text-sm">
            <div className="flex justify-between px-4 py-3">
              <dt className="text-gray-600">Amount allocated</dt>
              <dd className="font-medium text-gray-900">${amountAllocated.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="text-gray-600">Eligible expenses</dt>
              <dd className="font-medium text-gray-900">${totalEligible.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between bg-amber-50 px-4 py-3 font-semibold">
              <dt className="text-amber-900">Amount to return</dt>
              <dd className="text-amber-700">${amountToReturn.toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          {(confirmReturned.error ?? undoFinalize.error) && (
            <p className="text-sm text-red-600">
              {(confirmReturned.error ?? undoFinalize.error)!.message}
            </p>
          )}
          <button
            onClick={() => undoFinalize.mutate({ id: reportId })}
            disabled={undoFinalize.isPending}
            className="flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {undoFinalize.isPending ? "Undoing…" : "Undo"}
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Confirm funds returned
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Confirm funds returned</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure ${amountToReturn.toFixed(2)} has been returned? This will close the
              report. You can undo this afterwards if needed.
            </p>
            {confirmReturned.error && (
              <p className="mt-2 text-sm text-red-600">{confirmReturned.error.message}</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={confirmReturned.isPending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmReturned.mutate({ id: reportId })}
                disabled={confirmReturned.isPending}
                className="flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {confirmReturned.isPending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Finalize panel — still SUBMITTED
  // -------------------------------------------------------------------------

  const unreviewedCount = Math.max(0, totalReceiptFiles - reviewedFileCount);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-900">Finalize review</h2>
      <p className="mt-1 text-sm text-gray-500">
        Review and save all receipts above, then finalize to close this report.
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100">
        <dl className="divide-y divide-gray-100 text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-600">Amount allocated</dt>
            <dd className="font-medium text-gray-900">${amountAllocated.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-gray-600">
              Eligible expenses
              <span className="ml-2 text-xs text-gray-400">
                {reviewedFileCount} of {totalReceiptFiles} file
                {totalReceiptFiles !== 1 ? "s" : ""} saved
              </span>
            </dt>
            <dd className="font-medium text-gray-900">${totalEligible.toFixed(2)}</dd>
          </div>
          <div
            className={`flex justify-between px-4 py-3 font-semibold ${
              noFundsToReturn ? "bg-green-50" : "bg-amber-50"
            }`}
          >
            <dt className={noFundsToReturn ? "text-green-800" : "text-amber-800"}>
              {noFundsToReturn ? "No funds to return" : "Funds to return"}
            </dt>
            <dd className={noFundsToReturn ? "text-green-700" : "text-amber-700"}>
              {noFundsToReturn ? "—" : `$${amountToReturn.toFixed(2)}`}
            </dd>
          </div>
        </dl>
      </div>

      {unreviewedCount > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {unreviewedCount} receipt file{unreviewedCount > 1 ? "s" : ""} not yet saved — eligible
          total may be incomplete.
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        {finalizeReview.error && (
          <p className="text-sm text-red-600">{finalizeReview.error.message}</p>
        )}
        <button
          onClick={() => finalizeReview.mutate({ id: reportId })}
          disabled={finalizeReview.isPending}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
            noFundsToReturn
              ? "bg-green-600 hover:bg-green-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {finalizeReview.isPending
            ? "Finalizing…"
            : noFundsToReturn
              ? "Mark as complete"
              : "Finalize review"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
