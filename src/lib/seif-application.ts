import { cn } from "~/lib/utils";

export const APPLICATION_STATUS_META = {
  DRAFT: {
    label: "Draft",
    description: "Saved, but not yet submitted for review.",
    tone: "border-slate-200 bg-slate-100 text-slate-700",
  },
  SUBMITTED: {
    label: "Submitted",
    description: "Received and queued for review.",
    tone: "border-sky-200 bg-sky-100 text-sky-700",
  },
  UNDER_REVIEW: {
    label: "Under review",
    description: "Currently being assessed by the SEIF team.",
    tone: "border-amber-200 bg-amber-100 text-amber-800",
  },
  APPROVED: {
    label: "Approved",
    description: "Approved for funding. Follow-up steps will appear here as they launch.",
    tone: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  REJECTED: {
    label: "Denied",
    description: "This application was not approved. Resubmission tools are planned.",
    tone: "border-rose-200 bg-rose-100 text-rose-800",
  },
} as const;

export type ApplicationStatus = keyof typeof APPLICATION_STATUS_META;
export type ApplicationFormData = unknown;

export type FutureApplicationAction = {
  id: "resubmit" | "report" | "documents";
  title: string;
  description: string;
  availabilityLabel: string;
  enabled: boolean;
};

const currencyFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatCurrency(value: number | string | { toString(): string }) {
  const normalized = typeof value === "number" ? value : Number(value.toString());
  return currencyFormatter.format(Number.isFinite(normalized) ? normalized : 0);
}

export function formatDate(value: Date | string) {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return dateTimeFormatter.format(new Date(value));
}

export function getStatusMeta(status: ApplicationStatus) {
  return APPLICATION_STATUS_META[status] ?? APPLICATION_STATUS_META.SUBMITTED;
}

export function getStatusBadgeClassName(status: ApplicationStatus) {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
    getStatusMeta(status).tone,
  );
}

function asFormRecord(formData: ApplicationFormData) {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
    return null;
  }

  return formData as Record<string, unknown>;
}

export function readString(
  formData: ApplicationFormData,
  ...keys: readonly string[]
) {
  const record = asFormRecord(formData);
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function readStringArray(
  formData: ApplicationFormData,
  key: string,
) {
  const record = asFormRecord(formData);
  if (!record) {
    return [];
  }

  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readStringRecord(
  formData: ApplicationFormData,
  key: string,
) {
  const record = asFormRecord(formData);
  if (!record) {
    return {};
  }

  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[1].trim().length > 0,
    ),
  );
}

export function getApplicationKind(formData: ApplicationFormData) {
  return readString(formData, "typeFunding");
}

export function getApplicationTitle(formData: ApplicationFormData) {
  return (
    readString(formData, "eventTitle", "initiativeTitle") ??
    getApplicationKind(formData) ??
    "Untitled application"
  );
}

export function getApplicationDateLabel(formData: ApplicationFormData) {
  return readString(formData, "eventDate", "initiativeDate");
}

export function getApplicationLocation(formData: ApplicationFormData) {
  return readString(formData, "eventLocation", "initiativeLocation");
}

export function getApplicantSummary(formData: ApplicationFormData) {
  return {
    fullName: readString(formData, "fullName"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
  };
}

export function getFundingEntries(
  formData: ApplicationFormData,
  listKey: "fundingReceived" | "fundingExpected",
  amountKey: "fundingReceivedAmounts" | "fundingExpectedAmounts",
) {
  const entries = readStringArray(formData, listKey);
  const amounts = readStringRecord(formData, amountKey);

  return entries.map((entry) => ({
    label: entry,
    amount: amounts[entry] ?? null,
  }));
}

export function getFutureActions(status: ApplicationStatus): FutureApplicationAction[] {
  return [
    {
      id: "resubmit",
      title: "Resubmit application",
      description: "Reopen and revise a denied application without starting from scratch.",
      availabilityLabel:
        status === "REJECTED" ? "Planned for denied applications" : "Available after a denial",
      enabled: status === "REJECTED",
    },
    {
      id: "report",
      title: "Submit funding report",
      description: "Complete post-event or post-initiative reporting directly from your dashboard.",
      availabilityLabel:
        status === "APPROVED" ? "Planned for approved applications" : "Available after approval",
      enabled: status === "APPROVED",
    },
    {
      id: "documents",
      title: "Upload follow-up documents",
      description: "Send additional files or clarifications when the SEIF team requests them.",
      availabilityLabel:
        status === "UNDER_REVIEW"
          ? "Planned for in-review follow-ups"
          : "Available when more information is requested",
      enabled: status === "UNDER_REVIEW",
    },
  ];
}
