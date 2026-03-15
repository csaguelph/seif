const statusClasses: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-emerald-100 text-emerald-800",
  PENDING_FUNDS_RETURN: "bg-amber-100 text-amber-800",
  FUNDS_RETURNED: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  SUBMITTED: "Submitted",
  COMPLETE: "Complete",
  PENDING_FUNDS_RETURN: "Pending funds return",
  FUNDS_RETURNED: "Funds returned",
};

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        statusClasses[status] ?? "bg-gray-100 text-gray-800"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
