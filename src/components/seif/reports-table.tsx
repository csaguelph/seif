"use client";

import Link from "next/link";
import { formatTorontoDate } from "~/lib/date";
import { getApplicationTitle } from "~/lib/application";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { ReportStatusBadge } from "./report-status-badge";

export function ReportsTable() {
  const { data: reports, isLoading, error } = api.report.list.useQuery();

  if (isLoading) {
    return <div className="mt-6 text-gray-500">Loading reports…</div>;
  }
  if (error) {
    return (
      <div className="mt-6 text-red-600">Failed to load: {error.message}</div>
    );
  }
  if (!reports?.length) {
    return (
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
        No reports yet.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Report submitted
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organization
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Amount spent
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
          {reports.map((report: RouterOutputs["report"]["list"][number]) => (
            <tr key={report.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                {formatTorontoDate(report.submittedAt)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {report.application.organization.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {getApplicationTitle(report.application.formData)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                ${Number(report.amountSpent).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <ReportStatusBadge status={report.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  href={`/admin/reports/${report.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-900"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
