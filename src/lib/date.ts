const TORONTO_LOCALE = "en-CA";
const TORONTO_TIME_ZONE = "America/Toronto";

const torontoDateFormatter = new Intl.DateTimeFormat(TORONTO_LOCALE, {
  dateStyle: "medium",
  timeZone: TORONTO_TIME_ZONE,
});

const torontoDateTimeFormatter = new Intl.DateTimeFormat(TORONTO_LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TORONTO_TIME_ZONE,
});

const torontoYearFormatter = new Intl.DateTimeFormat(TORONTO_LOCALE, {
  year: "numeric",
  timeZone: TORONTO_TIME_ZONE,
});

const toDate = (value: Date | string | number) =>
  value instanceof Date ? value : new Date(value);

export function formatTorontoDate(value: Date | string | number) {
  return torontoDateFormatter.format(toDate(value));
}

export function formatTorontoDateTime(value: Date | string | number) {
  return torontoDateTimeFormatter.format(toDate(value));
}

export function formatTorontoYear(value: Date | string | number) {
  return torontoYearFormatter.format(toDate(value));
}

export { TORONTO_LOCALE, TORONTO_TIME_ZONE };
