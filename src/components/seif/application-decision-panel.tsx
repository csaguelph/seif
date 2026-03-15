"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

const DENIAL_REASONS = [
  "No SE&RM submission",
  "Issue with budget",
  "Fundraising event",
] as const;
const isReviewableStatus = (status: ApplicationDecisionPanelProps["status"]) =>
  status === "SUBMITTED" || status === "UNDER_REVIEW";

type ApplicationDecisionPanelProps = {
  applicationId: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  initialComments: string | null;
  initialConditions: string | null;
  initialDenialReason: string | null;
};

export function ApplicationDecisionPanel({
  applicationId,
  status,
  initialComments,
  initialConditions,
  initialDenialReason,
}: ApplicationDecisionPanelProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isRefreshing, startTransition] = useTransition();
  const [comments, setComments] = useState(initialComments ?? "");
  const [conditions, setConditions] = useState(initialConditions ?? "");
  const [denialReason, setDenialReason] = useState(initialDenialReason ?? "");

  const refreshApplication = () => {
    void utils.application.list.invalidate();
    startTransition(() => {
      router.refresh();
    });
  };

  const approveMutation = api.application.approve.useMutation({
    onSuccess: refreshApplication,
  });
  const rejectMutation = api.application.reject.useMutation({
    onSuccess: refreshApplication,
  });

  const isReviewable = isReviewableStatus(status);
  const isReviewed = status === "APPROVED" || status === "REJECTED";
  const activeMutation = approveMutation.isPending || rejectMutation.isPending || isRefreshing;

  if (isReviewed) {
    return null;
  }

  const handleApprove = () => {
    rejectMutation.reset();
    approveMutation.mutate({
      id: applicationId,
      comments,
      conditions,
    });
  };

  const handleReject = () => {
    approveMutation.reset();
    rejectMutation.mutate({
      id: applicationId,
      reason: denialReason,
    });
  };

  return (
    <section className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Decision</h2>
        <p className="mt-1 text-sm text-gray-600">
          Current status: <span className="font-medium text-gray-900">{status}</span>
        </p>
        {!isReviewable && (
          <p className="mt-2 text-sm text-amber-700">
            Only submitted or under-review applications can be accepted or denied.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            Accept application
          </h3>
          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="approve-comments">
            Comments
          </label>
          <textarea
            id="approve-comments"
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            rows={4}
            disabled={!isReviewable}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Add comments for the applicant or record."
          />

          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="approve-conditions">
            Conditions
          </label>
          <textarea
            id="approve-conditions"
            value={conditions}
            onChange={(event) => setConditions(event.target.value)}
            rows={4}
            disabled={!isReviewable}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Optional conditions, such as limits on how funds may be used."
          />

            <button
              type="button"
              onClick={handleApprove}
            disabled={activeMutation || !isReviewable}
            className="mt-4 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approveMutation.isPending ? "Accepting..." : "Accept application"}
          </button>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-rose-900">
            Deny application
          </h3>
          <p className="mt-4 text-sm font-medium text-gray-700">Common reasons</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DENIAL_REASONS.map((reason) => {
              const isActive = denialReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setDenialReason(reason)}
                  disabled={activeMutation || !isReviewable}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-100"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {reason}
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="denial-reason">
            Denial reason
          </label>
          <textarea
            id="denial-reason"
            value={denialReason}
            onChange={(event) => setDenialReason(event.target.value)}
            rows={5}
            disabled={!isReviewable}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Select a common reason above or write a custom denial reason."
          />

            <button
              type="button"
              onClick={handleReject}
            disabled={activeMutation || !isReviewable || denialReason.trim().length === 0}
            className="mt-4 inline-flex rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rejectMutation.isPending ? "Denying..." : "Deny application"}
          </button>
        </div>
      </div>

      {(approveMutation.error ?? rejectMutation.error) && (
        <p className="mt-4 text-sm text-rose-700">
          {(approveMutation.error ?? rejectMutation.error)?.message}
        </p>
      )}
    </section>
  );
}
