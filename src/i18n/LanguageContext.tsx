import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Locale, t as translate, TranslationKey } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "ar",
  setLocale: () => {},
  t: (key) => key,
  dir: "rtl",
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return (localStorage.getItem("nova-lang") as Locale) || "ar";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("nova-lang", l);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  const tFn = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: tFn, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
