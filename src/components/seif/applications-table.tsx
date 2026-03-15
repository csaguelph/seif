"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

export function ApplicationsTable() {
  const { data: applications, isLoading, error } = api.application.list.useQuery();

  const statusClasses: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-rose-100 text-rose-800",
    UNDER_REVIEW: "bg-amber-100 text-amber-800",
    SUBMITTED: "bg-blue-100 text-blue-800",
    DRAFT: "bg-gray-100 text-gray-800",
  };

  if (isLoading) {
    return (
      <div className="mt-6 text-gray-500">Loading applications…</div>
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
        No applications yet.
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
              Applicant
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
          {applications.map((app: RouterOutputs["application"]["list"][number]) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                {new Date(app.submittedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {app.organization.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {(app.formData as { fullName?: string })?.fullName ?? app.submittedBy?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                ${Number(app.amountRequested).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusClasses[app.status] ?? "bg-gray-100 text-gray-800"
                  }`}
                >
                  {app.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                <Link
                  href={`/admin/applications/${app.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
