import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import Link from "next/link";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";
import { SeifReportForm } from "~/components/seif/seif-report-form";

export const metadata = {
  title: "Submit SEIF Report",
  description: "Submit your SEIF funding report for an approved application",
};

export default async function ReportApplicationPage({
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
  if (application.status !== "APPROVED") {
    notFound();
  }
  if (application.report) {
    redirect(`/applications/${application.id}/report/view`);
  }

  const amountAllocated =
    application.amountApproved != null
      ? Number(application.amountApproved)
      : Number(application.amountRequested);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/applications/${application.id}`}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
      >
        ← Back to application
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-gray-900">
        SEIF report
      </h1>
      <p className="mt-1 text-gray-600">
        Submit your report for the approved application. Complete this within two weeks of your event or initiative.
      </p>
      <SeifReportForm
        applicationId={application.id}
        amountAllocatedPreFill={amountAllocated}
        applicationSummary={{
          organizationName: application.organization.name,
          formData: application.formData,
        }}
      />
    </div>
  );
}
