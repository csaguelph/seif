"use client";

import {
  useState,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { authClient } from "~/server/better-auth/client";
import { ChevronDown } from "lucide-react";
import { BudgetFileUpload } from "~/components/ui/file-upload";
import { getFlagEmoji, getPhoneInputState } from "~/lib/phone";

type Org = RouterOutputs["application"]["listOrganizations"][number];

const DRAFT_KEY = "seif-application-draft";

function loadDraft(): {
  formData: FormData;
  budgetPath: string;
  phoneInput: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      formData: FormData;
      budgetPath?: string;
      phoneInput?: string;
    };
    return {
      formData: parsed.formData ?? {},
      budgetPath: parsed.budgetPath ?? "",
      phoneInput: parsed.phoneInput ?? "",
    };
  } catch {
    return null;
  }
}

function saveDraft(formData: FormData, budgetPath: string, phoneInput: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ formData, budgetPath, phoneInput }),
    );
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

type FormData = Record<string, unknown>;

const PRIMARY_ORGS = [
  "Central Veterinary Student Association",
  "College of Arts Student Union",
  "College of Biological Science Student Council",
  "Lang Students' Association",
  "College of Physical and Engineering Science Student Council",
  "College of Social and Applied Human Science Student Alliance",
  "Graduate Students Association",
  "Interhall Council",
  "Student's Federation of the Ontario Agricultural College",
  "Student Senate Caucus",
  "Other",
] as const;

const PREAMBLE = `NEW! Effective 1/15/2025, the yearly limit for SEIF has doubled from $500 to $1,000! Welcome to the Central Student Association (CSA) Student Events and Initiatives Funding (SEIF) Application Form, in which CSA members may request financial support for any event, or initiative. Before you get started, there's a few important things you might want to know...

Requests for financial support may cover, but are not limited to, promotion, technical assistance, event supplies, and transportation. SEIF is not granted for operational costs, salaries, or alcohol costs. Priority goes to applications that will have the greatest impact on the undergraduate population at the University of Guelph. In fairness to all organizations, no group will be awarded more than $1,000 in any fiscal year (May-April). In order to qualify for future funding, recipients of SEIF funds must complete the SEIF Funding Report within two weeks of the event or initiative. Thank you for reading! If you have any questions regarding the completion of this form, please consult our website or reach out via email at csaclubs@uoguelph.ca.`;

const TERMS_STATEMENTS: { key: string; text: string }[] = [
  {
    key: "termsRead",
    text: "I have read the relevant policy, rules and guidelines regarding the SEIF process (available on the CSA website).",
  },
  {
    key: "termsTemplate",
    text: "I understand that by not following the directions laid out or submitting a budget without using the provided template that my application will not be considered.",
  },
  {
    key: "termsReturn",
    text: "I understand that I must return any funds that are unused, and must return all funds if the event is cancelled.",
  },
  {
    key: "termsReport",
    text: "I understand that in order to qualify for future funding, recipients of SEIF funding must submit the report to the CSA within two weeks of the event or initiative (or within two weeks of receiving notification of funding for previous events/initiatives).",
  },
  {
    key: "termsOnlyForm",
    text: "I acknowledge that only information provided in this form will be considered for SEIF assessment unless indicated otherwise.",
  },
  {
    key: "termsNoReconsideration",
    text: "I understand that reconsideration on the ground of providing more information after the application has been assessed will not be entertained.",
  },
  {
    key: "termsOrgIneligible",
    text: "I understand that failure to follow the guidelines set in the SEIF process or by submitting false information my organization will not be eligible to apply for SEIF in the future.",
  },
  {
    key: "termsApplicantIneligible",
    text: "I understand that failure to follow the guidelines set in the SEIF process or by submitting false information I (the individual applying) will not be eligible to apply for SEIF in the future for this organization or any other organization in the future.",
  },
  {
    key: "termsCertify",
    text: "I acknowledge that by signing this form, it certifies that all information provided in this form is true and I understand the terms and conditions of the SEIF Process.",
  },
];

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1 block text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-600"> *</span>}
    </label>
  );
}

