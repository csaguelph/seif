"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ReportBudgetUpload, ReportReceiptsUpload } from "~/components/ui/file-upload";
import { getApplicationTitle, getApplicationDate } from "~/lib/application";

const SEIF_BUDGET_LINK = "https://www.csaonline.ca/seif";

export function SeifReportForm({
  applicationId,
  amountAllocatedPreFill,
  applicationSummary,
}: {
  applicationId: string;
  amountAllocatedPreFill: number;
  applicationSummary: {
    organizationName: string;
    formData: unknown;
  };
}) {
  const [amountSpent, setAmountSpent] = useState<number | "">("");
  const [underSpendExplanation, setUnderSpendExplanation] = useState("");
  const [descriptionActivities, setDescriptionActivities] = useState("");
  const [finalBudgetFilePath, setFinalBudgetFilePath] = useState("");
  const [receiptsFilePaths, setReceiptsFilePaths] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createReport = api.report.create.useMutation({
    onSuccess: () => {
      setSubmitError(null);
      window.location.href = `/applications/${applicationId}?report=submitted`;
    },
    onError: (e) => setSubmitError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const spent = amountSpent === "" ? NaN : Number(amountSpent);
    if (!Number.isFinite(spent) || spent < 0) {
      setSubmitError("Please enter a valid amount spent.");
      return;
    }
    if (!descriptionActivities.trim()) {
      setSubmitError("Description & activities is required.");
      return;
    }
    if (!finalBudgetFilePath) {
      setSubmitError("Please upload the final budget file.");
      return;
    }
    if (receiptsFilePaths.length === 0) {
      setSubmitError("Please upload at least one receipt.");
      return;
    }
    createReport.mutate({
      applicationId,
      amountAllocated: amountAllocatedPreFill,
      amountSpent: spent,
      underSpendExplanation: underSpendExplanation.trim() || undefined,
      descriptionActivities: descriptionActivities.trim(),
      finalBudgetFilePath,
      receiptsFilePaths,
    });
  };

  const showUnderSpend =
    amountSpent !== "" &&
    Number.isFinite(Number(amountSpent)) &&
    Number(amountSpent) < amountAllocatedPreFill;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Application summary</h2>
        <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Organization
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {applicationSummary.organizationName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Event / initiative title
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {getApplicationTitle(applicationSummary.formData)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Amount awarded
            </dt>
            <dd className="mt-0.5 text-gray-900">
              ${amountAllocatedPreFill.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">
              Event / initiative date
            </dt>
            <dd className="mt-0.5 text-gray-900">
              {getApplicationDate(applicationSummary.formData)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Funding summary</h2>
        <div className="mt-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            How much of the awarded amount was spent on this event?{" "}
            <span className="text-red-600">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amountSpent === "" ? "" : amountSpent}
            onChange={(e) =>
              setAmountSpent(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {showUnderSpend && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              If you did not spend the full amount, please provide an explanation
            </label>
            <textarea
              value={underSpendExplanation}
              onChange={(e) => setUnderSpendExplanation(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Explain why the full amount was not used..."
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Description & activities</h2>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          What did students do at this event? Where was the money used? How did the funding received help the event be more successful? <span className="text-red-600">*</span>
        </label>
        <textarea
          value={descriptionActivities}
          onChange={(e) => setDescriptionActivities(e.target.value)}
          required
          rows={6}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Describe the event activities, how funds were used, and the impact of the funding..."
        />
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Final budget</h2>
        <p className="mt-1 text-sm text-gray-600">
          Upload a final budget using the specified format. Non-compliant budgets are not accepted. Format and template are available on the{" "}
          <a
            href={SEIF_BUDGET_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 hover:text-indigo-900"
          >
            SEIF website
          </a>
          .
        </p>
        <div className="mt-4">
          <ReportBudgetUpload
            value={finalBudgetFilePath}
            onChange={setFinalBudgetFilePath}
            label="Final budget file"
            hint="Use the template from the SEIF website. Excel only (.xlsx, .xls) (max 5 MB)."
          />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-6">
        <ReportReceiptsUpload
          value={receiptsFilePaths}
          onChange={setReceiptsFilePaths}
        />
      </section>

      {submitError && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{submitError}</p>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={createReport.isPending}
          className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {createReport.isPending ? "Submitting…" : "Submit SEIF report"}
        </button>
        <a
          href={`/applications/${applicationId}`}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
