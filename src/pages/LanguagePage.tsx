import { useNavigate } from "react-router-dom";
import { ChevronRight, Check, Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Locale } from "@/i18n/translations";

const LANGS: { code: Locale; native: string; en: string; flag: string }[] = [
  { code: "ar", native: "العربية", en: "Arabic", flag: "🇸🇦" },
  { code: "en", native: "English", en: "English", flag: "🇺🇸" },
];

export default function LanguagePage() {
  const navigate = useNavigate();
  const { locale, setLocale, dir } = useLanguage();

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">اللغة / Language</h1>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground">اختر لغة التطبيق المفضلة لديك. سيتم تطبيق التغيير فوراً.</p>
        {LANGS.map((l) => {
          const active = locale === l.code;
          return (
            <button
              key={l.code}
              onClick={() => setLocale(l.code)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                active
                  ? "border-primary bg-primary/15 shadow-[0_0_30px_-10px_hsl(var(--primary))]"
                  : "border-border/40 bg-secondary/20 hover:bg-secondary/40"
              }`}
            >
              <span className="text-3xl">{l.flag}</span>
              <div className="flex-1 text-start">
                <div className="font-bold">{l.native}</div>
                <div className="text-xs text-muted-foreground">{l.en}</div>
              </div>
              {active && <Check className="w-5 h-5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
