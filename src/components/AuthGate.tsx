import { useEffect, useRef, useState, memo } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { isTelegramMiniApp, getTelegramInitData } from "@/lib/telegramWebApp";

interface AuthGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  onAuthChange?: (session: Session | null) => void;
}

export const AuthGate = memo(function AuthGate({
  children,
  requireAuth = true,
  onAuthChange,
}: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tgAttempted, setTgAttempted] = useState(false);
  const tgTriedRef = useRef(false);
  const queryClient = useQueryClient();

  // ✅ تحميل الجلسة الأولية + الاستماع لتغييرات المصادقة
  useEffect(() => {
    let mounted = true;

    const applySavedRedirect = (s: Session | null) => {
      if (!s) return;
      try {
        const saved = sessionStorage.getItem("nova-redirect-after-login");
        if (!saved) return;
        const here = window.location.pathname + window.location.search;
        if (saved === here) return;
        // Only same-origin relative paths
        if (!saved.startsWith("/") || saved.startsWith("//")) return;
        sessionStorage.removeItem("nova-redirect-after-login");
        window.location.replace(saved);
      } catch {}
    };

    // ⚠️ ALWAYS set up listener BEFORE getSession to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (import.meta.env.DEV) {
        console.log(`🔄 Auth event: ${event}`);
      }

      setSession(newSession);
      onAuthChange?.(newSession);
      if (event === "SIGNED_IN") applySavedRedirect(newSession);

      // 🗑️ مسح الكاش عند تسجيل الخروج لمنع تسرب البيانات
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }

      // 🔄 تحديث بيانات المستخدم عند تسجيل الدخول
      if (event === "SIGNED_IN" && newSession) {
        queryClient.invalidateQueries({
          queryKey: ["user"],
          refetchType: "active",
        });
      }
    });

    // ثم تحميل الجلسة الحالية
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        if (!mounted) return;
        setSession(initialSession);
        onAuthChange?.(initialSession);
        applySavedRedirect(initialSession);
      })
      .catch((error) => {
        console.error("❌ Auth initialization failed:", error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient, onAuthChange]);

  // 🎯 شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // 🚀 Auto-login via Telegram Mini App initData (no manual button)
  if (requireAuth && !session && isTelegramMiniApp() && !tgAttempted) {
    if (!tgTriedRef.current) {
      tgTriedRef.current = true;
      (async () => {
        try {
          const initData = getTelegramInitData();
          if (!initData) {
            setTgAttempted(true);
            return;
          }
          const { data, error } = await supabase.functions.invoke("telegram-auth", {
            body: { initData },
          });
          if (error || !data?.email || !data?.password) {
            console.warn("[AuthGate] tg auto-login failed", error || data);
            setTgAttempted(true);
            return;
          }
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          if (signInErr) console.warn("[AuthGate] tg signIn err", signInErr);
        } catch (e) {
          console.warn("[AuthGate] tg auto-login error", e);
        } finally {
          setTgAttempted(true);
        }
      })();
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // 🚫 منع الوصول غير المصرح به
  if (requireAuth && !session) {
    try {
      sessionStorage.setItem(
        "nova-redirect-after-login",
        window.location.pathname + window.location.search,
      );
    } catch {}
    window.location.href = `/login`;
    return null;
  }

  return <>{children}</>;
});

export default AuthGate;
