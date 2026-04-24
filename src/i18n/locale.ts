/**
 * 🌍 Global Locale Utilities
 * ---------------------------------------------------------------
 * Centralized helpers for international support:
 *   • Auto-detect user language from browser
 *   • Map country → currency → number/date formatting
 *   • RTL detection for 10+ languages
 *   • Timezone-aware date formatting
 *
 * All formatting uses native `Intl` APIs (zero bundle cost).
 */

import type { Locale } from "./translations";

/** Languages we render right-to-left. */
const RTL_LANGS = new Set([
  "ar", "he", "fa", "ur", "ps", "sd", "ku", "yi", "dv", "ckb",
]);

/** Best-effort country → currency map for the most common markets. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", NZ: "NZD",
  EU: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR", PT: "EUR", IE: "EUR", BE: "EUR", AT: "EUR", FI: "EUR", GR: "EUR",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", TR: "TRY", RU: "RUB", UA: "UAH",
  // Middle East / Africa
  SA: "SAR", AE: "AED", EG: "EGP", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", LB: "LBP", IQ: "IQD",
  YE: "YER", SY: "SYP", PS: "ILS", IL: "ILS", MA: "MAD", DZ: "DZD", TN: "TND", LY: "LYD", SD: "SDG",
  NG: "NGN", KE: "KES", GH: "GHS", ZA: "ZAR", ET: "ETB", TZ: "TZS", UG: "UGX",
  // Asia
  JP: "JPY", CN: "CNY", KR: "KRW", IN: "INR", PK: "PKR", BD: "BDT", ID: "IDR", MY: "MYR", PH: "PHP", TH: "THB", VN: "VND", SG: "SGD", HK: "HKD", TW: "TWD",
  // Americas
  MX: "MXN", BR: "BRL", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN", VE: "VES",
};

/** Default to Arabic for our core market, English for everything else we don't translate yet. */
const SUPPORTED_LOCALES: Locale[] = ["ar", "en"];

/**
 * Detect the user's preferred locale from the browser.
 * Returns one of our supported locales; falls back to "ar".
 */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "ar";
  const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const raw of langs) {
    const base = raw.toLowerCase().split(/[-_]/)[0];
    if (SUPPORTED_LOCALES.includes(base as Locale)) return base as Locale;
  }
  return "ar";
}

/** Detect the user's IANA timezone (e.g. "Africa/Cairo"). Always available in modern browsers. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Best-effort country guess from the navigator language tag. */
export function detectCountryFromBrowser(): string | null {
  if (typeof navigator === "undefined") return null;
  const tag = navigator.language || "";
  const parts = tag.split(/[-_]/);
  if (parts.length >= 2) return parts[1].toUpperCase();
  return null;
}

/** Map ISO country code → preferred currency code (USD fallback). */
export function currencyForCountry(country?: string | null): string {
  if (!country) return "USD";
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] || "USD";
}

/** Whether a given language should render right-to-left. */
export function isRTL(locale: string): boolean {
  return RTL_LANGS.has(locale.toLowerCase().split(/[-_]/)[0]);
}

/** Map our app locale → BCP-47 tag for Intl APIs (handles dialects). */
function intlTag(locale: Locale): string {
  return locale === "ar" ? "ar-EG" : "en-US";
}

/** Format an integer/float with locale-aware grouping (e.g. 1,234,567 vs ١٬٢٣٤٬٥٦٧). */
export function formatNumber(value: number, locale: Locale = "ar"): string {
  try {
    return new Intl.NumberFormat(intlTag(locale)).format(value);
  } catch {
    return String(value);
  }
}

/** Compact format for big counters: 12.3K, 4.5M, etc. */
export function formatCompact(value: number, locale: Locale = "ar"): string {
  try {
    return new Intl.NumberFormat(intlTag(locale), { notation: "compact", maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
}

/** Format a money amount in the given currency, locale-aware. */
export function formatCurrency(value: number, currency = "USD", locale: Locale = "ar"): string {
  try {
    return new Intl.NumberFormat(intlTag(locale), { style: "currency", currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

/** Format a date in the user's timezone, locale-aware. */
export function formatDate(
  value: string | number | Date,
  locale: Locale = "ar",
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  try {
    return new Intl.DateTimeFormat(intlTag(locale), { timeZone: detectTimezone(), ...opts }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString();
  }
}

/** Relative time formatting ("3 minutes ago", "منذ 3 دقائق"). */
export function formatRelative(value: string | number | Date, locale: Locale = "ar"): string {
  const target = new Date(value).getTime();
  const diffSec = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(intlTag(locale), { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}
