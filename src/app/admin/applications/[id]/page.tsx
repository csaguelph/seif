import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "~/server/better-auth/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ApplicationDecisionPanel } from "~/components/seif/application-decision-panel";
import { formatTorontoDateTime } from "~/lib/date";
import { formatStoredPhoneNumber } from "~/lib/phone";

export const metadata = {
  title: "Application Details",
  description: "SEIF application details",
};

export default async function ApplicationDetailPage({
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
  const application = await caller.application
    .getById({ id })
    .catch(() => null);
  if (!application) notFound();

  const form = application.formData as Record<string, unknown>;
  const readString = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : "—";
  const readPhone = (value: unknown) => formatStoredPhoneNumber(value) ?? "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          ← Back to applications
        </Link>
        {application.report && (
          <Link
            href={`/admin/reports/${application.report.id}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
          >
            View report →
          </Link>
        )}
      </div>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Application — {application.organization.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submitted {formatTorontoDateTime(application.submittedAt)} · $
            {Number(application.amountRequested).toFixed(2)} requested
            {application.amountApproved != null && (
              <> · ${Number(application.amountApproved).toFixed(2)} awarded</>
            )}
            {" · "}
            {application.status}
          </p>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Applicant name
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.fullName)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Email
            </dt>
            <dd className="mt-0.5 text-gray-900">{readString(form.email)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Phone
            </dt>
            <dd className="mt-0.5 text-gray-900">{readPhone(form.phone)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Event or initiative
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {readString(form.typeFunding)}
            </dd>
          </div>
          {form.eventTitle != null && form.eventTitle !== "" && (
            <>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">
                  Event title
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.eventTitle)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">
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
                <dt className="text-xs font-medium text-gray-500 uppercase">
                  Initiative title
                </dt>
                <dd className="mt-0.5 text-gray-900">
                  {readString(form.initiativeTitle)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">
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
            <dt className="text-xs font-medium text-gray-500 uppercase">
              Budget file
            </dt>
            <a
              href={application.budgetFilePath}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-indigo-600 hover:text-indigo-900"
            >
              {application.budgetFilePath}
            </a>
          </div>
        )}
        {(application.reviewedAt ??
          application.reviewerComments ??
          application.approvalConditions ??
          application.denialReason ??
          application.amountApproved) && (
          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="text-sm font-semibold tracking-wide text-gray-800 uppercase">
              Review outcome
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {application.reviewedAt && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">
                    Reviewed at
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {formatTorontoDateTime(application.reviewedAt)}
                  </dd>
                </div>
              )}
              {application.reviewedBy && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">
                    Reviewed by
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {application.reviewedBy.name} (
                    {application.reviewedBy.email})
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
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">
                    Acceptance comments
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.reviewerComments}
                  </dd>
                </div>
              )}
              {application.approvalConditions && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">
                    Acceptance conditions
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.approvalConditions}
                  </dd>
                </div>
              )}
              {application.denialReason && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">
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
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Full form data (JSON)
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-4 text-xs text-gray-800">
            {JSON.stringify(form, null, 2)}
          </pre>
        </details>
      </div>
      <ApplicationDecisionPanel
        applicationId={application.id}
        status={application.status}
        initialComments={application.reviewerComments}
        initialConditions={application.approvalConditions}
        initialDenialReason={application.denialReason}
        amountRequested={Number(application.amountRequested)}
        initialAmountApproved={application.amountApproved != null ? Number(application.amountApproved) : undefined}
      />
    </div>
  );
}
