const statusClasses: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  DRAFT: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under Review",
  SUBMITTED: "Submitted",
  DRAFT: "Draft",
};

export function ApplicationStatusBadge({
  status,
}: {
  status: string;
}) {
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
