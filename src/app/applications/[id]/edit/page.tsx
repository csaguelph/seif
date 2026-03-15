import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { ApplicationForm } from "~/components/seif/application-form";

export const metadata = {
  title: "Edit & Resubmit Application",
  description: "Edit your denied SEIF application and resubmit for review",
};

export default async function EditApplicationPage({
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
  if (application.status !== "REJECTED") {
    notFound();
  }

  const formData = application.formData as Record<string, unknown>;
  const editApplication = {
    id: application.id,
    formData: {
      ...formData,
      organizationId: application.organizationId,
      amountRequested: String(Number(application.amountRequested)),
    },
    budgetFilePath: application.budgetFilePath,
    organizationId: application.organizationId,
    amountRequested: Number(application.amountRequested),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/applications/${application.id}`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
      >
        ← Back to application
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-gray-900">
        Edit & resubmit application
      </h1>
      <p className="mt-1 text-gray-600">
        Your application was denied. Make the necessary changes below and resubmit for another review.
      </p>

      {(application.denialReason ?? application.reviewerComments) && (
        <section
          className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4"
          aria-labelledby="denial-reasons-heading"
        >
          <h2 id="denial-reasons-heading" className="text-sm font-semibold uppercase tracking-wide text-amber-900">
            Reasons for denial
          </h2>
          <dl className="mt-3 space-y-2">
            {application.denialReason && (
              <div>
                <dt className="text-xs font-medium text-amber-800">Denial reason</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-amber-900">
                  {application.denialReason}
                </dd>
              </div>
            )}
            {application.reviewerComments && (
              <div>
                <dt className="text-xs font-medium text-amber-800">Reviewer comments</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm text-amber-900">
                  {application.reviewerComments}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <ApplicationForm editApplication={editApplication} />
    </div>
  );
}
