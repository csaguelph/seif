"use client";

import Link from "next/link";
import { formatTorontoDate } from "~/lib/date";
import { getApplicationTitle } from "~/lib/application";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { ApplicationStatusBadge } from "./application-status-badge";
import { ReportStatusBadge } from "./report-status-badge";

type App = RouterOutputs["application"]["listMyApplications"][number];

export function UserApplicationsTable() {
  const { data: applications, isLoading, error } =
    api.application.listMyApplications.useQuery();

  if (isLoading) {
    return (
      <div className="mt-6 text-gray-500">Loading your applications…</div>
    );
  }
  if (error) {
    return (
      <div className="mt-6 text-red-600">Failed to load: {error.message}</div>
    );
  }
  if (!applications?.length) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        You haven’t submitted any applications yet.{" "}
        <Link href="/apply" className="font-medium text-indigo-600 hover:text-indigo-900">
          Start an application
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Submitted
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organization
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {applications.map((app: App) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                {formatTorontoDate(app.submittedAt)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {app.organization.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {getApplicationTitle(app.formData)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                ${Number(app.amountRequested).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <ApplicationStatusBadge status={app.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/applications/${app.id}`}
                    className="font-medium text-indigo-600 hover:text-indigo-900"
                  >
                    View details
                  </Link>
                  {app.status === "REJECTED" && (
                    <Link
                      href={`/applications/${app.id}/edit`}
                      className="font-medium text-amber-700 hover:text-amber-900"
                    >
                      Edit & resubmit
                    </Link>
                  )}
                  {app.status === "APPROVED" && (
                    app.report ? (
                      <ReportStatusBadge status={app.report.status} />
                    ) : (
                      <Link
                        href={`/applications/${app.id}/report`}
                        className="font-medium text-emerald-700 hover:text-emerald-900"
                      >
                        Submit report
                      </Link>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
