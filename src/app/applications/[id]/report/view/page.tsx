import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ReportStatusBadge } from "~/components/seif/report-status-badge";
import { formatTorontoDateTime } from "~/lib/date";
import { getApplicationTitle, getApplicationDate } from "~/lib/application";

export const metadata = {
  title: "View SEIF Report",
  description: "View your submitted SEIF report",
};

export default async function ViewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await createTRPCContext({ headers: await headers() });
  const caller = createCaller(ctx);
  const application = await caller.application
    .getMyApplicationById({ id })
    .catch((err: unknown) => {
      if (err instanceof TRPCError && err.code === "NOT_FOUND") return null;
      throw err;
    });
  if (!application || application.status !== "APPROVED" || !application.report) notFound();

  const report = application.report;
  const formData = application.formData as Record<string, unknown>;
  const receipts = report.receiptsFilePaths as string[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/applications/${application.id}`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
      >
        ← Back to application
      </Link>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">SEIF report</h1>
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
            <dd className="mt-0.5 text-gray-900">{application.organization.name}</dd>
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
            <dt className="text-xs font-medium uppercase text-gray-500">Amount awarded</dt>
            <dd className="mt-0.5 text-gray-900">${Number(report.amountAllocated).toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Amount spent (reported)</dt>
            <dd className="mt-0.5 text-gray-900">${Number(report.amountSpent).toFixed(2)}</dd>
          </div>
        </dl>

        {report.underSpendExplanation && (
          <div className="mt-6">
            <dt className="text-xs font-medium uppercase text-gray-500">Explanation (under spend)</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">{report.underSpendExplanation}</dd>
          </div>
        )}

        <div className="mt-6">
          <dt className="text-xs font-medium uppercase text-gray-500">Description & activities</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">{report.descriptionActivities}</dd>
        </div>

        <div className="mt-6">
          <dt className="text-xs font-medium uppercase text-gray-500">Final budget</dt>
          <dd className="mt-0.5">
            <a href={report.finalBudgetFilePath} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
              View final budget file
            </a>
          </dd>
        </div>

        <div className="mt-6">
          <dt className="text-xs font-medium uppercase text-gray-500">Receipts</dt>
          <dd className="mt-0.5">
            <ul className="list-inside list-disc space-y-0.5">
              {receipts.map((url, i) => (
                <li key={i}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                    Receipt {i + 1}
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </div>
    </div>
  );
}
