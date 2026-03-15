/**
 * Derives a display title from application form data (event or initiative title).
 */
export function getApplicationTitle(formData: unknown): string {
  const form = formData as
    | { eventTitle?: string; initiativeTitle?: string }
    | null
    | undefined;
  if (!form) return "—";
  const event =
    typeof form.eventTitle === "string" && form.eventTitle.trim().length > 0
      ? form.eventTitle.trim()
      : "";
  const initiative =
    typeof form.initiativeTitle === "string" &&
    form.initiativeTitle.trim().length > 0
      ? form.initiativeTitle.trim()
      : "";
  return event || initiative || "—";
}

/**
 * Derives the event or initiative date from application form data.
 */
export function getApplicationDate(formData: unknown): string {
  const form = formData as
    | { eventDate?: string; initiativeDate?: string }
    | null
    | undefined;
  if (!form) return "—";
  const eventDate =
    typeof form.eventDate === "string" && form.eventDate.trim().length > 0
      ? form.eventDate.trim()
      : "";
  const initiativeDate =
    typeof form.initiativeDate === "string" &&
    form.initiativeDate.trim().length > 0
      ? form.initiativeDate.trim()
      : "";
  return eventDate || initiativeDate || "—";
}
