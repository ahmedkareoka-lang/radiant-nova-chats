import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import novaLogo from "@/assets/nova-logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const signUpData: any = {
          password,
          options: {
            data: { display_name: displayName || "User" },
            emailRedirectTo: window.location.origin,
          },
        };

        if (method === "email") {
          signUpData.email = email;
        } else {
          signUpData.phone = phone;
        }

        const { error } = await supabase.auth.signUp(signUpData);
        if (error) throw error;
        toast.success("تم التسجيل بنجاح! تحقق من بريدك الإلكتروني للتأكيد.");
      } else {
        const credentials: any = { password };
        if (method === "email") {
          credentials.email = email;
        } else {
          credentials.phone = phone;
        }

        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={novaLogo} alt="NOVA" className="w-40 h-auto" />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-full bg-secondary/50 p-1 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "login" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-1" /> دخول
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
              mode === "signup" ? "gradient-neon text-primary-foreground glow-neon" : "text-muted-foreground"
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1" /> تسجيل
          </button>
        </div>

        {/* Method toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMethod("email")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "email"
                ? "border-primary text-primary glow-neon"
                : "border-border text-muted-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5 inline mr-1" /> البريد
          </button>
          <button
            onClick={() => setMethod("phone")}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold border transition-all ${
              method === "phone"
                ? "border-primary text-primary glow-neon"
                : "border-border text-muted-foreground"
            }`}
          >
            <Phone className="w-3.5 h-3.5 inline mr-1" /> الهاتف
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="الاسم"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
              required
            />
          )}

          {method === "email" ? (
            <input
              type="email"
              placeholder="البريد الإلكتروني"
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
            />
          )}

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-secondary/50 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 border border-border"
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full gradient-neon font-bold text-primary-foreground btn-nova glow-neon disabled:opacity-50"
          >
            {loading ? "جارٍ..." : mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
