import Link from "next/link";

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getApplicantSummary,
  getApplicationDateLabel,
  getApplicationKind,
  getApplicationLocation,
  getApplicationTitle,
  getFutureActions,
  getFundingEntries,
  getStatusBadgeClassName,
  getStatusMeta,
  readString,
  type ApplicationFormData,
  type ApplicationStatus,
} from "~/lib/seif-application";

type ApplicationDetailRecord = {
  id: string;
  status: ApplicationStatus;
  amountRequested: number | string | { toString(): string };
  organization: {
    name: string;
  };
  submittedAt: Date | string;
  updatedAt: Date | string;
  budgetFilePath: string | null;
  formData: ApplicationFormData;
};

type ApplicationDetailViewProps = {
  application: ApplicationDetailRecord;
  backHref: string;
  backLabel: string;
  showActionRoadmap?: boolean;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-6 text-slate-900">{value ?? "Not provided"}</dd>
    </div>
  );
}

function NarrativeBlock({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{value}</p>
    </section>
  );
}

export function ApplicationDetailView({
  application,
  backHref,
  backLabel,
  showActionRoadmap = false,
}: ApplicationDetailViewProps) {
  const formData = application.formData;
  const statusMeta = getStatusMeta(application.status);
  const applicant = getApplicantSummary(formData);
  const kind = getApplicationKind(formData);
  const title = getApplicationTitle(formData);
  const dateLabel = getApplicationDateLabel(formData);
  const location = getApplicationLocation(formData);
  const receivedFunding = getFundingEntries(
    formData,
    "fundingReceived",
    "fundingReceivedAmounts",
  );
  const expectedFunding = getFundingEntries(
    formData,
    "fundingExpected",
    "fundingExpectedAmounts",
  );
  const summaryRows = [
    {
      label: kind === "Initiative" ? "Initiative date" : "Event date",
      value: dateLabel,
    },
    {
      label: kind === "Initiative" ? "Initiative location" : "Event location",
      value: location,
    },
    {
      label: "Organization type",
      value: readString(formData, "csaAccredited") === "Yes" ? "CSA-accredited" : "Non-CSA organization",
    },
    {
      label: "Primary organization",
      value: readString(formData, "primaryOrg"),
    },
  ];
  const projectDescription =
    readString(formData, "eventDescription") ??
    readString(formData, "initiativeDescription");
  const advertisingPlan =
    readString(formData, "eventAdvertising") ??
    readString(formData, "initiativeAdvertising");
  const accessibilityPlan =
    readString(formData, "eventAccessible") ??
    readString(formData, "initiativeAccessible");
  const cosponsors =
    readString(formData, "eventCosponsors") ??
    readString(formData, "initiativeCosponsors");
  const futureActions = getFutureActions(application.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={backHref}
        className="text-sm font-medium text-sky-700 transition hover:text-sky-900"
      >
        {backLabel}
      </Link>

      <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.95),rgba(255,255,255,0.98))] shadow-sm">
        <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={getStatusBadgeClassName(application.status)}>
                  {statusMeta.label}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {application.organization.name}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                {statusMeta.description}
              </p>
            </div>

            <div className="grid min-w-full gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm shadow-sm sm:min-w-80">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Amount requested
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatCurrency(application.amountRequested)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Submitted
                  </p>
                  <p className="mt-1 text-slate-700">
                    {formatDateTime(application.submittedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Last updated
                  </p>
                  <p className="mt-1 text-slate-700">
                    {formatDateTime(application.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Submission summary
              </h2>
              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                <DetailItem label="Application type" value={kind} />
                <DetailItem label="Organization" value={application.organization.name} />
                {summaryRows.map((item) => (
                  <DetailItem key={item.label} label={item.label} value={item.value} />
                ))}
                <DetailItem
                  label="Budget attachment"
                  value={application.budgetFilePath ? "Uploaded" : "Not uploaded"}
                />
              </dl>
              {application.budgetFilePath && (
                <a
                  href={application.budgetFilePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-sky-700 transition hover:text-sky-900"
                >
                  Open budget attachment
                </a>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Applicant information
              </h2>
              <dl className="mt-4 grid gap-5 sm:grid-cols-2">
                <DetailItem label="Full name" value={applicant.fullName} />
                <DetailItem label="Email" value={applicant.email} />
                <DetailItem label="Phone" value={applicant.phone} />
                <DetailItem
                  label="Cheque name"
                  value={readString(formData, "chequeName")}
                />
              </dl>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <NarrativeBlock title="Description" value={projectDescription} />
              <NarrativeBlock title="Accessibility plan" value={accessibilityPlan} />
              <NarrativeBlock title="Advertising plan" value={advertisingPlan} />
              <NarrativeBlock title="Co-sponsors" value={cosponsors} />
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Funding snapshot
              </h2>
              <div className="mt-4 space-y-5">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Funding received to date
                  </p>
                  {receivedFunding.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {receivedFunding.map((entry) => (
                        <li
                          key={entry.label}
                          className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2"
                        >
                          <span>{entry.label}</span>
                          <span className="text-slate-500">
                            {entry.amount ? formatCurrency(entry.amount) : "No amount listed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No other funding listed.</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Expected additional funding
                  </p>
                  {expectedFunding.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {expectedFunding.map((entry) => (
                        <li
                          key={entry.label}
                          className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2"
                        >
                          <span>{entry.label}</span>
                          <span className="text-slate-500">
                            {entry.amount ? formatCurrency(entry.amount) : "No amount listed"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No expected funding listed.</p>
                  )}
                </div>
              </div>
            </section>

            {showActionRoadmap && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Action center
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  These actions are planned for future dashboard updates. Availability will change
                  automatically based on the application state shown above.
                </p>
                <div className="mt-4 space-y-3">
                  {futureActions.map((action) => (
                    <div
                      key={action.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {action.title}
                        </h3>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Coming soon
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {action.description}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                        {action.availabilityLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Raw submission data
                </h2>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Submitted {formatDate(application.submittedAt)}
                </p>
              </div>
              <pre className="mt-4 max-h-[28rem] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
