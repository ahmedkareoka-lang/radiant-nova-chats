import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Locale, t as translate, TranslationKey } from "./translations";
import {
  detectBrowserLocale,
  detectTimezone,
  detectCountryFromBrowser,
  currencyForCountry,
  isRTL,
  formatNumber,
  formatCompact,
  formatCurrency,
  formatDate,
  formatRelative,
} from "./locale";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
  /** IANA timezone, e.g. "Africa/Cairo". */
  timezone: string;
  /** Best-effort 2-letter country (from browser). */
  country: string | null;
  /** ISO currency code for display (USD fallback). */
  currency: string;
  /** Locale-aware formatters bound to the current language. */
  fmt: {
    number: (n: number) => string;
    compact: (n: number) => string;
    currency: (n: number, currency?: string) => string;
    date: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string;
    relative: (d: string | number | Date) => string;
  };
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "nova-lang";

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // 🌍 First load: respect saved choice; otherwise auto-detect from the browser.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "ar";
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved || detectBrowserLocale();
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore quota errors */ }
  }, []);

  const dir = isRTL(locale) ? "rtl" : "ltr";
  const timezone = useMemo(() => detectTimezone(), []);
  const country = useMemo(() => detectCountryFromBrowser(), []);
  const currency = useMemo(() => currencyForCountry(country), [country]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const tFn = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

  const fmt = useMemo(() => ({
    number: (n: number) => formatNumber(n, locale),
    compact: (n: number) => formatCompact(n, locale),
    currency: (n: number, c?: string) => formatCurrency(n, c || currency, locale),
    date: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => formatDate(d, locale, opts),
    relative: (d: string | number | Date) => formatRelative(d, locale),
  }), [locale, currency]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: tFn, dir, timezone, country, currency, fmt }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
};
