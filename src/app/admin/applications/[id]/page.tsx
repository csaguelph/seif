import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "~/server/better-auth/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ApplicationDecisionPanel } from "~/components/seif/application-decision-panel";
import { formatTorontoDateTime } from "~/lib/date";

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
  const application = await caller.application.getById({ id }).catch(() => null);
  if (!application) notFound();

  const form = application.formData as Record<string, unknown>;
  const readString = (value: unknown) =>
    typeof value === "string" && value.length > 0 ? value : "—";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
      >
        ← Back to applications
      </Link>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Application — {application.organization.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Submitted {formatTorontoDateTime(application.submittedAt)} · $
            {Number(application.amountRequested).toFixed(2)} requested ·{" "}
            {application.status}
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
              {application.budgetFilePath}
            </a>
          </div>
        )}
        {(application.reviewedAt ??
          application.reviewerComments ??
          application.approvalConditions ??
          application.denialReason) && (
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
              {application.reviewedBy && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Reviewed by
                  </dt>
                  <dd className="mt-0.5 text-gray-900">
                    {application.reviewedBy.name} ({application.reviewedBy.email})
                  </dd>
                </div>
              )}
              {application.reviewerComments && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Acceptance comments
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.reviewerComments}
                  </dd>
                </div>
              )}
              {application.approvalConditions && (
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-500">
                    Acceptance conditions
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-gray-900">
                    {application.approvalConditions}
                  </dd>
                </div>
              )}
              {application.denialReason && (
                <div>
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
      />
    </div>
  );
}
