import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, LogIn, UserPlus, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import novaLogo from "@/assets/nova-logo.png";
import { useLanguage } from "@/i18n/LanguageContext";

const REDIRECT_KEY = "nova-redirect-after-login";

const LoginPage = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale, dir } = useLanguage();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const redirectAfterLogin = () => {
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    if (saved) {
      sessionStorage.removeItem(REDIRECT_KEY);
      navigate(saved, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      if (method === "email") {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
      }
      setOtpSent(true);
      toast.success(t("auth.otp_sent"));
    } catch (err: any) {
      toast.error(err.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const verifyData: any = { token: otp, type: method === "email" ? "email" : "sms" };
      if (method === "email") verifyData.email = email;
      else verifyData.phone = phone;

      const { error } = await supabase.auth.verifyOtp(verifyData);
      if (error) throw error;
      redirectAfterLogin();
    } catch (err: any) {
      toast.error(err.message || t("auth.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "otp" && mode === "login") {
      if (!otpSent) return handleSendOtp();
      return handleVerifyOtp();
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const signUpData: any = {
          password,
          options: {
            data: { display_name: displayName || "User", gender },
            emailRedirectTo: window.location.origin,
          },
        };
        if (method === "email") signUpData.email = email;
        else signUpData.phone = phone;

        const { error } = await supabase.auth.signUp(signUpData);
        if (error) throw error;
        toast.success(t("auth.signup_success"));
      } else {
        const credentials: any = { password };
        if (method === "email") credentials.email = email;
        else credentials.phone = phone;

        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;

        try {
          const { data: fnData } = await supabase.functions.invoke("detect-country");
          if (fnData?.country_code) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("profiles").update({ country_code: fnData.country_code }).eq("id", user.id);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden" dir={dir}>
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Language toggle */}
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
          <img src={novaLogo} alt="NOVA" className="w-40 h-auto" />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-full bg-secondary/50 p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setOtpSent(false); }}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "login" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1" /> {t("auth.login")}
          </button>
          <button
            onClick={() => { setMode("signup"); setOtpSent(false); }}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "signup" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1" /> {t("auth.signup")}
          </button>
        </div>

        {/* Method toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMethod("email"); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "email" ? "border-primary text-primary glow-neon" : "border-border text-muted-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5 inline mr-1" /> {t("auth.email")}
          </button>
          <button
            onClick={() => { setMethod("phone"); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "phone" ? "border-primary text-primary glow-neon" : "border-border text-muted-foreground"
            }`}
          >
            <Phone className="w-3.5 h-3.5 inline mr-1" /> {t("auth.phone")}
          </button>
        </div>

        {/* OTP / Password toggle (login only) */}
        {mode === "login" && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => { setAuthMode(authMode === "password" ? "otp" : "password"); setOtpSent(false); }}
              className="text-[11px] text-primary underline underline-offset-2"
            >
              {authMode === "password" ? t("auth.use_otp") : t("auth.use_password")}
            </button>
          </div>
        )}

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

          {method === "email" ? (
            <input
              type="email"
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
            />
          ) : (
            <input
              type="tel"
              placeholder="+201XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
              dir="ltr"
            />
          )}

          {/* Password field (signup or password login) */}
          {(mode === "signup" || authMode === "password") && (
            <input
              type="password"
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
              minLength={6}
            />
          )}

          {/* OTP field */}
          {authMode === "otp" && mode === "login" && otpSent && (
            <input
              type="text"
              placeholder={t("auth.otp_placeholder")}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
              maxLength={6}
              dir="ltr"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full gradient-neon font-bold text-primary-foreground btn-nova glow-neon disabled:opacity-50"
          >
            {loading
              ? t("auth.loading")
              : mode === "signup"
                ? t("auth.signup_btn")
                : authMode === "otp" && !otpSent
                  ? t("auth.use_otp")
                  : authMode === "otp" && otpSent
                    ? t("auth.verify_otp")
                    : t("auth.login_btn")}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