function SearchableOrganizationSelect({
  organizations,
  value,
  onChange,
  disabled,
  required,
}: {
  organizations: Org[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOrg = organizations.find((o) => o.id === value);
  const filtered = query.trim()
    ? organizations.filter((o) =>
        o.name.toLowerCase().includes(query.toLowerCase()),
      )
    : organizations;

  useEffect(() => {
    if (!open) return;
    setHighlightIndex(0);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const item = el.children[highlightIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) {
          onChange(filtered[highlightIndex].id);
          setOpen(false);
          setQuery("");
        }
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="hidden"
        name="organizationId"
        value={value}
        required={required}
      />
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="org-listbox"
        aria-activedescendant={
          filtered[highlightIndex]
            ? `org-option-${filtered[highlightIndex].id}`
            : undefined
        }
        className="flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:outline-none"
      >
        <input
          type="text"
          value={open ? query : (selectedOrg?.name ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery(selectedOrg?.name ?? "");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search or select organization…"
          disabled={disabled}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-gray-900 outline-none placeholder:text-gray-500 focus:ring-0 focus:outline-none"
          autoComplete="off"
          aria-autocomplete="list"
          aria-label="Organization"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!open) setQuery(selectedOrg?.name ?? "");
            setOpen(!open);
          }}
          disabled={disabled}
          className="shrink-0 text-gray-400 hover:text-gray-600"
          aria-label={open ? "Close list" : "Open list"}
        >
          <ChevronDown
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && (
        <ul
          ref={listRef}
          id="org-listbox"
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              No organizations match
            </li>
          ) : (
            filtered.map((org, i) => (
              <li
                key={org.id}
                id={`org-option-${org.id}`}
                role="option"
                aria-selected={value === org.id}
                className={`cursor-pointer px-3 py-2 text-sm ${value === org.id ? "bg-indigo-50 text-indigo-900" : highlightIndex === i ? "bg-gray-100 text-gray-900" : "text-gray-700"} hover:bg-gray-100`}
                onClick={() => {
                  onChange(org.id);
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setHighlightIndex(i)}
              >
                {org.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function PhoneNumberField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (next: { displayValue: string; storedValue: string }) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextSelectionRef = useRef<number | null>(null);
  const { detectedCountry, callingCode, isValid } = getPhoneInputState(value);
  const showCodeInBadge = !value.trimStart().startsWith("+");

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.setCustomValidity(
      value.length > 0 && !isValid ? "Enter a complete phone number." : "",
    );
  }, [isValid, value]);

  useLayoutEffect(() => {
    if (nextSelectionRef.current == null) return;

    inputRef.current?.setSelectionRange(
      nextSelectionRef.current,
      nextSelectionRef.current,
    );
    nextSelectionRef.current = null;
  }, [value]);

  const handleChange = (nextValue: string, selectionStart: number | null) => {
    const digitIndex = nextValue
      .slice(0, selectionStart ?? nextValue.length)
      .replace(/\D/g, "").length;
    const nextState = getPhoneInputState(nextValue);

    let digitsSeen = 0;
    let nextSelection = nextState.formatted.length;
    for (const [index, char] of [...nextState.formatted].entries()) {
      if (/\d/.test(char)) {
        digitsSeen += 1;
        if (digitsSeen >= digitIndex) {
          nextSelection = index + 1;
          break;
        }
      }
    }

    nextSelectionRef.current = digitIndex === 0 ? 0 : nextSelection;
    onChange({
      displayValue: nextState.formatted,
      storedValue: nextState.e164 ?? "",
    });
  };

  return (
    <div>
      <div className="flex overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <div className="flex shrink-0 items-center gap-2 border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-700">
          <span aria-hidden className="text-lg leading-none">
            {getFlagEmoji(detectedCountry)}
          </span>
          {showCodeInBadge && <span className="font-medium">{callingCode}</span>}
        </div>
        <input
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className="min-w-0 flex-1 border-0 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-500 focus:ring-0"
          value={value}
          onChange={(e) =>
            handleChange(e.target.value, e.target.selectionStart)
          }
          placeholder="(519) 555-1234"
          required={required}
          aria-label="Phone Number"
        />
      </div>
    </div>
  );
}

export function ApplicationForm() {
  const { data: session } = authClient.useSession();
  const [formData, setFormData] = useState<FormData>({});
  const [budgetPath, setBudgetPath] = useState<string>("");
  const [phoneInput, setPhoneInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const update = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Restore draft from localStorage on mount (once)
  useEffect(() => {
    if (draftRestored) return;
    const draft = loadDraft();
    if (
      draft &&
      (Object.keys(draft.formData).length > 0 ||
        draft.budgetPath ||
        draft.phoneInput)
    ) {
      setFormData(draft.formData);
      setBudgetPath(draft.budgetPath);
      setPhoneInput(
        draft.phoneInput ||
          getPhoneInputState((draft.formData.phone as string) ?? "").formatted,
      );
    }
    setDraftRestored(true);
  }, [draftRestored]);

  // Persist draft when form data or budget path changes (debounced)
  useEffect(() => {
    if (!draftRestored) return;
    const t = setTimeout(() => {
      saveDraft(formData, budgetPath, phoneInput);
    }, 500);
    return () => clearTimeout(t);
  }, [formData, budgetPath, draftRestored, phoneInput]);

  const { data: organizations = [], isLoading: orgsLoading } =
    api.application.listOrganizations.useQuery();
  const create = api.application.create.useMutation({
    onSuccess: () => {
      setSubmitError(null);
      clearDraft();
      window.location.href = "/apply?submitted=1";
    },
    onError: (e) => setSubmitError(e.message),
  });

  const isEvent = formData.typeFunding === "Event";
  const isInitiative = formData.typeFunding === "Initiative";
  const isCsaClub = formData.csaAccredited === "Yes";
  const hasExternalBank = formData.externalBankAccount === "Yes";
  const showExternalBanking = isCsaClub && hasExternalBank;
  const showNonCsaOrg = formData.csaAccredited === "No";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!session?.user) {
      saveDraft(formData, budgetPath, phoneInput);
      void authClient.signIn.social({
        provider: "microsoft",
        callbackURL: "/apply",
      });
      setSubmitError(
        "Please sign in to submit. Your responses have been saved and will be restored when you return.",
      );
      return;
    }

    const orgId = formData.organizationId as string;
    const amount = Number(formData.amountRequested);
    if (!orgId || organizations.every((o: { id: string }) => o.id !== orgId)) {
      setSubmitError("Please select an organization.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSubmitError("Please enter a valid amount requested.");
      return;
    }
    if (!getPhoneInputState(formData.phone).isValid) {
      setSubmitError("Please enter a valid phone number.");
      return;
    }
    if (!budgetPath) {
      setSubmitError("Please upload your budget file.");
      return;
    }

    create.mutate({
      organizationId: orgId,
      amountRequested: amount,
      budgetFilePath: budgetPath,
      formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      {/* Organization Representation */}
      <section className="rounded-lg border border-gray-200 bg-gray-50/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Organization Representation
        </h2>
        <div className="mt-4">
          <Label required>
            Organization for which you are making this submission
          </Label>
          <SearchableOrganizationSelect
            organizations={organizations}
            value={(formData.organizationId as string) ?? ""}
            onChange={(id) => update("organizationId", id)}
            disabled={orgsLoading}
            required
          />
          {organizations.length === 0 && !orgsLoading && (
            <p className="mt-1 text-sm text-amber-600">
              No organizations are set up yet. Please contact an administrator.
            </p>
          )}
        </div>
      </section>

      {/* Preamble */}
      <section className="rounded-lg border border-gray-200 bg-amber-50/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Preamble</h2>
        <p className="mt-2 text-sm whitespace-pre-line text-gray-700">
          {PREAMBLE}
        </p>
      </section>

      {/* Applicant Information */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Applicant Information
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>Full Name</Label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={(formData.fullName as string) ?? ""}
              onChange={(e) => update("fullName", e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>UofG Email Address</Label>
            <input
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={(formData.email as string) ?? ""}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>Phone Number</Label>
            <PhoneNumberField
              value={phoneInput}
              onChange={({ displayValue, storedValue }) => {
                setPhoneInput(displayValue);
                update("phone", storedValue);
              }}
              required
            />
          </div>
        </div>
      </section>

      {/* Organization Information */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Organization Information
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          A CSA Club is accredited through the CSA and holds a CSA Club bank
          account. Non-CSA clubs receive funding via cheque.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>
              Is your organization accredited through the CSA?
            </Label>
            <div className="flex gap-6 pt-1">
              {["Yes", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="csaAccredited"
                    value={opt}
                    checked={(formData.csaAccredited as string) === opt}
                    onChange={() => update("csaAccredited", opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
          {isCsaClub && (
            <div>
              <Label required>Do you have an external bank account?</Label>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="externalBankAccount"
                      value={opt}
                      checked={(formData.externalBankAccount as string) === opt}
                      onChange={() => update("externalBankAccount", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        {showExternalBanking && (
          <div className="mt-4">
            <Label required>
              Name to be written on the cheque (registered bank account name)
            </Label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={(formData.chequeName as string) ?? ""}
              onChange={(e) => update("chequeName", e.target.value)}
              required
              placeholder="Club's registered bank account name"
            />
          </div>
        )}
        {showNonCsaOrg && (
          <div className="mt-4">
            <Label required>
              What Primary Student Organization is your club accredited under?
            </Label>
            <div className="mt-2 space-y-2">
              {PRIMARY_ORGS.map((org) => (
                <label key={org} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="primaryOrg"
                    value={org}
                    checked={(formData.primaryOrg as string) === org}
                    onChange={() => update("primaryOrg", org)}
                  />
                  <span>{org}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Other Sources of Funding */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Other Sources of Funding
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          If your event/initiative results in a surplus, you will be required to
          return the awarded funds to the CSA. Requests may not be approved if
          your budget indicates a surplus.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>Funding received to date</Label>
            <div className="mt-2 space-y-3">
              {[
                "None",
                "Student Life Enhancement Fund (SLEF)",
                "Other PDR Requests",
                "Other",
              ].map((opt) => {
                const received = (formData.fundingReceived as string[]) ?? [];
                const checked = received.includes(opt);
                const amounts =
                  (formData.fundingReceivedAmounts as Record<string, string>) ??
                  {};
                return (
                  <div
                    key={opt}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...received, opt]
                            : received.filter((x) => x !== opt);
                          update("fundingReceived", next);
                          if (!e.target.checked) {
                            const nextAmounts = { ...amounts };
                            delete nextAmounts[opt];
                            update("fundingReceivedAmounts", nextAmounts);
                          }
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                    {checked && opt !== "None" && (
                      <div className="flex items-center gap-2">
                        <span className="text-right text-sm text-gray-600">
                          Amount received ($)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          value={amounts[opt] ?? ""}
                          onChange={(e) =>
                            update("fundingReceivedAmounts", {
                              ...amounts,
                              [opt]: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <Label required>Funding you expect to receive</Label>
            <div className="mt-2 space-y-3">
              {[
                "None",
                "Student Life Enhancement Fund (SLEF)",
                "Other PDR Requests",
                "Other",
              ].map((opt) => {
                const expected = (formData.fundingExpected as string[]) ?? [];
                const checked = expected.includes(opt);
                const amounts =
                  (formData.fundingExpectedAmounts as Record<string, string>) ??
                  {};
                return (
                  <div
                    key={opt}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...expected, opt]
                            : expected.filter((x) => x !== opt);
                          update("fundingExpected", next);
                          if (!e.target.checked) {
                            const nextAmounts = { ...amounts };
                            delete nextAmounts[opt];
                            update("fundingExpectedAmounts", nextAmounts);
                          }
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                    {checked && opt !== "None" && (
                      <div className="flex items-center gap-2">
                        <span className="text-right text-sm text-gray-600">
                          Amount expected ($)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-right text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          value={amounts[opt] ?? ""}
                          onChange={(e) =>
                            update("fundingExpectedAmounts", {
                              ...amounts,
                              [opt]: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Event or Initiative */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Event/Initiative Details
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          An event is a planned occasion (e.g. CSA Sexy Bingo). An initiative
          has clear objectives and timelines over a longer period (e.g.
          Menstrual Hygiene Initiative).
        </p>
        <div className="mt-4">
          <Label required>
            Are you applying for an event or an initiative?
          </Label>
          <div className="flex gap-6 pt-1">
            {["Event", "Initiative"].map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="typeFunding"
                  value={opt}
                  checked={(formData.typeFunding as string) === opt}
                  onChange={() => update("typeFunding", opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Event Details (conditional) */}
      {isEvent && (
        <section className="rounded-lg border border-gray-200 bg-sky-50/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label required>Event Title</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.eventTitle as string) ?? ""}
                onChange={(e) => update("eventTitle", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Event Location</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.eventLocation as string) ?? ""}
                onChange={(e) => update("eventLocation", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Event Date</Label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.eventDate as string) ?? ""}
                onChange={(e) => update("eventDate", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>
                Has this event been submitted to the Student Events & Risk
                Management process (GryphLife)?
              </Label>
              <p className="mb-1 text-sm text-gray-600">
                The event does not need to be approved yet, just submitted.
              </p>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="eventGryphLife"
                      value={opt}
                      checked={(formData.eventGryphLife as string) === opt}
                      onChange={() => update("eventGryphLife", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {formData.eventGryphLife === "No" && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                  All events submitted to SEIF must be submitted on GryphLife
                  for Student Events &amp; Risk Management (SE&amp;RM) review.
                  Please submit your event on GryphLife before continuing your
                  SEIF application.
                </div>
              )}
            </div>
            <div>
              <Label required>Event type that best describes your event</Label>
              <div className="mt-2 flex flex-wrap gap-4">
                {[
                  "Networking",
                  "Community-Building",
                  "Competition",
                  "Conference",
                  "Demonstration",
                  "Show, or Performance",
                  "Fundraising for a charitable organization",
                  "Other",
                ].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="eventType"
                      value={opt}
                      checked={(formData.eventType as string) === opt}
                      onChange={() => update("eventType", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label required>Description of the event</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={4}
                value={(formData.eventDescription as string) ?? ""}
                onChange={(e) => update("eventDescription", e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Co-sponsors (if any)</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={2}
                value={(formData.eventCosponsors as string) ?? ""}
                onChange={(e) => update("eventCosponsors", e.target.value)}
              />
            </div>
            <div>
              <Label required>Expected number of participants</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.eventParticipants as string) ?? ""}
                onChange={(e) => update("eventParticipants", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Breakdown: students vs community members</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.eventParticipantsBreakdown as string) ?? ""}
                onChange={(e) =>
                  update("eventParticipantsBreakdown", e.target.value)
                }
                placeholder="e.g. 50 students, 10 community"
                required
              />
            </div>
            <div>
              <Label required>How will you advertise?</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                value={(formData.eventAdvertising as string) ?? ""}
                onChange={(e) => update("eventAdvertising", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Is there a fee to attend?</Label>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="eventFee"
                      value={opt}
                      checked={(formData.eventFee as string) === opt}
                      onChange={() => update("eventFee", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {formData.eventFee === "Yes" && (
                <div className="mt-3">
                  <Label required>
                    How much is the fee, and what does it cover?
                  </Label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    rows={2}
                    value={(formData.eventFeeDetails as string) ?? ""}
                    onChange={(e) => update("eventFeeDetails", e.target.value)}
                    placeholder="e.g. $5 — covers materials and refreshments"
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <Label required>
                The event date/time does not conflict with any religious or
                otherwise culturally important date(s) (see Religious Holidays
                Calendar).
              </Label>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="eventNoConflict"
                      value={opt}
                      checked={(formData.eventNoConflict as string) === opt}
                      onChange={() => update("eventNoConflict", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {formData.eventNoConflict === "No" && (
                <div className="mt-3">
                  <Label required>If no, please explain.</Label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    rows={2}
                    value={(formData.eventNoConflictExplain as string) ?? ""}
                    onChange={(e) =>
                      update("eventNoConflictExplain", e.target.value)
                    }
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <Label required>
                Can anyone (including community members) attend?
              </Label>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="eventOpenToAll"
                      value={opt}
                      checked={(formData.eventOpenToAll as string) === opt}
                      onChange={() => update("eventOpenToAll", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {formData.eventOpenToAll === "No" && (
                <div className="mt-3">
                  <Label required>Specify who cannot attend your event.</Label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    value={(formData.eventOpenToAllSpecify as string) ?? ""}
                    onChange={(e) =>
                      update("eventOpenToAllSpecify", e.target.value)
                    }
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <Label required>How will you make the event accessible?</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                value={(formData.eventAccessible as string) ?? ""}
                onChange={(e) => update("eventAccessible", e.target.value)}
                required
              />
            </div>
          </div>
        </section>
      )}

      {/* Initiative Details (conditional) */}
      {isInitiative && (
        <section className="rounded-lg border border-gray-200 bg-emerald-50/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Initiative Details
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label required>Initiative Title</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.initiativeTitle as string) ?? ""}
                onChange={(e) => update("initiativeTitle", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Initiative Location</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.initiativeLocation as string) ?? ""}
                onChange={(e) => update("initiativeLocation", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Initiative Date (or date range)</Label>
              <input
                type="date"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.initiativeDate as string) ?? ""}
                onChange={(e) => update("initiativeDate", e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                For a date range, use the start date. You can describe the full
                range in the description below.
              </p>
            </div>
            <div>
              <Label required>Description of the initiative</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={4}
                value={(formData.initiativeDescription as string) ?? ""}
                onChange={(e) =>
                  update("initiativeDescription", e.target.value)
                }
                required
              />
            </div>
            <div>
              <Label required>Co-sponsors (if any)</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={2}
                value={(formData.initiativeCosponsors as string) ?? ""}
                onChange={(e) => update("initiativeCosponsors", e.target.value)}
              />
            </div>
            <div>
              <Label required>How many individuals will be impacted?</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.initiativeImpact as string) ?? ""}
                onChange={(e) => update("initiativeImpact", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>Breakdown: students vs community members</Label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                value={(formData.initiativeBreakdown as string) ?? ""}
                onChange={(e) => update("initiativeBreakdown", e.target.value)}
                required
              />
            </div>
            <div>
              <Label required>How will you advertise?</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                value={(formData.initiativeAdvertising as string) ?? ""}
                onChange={(e) =>
                  update("initiativeAdvertising", e.target.value)
                }
                required
              />
            </div>
            <div>
              <Label required>
                Is there a fee associated with being part of the initiative?
              </Label>
              <div className="flex gap-6 pt-1">
                {["Yes", "No"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="initiativeFee"
                      value={opt}
                      checked={(formData.initiativeFee as string) === opt}
                      onChange={() => update("initiativeFee", opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              {formData.initiativeFee === "Yes" && (
                <div className="mt-3">
                  <Label required>
                    If yes, how much is the fee, and what does it cover?
                  </Label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    rows={2}
                    value={(formData.initiativeFeeDetails as string) ?? ""}
                    onChange={(e) =>
                      update("initiativeFeeDetails", e.target.value)
                    }
                    placeholder="e.g. $10 — covers materials"
                    required
                  />
                </div>
              )}
            </div>
            <div>
              <Label required>
                How will you make the initiative accessible?
              </Label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                rows={3}
                value={(formData.initiativeAccessible as string) ?? ""}
                onChange={(e) => update("initiativeAccessible", e.target.value)}
                required
              />
            </div>
          </div>
        </section>
      )}

      {/* Previous Funding */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Previous Funding
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>
              Has your organization received SEIF funding this year for another
              event or initiative?
            </Label>
            <div className="flex gap-6 pt-1">
              {["Yes", "I'm not sure", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="seifThisYear"
                    value={opt}
                    checked={(formData.seifThisYear as string) === opt}
                    onChange={() => update("seifThisYear", opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {formData.seifThisYear === "Yes" && (
              <div className="mt-3">
                <Label required>If yes, how much?</Label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  value={(formData.seifThisYearAmount as string) ?? ""}
                  onChange={(e) => update("seifThisYearAmount", e.target.value)}
                  placeholder="e.g. $250"
                  required
                />
              </div>
            )}
          </div>
          <div>
            <Label required>
              Has your organization received SEIF funding for the same
              event/initiative in the past?
            </Label>
            <div className="flex gap-6 pt-1">
              {["Yes", "I'm not sure", "No"].map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="seifSameBefore"
                    value={opt}
                    checked={(formData.seifSameBefore as string) === opt}
                    onChange={() => update("seifSameBefore", opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Financial Information */}
      <section className="rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Financial Information
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Please use the budget template below. Budgets not submitted using the
          template will not be accepted.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label required>Upload your budget</Label>
            <p className="mb-2 text-sm text-gray-500">
              Download and use the{" "}
              <a
                href="https://csaonline.ca/wp-content/uploads/2025/01/SEIF-Budget-Template.xlsx"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline hover:text-indigo-800"
              >
                SEIF Budget Template (Excel)
              </a>
              . Upload your completed budget as an Excel file (.xlsx or .xls).
            </p>
            <BudgetFileUpload
              value={budgetPath}
              onChange={setBudgetPath}
              hint="Excel only (.xlsx, .xls) (max. 10 MB)"
            />
          </div>
          <div>
            <Label required>Amount requested ($)</Label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={(formData.amountRequested as string) ?? ""}
              onChange={(e) => update("amountRequested", e.target.value)}
              required
            />
          </div>
          <div>
            <Label required>
              If you do not receive full funding, how will this impact the
              event? What portion of your budget is CSA funding?
            </Label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              rows={4}
              value={(formData.impactPartialFunding as string) ?? ""}
              onChange={(e) => update("impactPartialFunding", e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Anything else the SEIF Committee should know?</Label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              rows={3}
              value={(formData.additionalInfo as string) ?? ""}
              onChange={(e) => update("additionalInfo", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Terms & Conditions */}
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Terms & Conditions
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please check each box next to the statement and enter your name as a
          digital signature.
        </p>
        <div className="mt-4 space-y-3">
          {TERMS_STATEMENTS.map(({ key, text }) => (
            <label
              key={key}
              className="flex items-start gap-3 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={!!formData[key]}
                onChange={(e) => update(key, e.target.checked)}
                required
              />
              <span>{text}</span>
            </label>
          ))}
          <div className="pt-2">
            <Label required>Digital signature (your full name)</Label>
            <input
              type="text"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              value={(formData.signature as string) ?? ""}
              onChange={(e) => update("signature", e.target.value)}
              placeholder="Type your full name"
              required
            />
          </div>
        </div>
      </section>

      {submitError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {!session?.user && (
        <p className="text-sm text-amber-700">
          You must sign in to submit. Your responses are saved automatically and
          will be here when you return.
        </p>
      )}
      <div className="flex justify-end gap-4">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {create.isPending
            ? "Submitting…"
            : session?.user
              ? "Submit Application"
              : "Sign in to submit"}
        </button>
      </div>
    </form>
  );
}
