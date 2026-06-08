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

  // 🚫 منع الوصول غير المصرح به
  if (requireAuth && !session) {
    const redirect = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.href = `/auth?redirect=${redirect}`;
    return null;
  }

  return <>{children}</>;
});

export default AuthGate;
