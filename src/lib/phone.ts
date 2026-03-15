import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.min.json";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "CA";

function normalizePhoneValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getFlagEmoji(countryCode: string | null | undefined) {
  const normalized = countryCode?.trim().toUpperCase();
  if (normalized?.length !== 2) return "🇨🇦";

  return String.fromCodePoint(
    ...[...normalized].map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function getPhoneInputState(
  value: unknown,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
) {
  const rawValue = normalizePhoneValue(value);
  const formatter = new AsYouType(defaultCountry, metadata);
  const formatted = formatter.input(rawValue);
  const parsed = parsePhoneNumberFromString(rawValue, defaultCountry, metadata);
  const detectedCountry =
    formatter.getCountry() ?? parsed?.country ?? defaultCountry;
  const callingCode = parsed?.countryCallingCode
    ? `+${parsed.countryCallingCode}`
    : `+${getCountryCallingCode(detectedCountry, metadata)}`;
  const isValid = parsed?.isValid() ?? false;

  return {
    formatted,
    detectedCountry,
    callingCode,
    e164: isValid ? parsed.number : null,
    isValid,
  };
}

export function formatStoredPhoneNumber(
  value: unknown,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
) {
  const rawValue = normalizePhoneValue(value);
  if (!rawValue) return null;

  const parsed = parsePhoneNumberFromString(rawValue, defaultCountry, metadata);
  if (!parsed) {
    return getPhoneInputState(rawValue, defaultCountry).formatted || rawValue;
  }

  return rawValue.startsWith("+") || parsed.country !== defaultCountry
    ? parsed.formatInternational()
    : parsed.formatNational();
}
