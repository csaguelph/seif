"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const REPORT_STATUSES = [
  "SUBMITTED",
  "COMPLETE",
  "PENDING_FUNDS_RETURN",
  "FUNDS_RETURNED",
] as const;

type ReportStatus = (typeof REPORT_STATUSES)[number];

export function ReportStatusPanel({
  reportId,
  currentStatus,
  initialNotes,
}: {
  reportId: string;
  currentStatus: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isRefreshing, startTransition] = useTransition();
  const [status, setStatus] = useState<ReportStatus>(
    currentStatus as ReportStatus
  );
  const [reviewerNotes, setReviewerNotes] = useState(initialNotes ?? "");

  const updateStatus = api.report.updateStatus.useMutation({
    onSuccess: () => {
      void utils.report.list.invalidate();
      void utils.report.getById.invalidate({ id: reportId });
      startTransition(() => router.refresh());
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStatus.mutate({
      id: reportId,
      status,
      reviewerNotes: reviewerNotes.trim() ? reviewerNotes.trim() : "",
    });
  };

  const isPending = updateStatus.isPending || isRefreshing;

  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-900">Update report status</h2>
      <p className="mt-1 text-sm text-gray-600">
        Set status to track review and whether funds have been returned.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="report-status"
            className="block text-sm font-medium text-gray-700"
          >
            Status
          </label>
          <select
            id="report-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            disabled={isPending}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          >
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "SUBMITTED" && "Submitted"}
                {s === "COMPLETE" && "Complete (no funds to return)"}
                {s === "PENDING_FUNDS_RETURN" && "Pending funds return"}
                {s === "FUNDS_RETURNED" && "Funds returned"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="report-notes"
            className="block text-sm font-medium text-gray-700"
          >
            Internal notes
          </label>
          <textarea
            id="report-notes"
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            disabled={isPending}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
            placeholder="Notes for internal tracking (e.g. amount to return, contact)"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Update status"}
        </button>
      </form>
      {updateStatus.error && (
        <p className="mt-2 text-sm text-red-600">{updateStatus.error.message}</p>
      )}
    </section>
  );
}
