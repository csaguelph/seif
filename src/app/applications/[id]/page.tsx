import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ApplicationStatusBadge } from "~/components/seif/application-status-badge";
import { ReportStatusBadge } from "~/components/seif/report-status-badge";
import { formatTorontoDateTime } from "~/lib/date";

export const metadata = {
  title: "Application Details",
  description: "View your SEIF application details",
};

export default async function ApplicationDetailPage({
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
      if (err instanceof TRPCError && err.code === "NOT_FOUND") {
        return null;
      }
      throw err;
    });
  if (!application) notFound();

  const form = application.formData as Record<string, unknown>;
  const readString = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          ← Back to dashboard
        </Link>
        {application.status === "REJECTED" && (
          <Link
            href={`/applications/${application.id}/edit`}
            className="inline-flex rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Edit & resubmit
          </Link>
        )}
        {application.status === "APPROVED" && !application.report && (
          <Link
            href={`/applications/${application.id}/report`}
            className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Submit SEIF report
          </Link>
        )}
        {application.status === "APPROVED" && application.report && (
          <>
            <ReportStatusBadge status={application.report.status} />
            <Link
              href={`/applications/${application.id}/report/view`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
            >
              View report →
            </Link>
          </>
        )}
      </div>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Application — {application.organization.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>
              Submitted {formatTorontoDateTime(application.submittedAt)} · $
              {Number(application.amountRequested).toFixed(2)} requested
            </span>
            <ApplicationStatusBadge status={application.status} />
          </p>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Applicant name
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.fullName)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Email
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.email)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Phone
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.phone)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Event or initiative
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.typeFunding)}
            </dd>
          </div>
          {form.eventTitle != null && form.eventTitle !== "" && (
            <>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Event title
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.eventTitle)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Event date
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.eventDate)}
                </dd>
              </div>
            </>
          )}
          {form.initiativeTitle != null && form.initiativeTitle !== "" && (
            <>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Initiative title
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.initiativeTitle)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Initiative date
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.initiativeDate)}
                </dd>
              </div>
            </>
          )}
        </dl>
        {application.budgetFilePath && (
          <div className="mt-6">
            <dt className="text-xs font-medium uppercase text-gray-500">
              Budget file
            </dt>
            <a
              href={application.budgetFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-indigo-600 hover:text-indigo-900"
            >
              View budget file
            </a>
          </div>
        )}
        {(application.reviewedAt ??
          application.reviewerComments ??
          application.approvalConditions ??
          application.denialReason ??
          application.amountApproved) && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
              Review outcome
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {application.reviewedAt && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Reviewed at
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {formatTorontoDateTime(application.reviewedAt)}
                  </dd>
                </div>
              )}
              {application.amountApproved != null && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Amount awarded
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    ${Number(application.amountApproved).toFixed(2)}
                  </dd>
                </div>
              )}
              {application.reviewerComments && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Comments
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.reviewerComments}
                  </dd>
                </div>
              )}
              {application.approvalConditions && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Conditions
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.approvalConditions}
                  </dd>
                </div>
              )}
              {application.denialReason && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Denial reason
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.denialReason}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
