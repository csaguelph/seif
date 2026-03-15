import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "~/server/better-auth/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ReportStatusBadge } from "~/components/seif/report-status-badge";
import { ReportStatusPanel } from "~/components/seif/report-status-panel";
import { ReceiptReviewer } from "~/components/seif/receipt-reviewer";
import { formatTorontoDateTime } from "~/lib/date";
import { getApplicationTitle, getApplicationDate } from "~/lib/application";
import type { ReceiptReview } from "~/types/receipt-review";

export const metadata = {
  title: "Report Details",
  description: "Review SEIF report",
};

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const report = await caller.report.getById({ id }).catch(() => null);
  if (!report) notFound();

  const app = report.application;
  const formData = app.formData as Record<string, unknown>;
  const receipts = report.receiptsFilePaths as string[];
  const receiptReviews = (report.receiptReviews as ReceiptReview[] | null) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/reports"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          ← Back to reports
        </Link>
        <Link
          href={`/admin/applications/${app.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          View application →
        </Link>
      </div>

      {/* Report details */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Report — {app.organization.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{getApplicationTitle(formData)}</span>
            <span>·</span>
            <span>Submitted {formatTorontoDateTime(report.submittedAt)}</span>
            <ReportStatusBadge status={report.status} />
          </p>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Organization</dt>
            <dd className="mt-0.5 text-gray-900">{app.organization.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Event / initiative title</dt>
            <dd className="mt-0.5 text-gray-900">{getApplicationTitle(formData)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Event / initiative date</dt>
            <dd className="mt-0.5 text-gray-900">{getApplicationDate(formData)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Applicant</dt>
            <dd className="mt-0.5 text-gray-900">
              {(formData.fullName as string) ?? app.submittedBy?.name ?? "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
            Funding
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Amount awarded</dt>
              <dd className="mt-0.5 text-gray-900">${Number(report.amountAllocated).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">Amount spent (reported)</dt>
              <dd className="mt-0.5 text-gray-900">${Number(report.amountSpent).toFixed(2)}</dd>
            </div>
            {report.underSpendExplanation && (
              <>
                <dt className="text-xs font-medium uppercase text-gray-500">Explanation (under spend)</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-gray-900 sm:col-span-2">{report.underSpendExplanation}</dd>
              </>
            )}
          </dl>
        </div>

        <dl className="mt-6">
          <dt className="text-xs font-medium uppercase text-gray-500">Description & activities</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">{report.descriptionActivities}</dd>
        </dl>

        <dl className="mt-6">
          <dt className="text-xs font-medium uppercase text-gray-500">Final budget</dt>
          <dd className="mt-0.5">
            <a
              href={report.finalBudgetFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-900"
            >
              View final budget file
            </a>
          </dd>
        </dl>

        {report.reviewerNotes && (
          <dl className="mt-6 rounded bg-gray-50 p-3">
            <dt className="text-xs font-medium uppercase text-gray-500">Internal notes</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-sm text-gray-900">{report.reviewerNotes}</dd>
          </dl>
        )}

        {report.reviewedAt && report.reviewedBy && (
          <p className="mt-4 text-xs text-gray-500">
            Last reviewed {formatTorontoDateTime(report.reviewedAt)} by {report.reviewedBy.name}
          </p>
        )}
      </div>

      {/* Receipt review interface */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <ReceiptReviewer
          reportId={report.id}
          receiptsFilePaths={receipts}
          initialReviews={receiptReviews}
        />
      </div>

      <ReportStatusPanel
        reportId={report.id}
        currentStatus={report.status}
        initialNotes={report.reviewerNotes}
      />
    </div>
  );
}
