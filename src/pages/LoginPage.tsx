import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, LogIn, UserPlus, Globe, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import novaLogo from "@/assets/nova-logo.png";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  isTelegramMiniApp,
  getTelegramInitData,
} from "@/lib/telegramWebApp";
import { lovable } from "@/integrations/lovable/index";

const REDIRECT_KEY = "nova-redirect-after-login";
const TG_BOT_USERNAME = "NovaVoiceChat_bot";

// 6-12 chars: digits-only OR letters-only OR letters+digits mix.
const PASSWORD_RE =
  /^(?:[0-9]{6,12}|[A-Za-z]{6,12}|(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{6,12})$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale, dir } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "telegram">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);

  const inTelegram = isTelegramMiniApp();

  const redirectAfterLogin = () => {
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    if (saved) {
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate(saved, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  // Inject Telegram Login Widget script when on the Telegram tab (browser only)
  useEffect(() => {
    if (method !== "telegram" || inTelegram) return;
    const container = document.getElementById("tg-login-widget");
    if (!container || container.childElementCount > 0) return;

    // Global callback used by Telegram Login Widget
    (window as any).onTelegramAuth = async (user: any) => {
      await signInWithTelegramPayload({ widget: user });
    };

    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", TG_BOT_USERNAME);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "20");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    s.setAttribute("data-request-access", "write");
    container.appendChild(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, inTelegram]);

  const signInWithTelegramPayload = async (
    payload: { initData: string } | { widget: any },
  ) => {
    setTgLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-auth", {
        body: payload,
      });
      if (error || !data?.email || !data?.password) {
        throw new Error(data?.error || error?.message || "telegram_auth_failed");
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInErr) throw signInErr;
      toast.success(t("auth.tg_success"));
      redirectAfterLogin();
    } catch (err: any) {
      console.error("[tg-auth]", err);
      toast.error(err?.message || t("auth.tg_failed"));
    } finally {
      setTgLoading(false);
    }
  };

  const handleTelegramInApp = async () => {
    const initData = getTelegramInitData();
    if (!initData) {
      toast.error(t("auth.tg_failed"));
      return;
    }
    await signInWithTelegramPayload({ initData });
  };

  // 🚀 Auto-login when opened inside Telegram Mini App
  useEffect(() => {
    if (!inTelegram) return;
    const initData = getTelegramInitData();
    if (!initData) return;
    signInWithTelegramPayload({ initData });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTelegram]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!PASSWORD_RE.test(password)) {
      toast.error(t("auth.password_invalid"));
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || "User", gender },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success(t("auth.signup_success"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        try {
          const { data: fnData } = await supabase.functions.invoke("detect-country");
          if (fnData?.country_code) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("profiles")
                .update({ country_code: fnData.country_code })
                .eq("id", user.id);
            }
          }
        } catch {}

        redirectAfterLogin();
      }
    } catch (err: any) {
      toast.error(err.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      dir={dir}
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <button
        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
      >
        <Globe className="w-3.5 h-3.5" />
        {t("general.language")}
      </button>

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-8">
          <img loading="lazy" decoding="async" src={novaLogo} alt="NOVA" className="w-40 h-auto" />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-full bg-secondary/50 p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "login" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1" /> {t("auth.login")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "signup" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1" /> {t("auth.signup")}
          </button>
        </div>

        {/* Method toggle: Email | Telegram */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMethod("email")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "email" ? "border-primary text-primary glow-neon" : "border-border text-muted-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5 inline mr-1" /> {t("auth.email")}
          </button>
          <button
            onClick={() => setMethod("telegram")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "telegram"
                ? "border-sky-400 text-sky-300 shadow-[0_0_18px_hsl(200_90%_60%/0.35)]"
                : "border-border text-muted-foreground"
            }`}
          >
            <Send className="w-3.5 h-3.5 inline mr-1" /> {t("auth.telegram")}
          </button>
        </div>

        {method === "telegram" ? (
          <div className="space-y-4">
            {inTelegram ? (
              <button
                type="button"
                disabled={tgLoading}
                onClick={handleTelegramInApp}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 font-bold text-white shadow-[0_0_24px_hsl(200_90%_60%/0.45)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {tgLoading ? t("auth.loading") : t("auth.tg_inapp_btn")}
              </button>
            ) : (
              <>
                <p className="text-xs text-muted-foreground text-center">
                  {t("auth.tg_widget_hint")}
                </p>
                <div id="tg-login-widget" className="flex justify-center" />
                {tgLoading && (
                  <p className="text-xs text-center text-sky-300">{t("auth.loading")}</p>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <input
                  type="text"
                  placeholder={t("auth.name")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
                  required
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGender("male")}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                      gender === "male"
                        ? "border-blue-500 bg-blue-500/20 text-blue-400"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    👨 {t("auth.male")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender("female")}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                      gender === "female"
                        ? "border-pink-500 bg-pink-500/20 text-pink-400"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    👩 {t("auth.female")}
                  </button>
                </div>
              </>
            )}

            <input
              type="email"
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
            />

            <div>
              <input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
                required
                minLength={6}
                maxLength={12}
                pattern="^(?:[0-9]{6,12}|[A-Za-z]{6,12}|(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{6,12})$"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
                {t("auth.password_rule")}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full gradient-neon font-bold text-primary-foreground btn-nova glow-neon disabled:opacity-50"
            >
              {loading
                ? t("auth.loading")
                : mode === "signup"
                  ? t("auth.signup_btn")
                  : t("auth.login_btn")}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) { toast.error("ادخل البريد الإلكتروني أولاً"); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) toast.error(error.message);
                  else toast.success("تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك ✉️");
                }}
                className="w-full text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
              >
                نسيت كلمة السر؟
              </button>
            )}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-2 text-[10px] text-muted-foreground">أو</span></div>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if ((result as any).error) {
                    toast.error("فشل تسجيل الدخول عبر Google");
                  }
                } catch (e: any) {
                  toast.error(e?.message || "Google sign-in failed");
                }
              }}
              className="w-full py-3 rounded-full bg-white text-gray-800 font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              متابعة بحساب Google
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
