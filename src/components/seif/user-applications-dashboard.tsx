import Link from "next/link";

import {
  formatCurrency,
  formatDate,
  getApplicationDateLabel,
  getApplicationKind,
  getApplicationTitle,
  getStatusBadgeClassName,
  getStatusMeta,
  type ApplicationFormData,
  type ApplicationStatus,
} from "~/lib/seif-application";

type UserApplicationSummary = {
  id: string;
  status: ApplicationStatus;
  amountRequested: number | string | { toString(): string };
  submittedAt: Date | string;
  updatedAt: Date | string;
  organization: {
    name: string;
  };
  formData: ApplicationFormData;
};

type UserApplicationsDashboardProps = {
  applications: UserApplicationSummary[];
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

export function UserApplicationsDashboard({
  applications,
}: UserApplicationsDashboardProps) {
  const pendingCount = applications.filter(
    (application) =>
      application.status === "SUBMITTED" || application.status === "UNDER_REVIEW",
  ).length;
  const needsAttentionCount = applications.filter(
    (application) => application.status === "REJECTED",
  ).length;

  if (applications.length === 0) {
    return (
      <section className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          No submissions yet
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Start your first SEIF application
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Once you submit an application, this dashboard will show its current status, submission
          details, and future follow-up actions in one place.
        </p>
        <Link
          href="/apply"
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to application form
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Applications"
          value={String(applications.length)}
          accent="text-slate-950"
        />
        <StatCard
          label="Pending review"
          value={String(pendingCount)}
          accent="text-amber-700"
        />
        <StatCard
          label="Needs attention"
          value={String(needsAttentionCount)}
          accent={needsAttentionCount > 0 ? "text-rose-700" : "text-emerald-700"}
        />
      </section>

      <section className="grid gap-5">
        {applications.map((application) => {
          const title = getApplicationTitle(application.formData);
          const kind = getApplicationKind(application.formData);
          const projectDate = getApplicationDateLabel(application.formData);
          const statusMeta = getStatusMeta(application.status);

          return (
            <article
              key={application.id}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm [content-visibility:auto]"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={getStatusBadgeClassName(application.status)}>
                      {statusMeta.label}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {application.organization.name}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {statusMeta.description}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 lg:min-w-72">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Amount requested
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {formatCurrency(application.amountRequested)}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-6 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <dt className="font-medium text-slate-500">Submitted</dt>
                  <dd className="mt-1 text-slate-900">
                    {formatDate(application.submittedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Last updated</dt>
                  <dd className="mt-1 text-slate-900">
                    {formatDate(application.updatedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Project date</dt>
                  <dd className="mt-1 text-slate-900">{projectDate ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Application type</dt>
                  <dd className="mt-1 text-slate-900">{kind ?? "Not provided"}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Future actions like resubmissions, reports, and document uploads will appear on
                  the detail page when those tools launch.
                </p>
                <Link
                  href={`/dashboard/applications/${application.id}`}
                  className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                >
                  View details
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
