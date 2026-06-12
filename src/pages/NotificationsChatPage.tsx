import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import PageTransition from "@/components/PageTransition";
import VerifiedBadge from "@/components/VerifiedBadge";

const NotificationsChatPage = () => {
  const navigate = useNavigate();
  const { notifications, markAllRead } = useNotifications();
  const [boss, setBoss] = useState<{ id: string; display_name: string; avatar_url: string | null } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("is_boss", true)
        .limit(1)
        .maybeSingle();
      if (data) setBoss(data);
    })();
  }, []);

  useEffect(() => {
    markAllRead();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notifications.length]);

  const officialName = boss?.display_name || "NOVA OFFICIAL";
  const officialAvatar = boss?.avatar_url || "/placeholder.svg";

  const goProfile = () => {
    if (boss?.id) navigate(`/user?id=${boss.id}`);
  };

  // oldest -> newest like a chat
  const messages = useMemo(
    () => [...notifications].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [notifications],
  );

  const fmtTime = (s: string) => {
    const d = new Date(s);
    return d.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  };

  const iconFor = (t: string) => {
    switch (t) {
      case "gift": return "🎁";
      case "agency":
      case "agency_invite": return "🏢";
      case "purchase":
      case "recharge":
      case "topup": return "💰";
      case "system": return "⚙️";
      default: return "🔔";
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col bg-background">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} aria-label="back">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={goProfile} className="flex items-center gap-2.5 flex-1 text-right">
              <img
                src={officialAvatar}
                alt={officialName}
                className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/70 shadow-[0_0_12px_rgba(59,130,246,0.45)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black bg-gradient-to-r from-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
                    {officialName}
                  </span>
                  <VerifiedBadge size={14} />
                </div>
                <p className="text-[10px] text-muted-foreground">الإدارة الرسمية · اضغط لفتح الحساب</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-4 max-w-lg mx-auto w-full">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground mt-20">لا توجد إشعارات بعد</div>
          ) : (
            <div className="space-y-3" dir="ltr">
              {messages.map((n: any) => (
                <div key={n.id} className="flex items-end gap-2 justify-start">
                  <button
                    onClick={goProfile}
                    className="shrink-0 w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-400/50"
                    aria-label="عرض الحساب"
                  >
                    <img src={officialAvatar} alt={officialName} className="w-full h-full object-cover" />
                  </button>
                  <div className="max-w-[78%] bg-secondary/90 text-foreground rounded-2xl rounded-bl-md border border-border/40 shadow-lg px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1" dir="rtl">
                      <span className="text-[11px] font-bold text-blue-300">{officialName}</span>
                      <VerifiedBadge size={11} />
                    </div>
                    <p className="text-sm font-bold flex items-center gap-1.5" dir="rtl">
                      <span>{iconFor(n.type)}</span>
                      <span>{n.title}</span>
                    </p>
                    {n.message && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap" dir="rtl">{n.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1 text-left">{fmtTime(n.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default NotificationsChatPage;
