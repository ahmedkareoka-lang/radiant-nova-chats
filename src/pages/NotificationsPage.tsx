import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Bell, CheckCheck, Check, X, Gift, Wallet, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import EmptyState from "@/components/EmptyState";
import VerifiedBadge from "@/components/VerifiedBadge";

type Stream = "all" | "gifts" | "recharge";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [stream, setStream] = useState<Stream>("all");
  const [boss, setBoss] = useState<{ id: string; display_name: string; avatar_url: string | null } | null>(null);

  // Load NOVA OFFICIAL (BOSS) so notifications carry official branding & link to its profile.
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

  const getIcon = (type: string) => {
    switch (type) {
      case "gift": return "🎁";
      case "agency": return "🏢";
      case "agency_invite": return "📨";
      case "purchase":
      case "recharge": return "💰";
      case "system": return "⚙️";
      default: return "🔔";
    }
  };

  const isGiftType = (t: string) => t === "gift";
  const isRechargeType = (t: string) => t === "purchase" || t === "recharge" || t === "topup";

  const filtered = useMemo(() => {
    if (stream === "gifts") return notifications.filter((n) => isGiftType(n.type));
    if (stream === "recharge") return notifications.filter((n) => isRechargeType(n.type));
    return notifications;
  }, [notifications, stream]);

  const counts = useMemo(() => ({
    all: notifications.length,
    gifts: notifications.filter((n) => isGiftType(n.type)).length,
    recharge: notifications.filter((n) => isRechargeType(n.type)).length,
  }), [notifications]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
  };

  const goToOfficialProfile = () => {
    if (boss?.id) navigate(`/user?id=${boss.id}`);
  };

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.type === "agency_invite") return;
    // Open chat-like view with NOVA OFFICIAL containing all notifications
    navigate(`/notifications/chat`);
  };

  const handleInviteAction = async (notifId: string, action: "accept" | "reject") => {
    setProcessingInvite(notifId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invite } = await supabase
        .from("agency_invites")
        .select("*")
        .eq("target_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!invite) {
        toast.error("لم يتم العثور على الدعوة");
        setProcessingInvite(null);
        return;
      }

      if (action === "accept") {
        const { error } = await supabase.rpc("accept_agency_invite", {
          _invite_id: invite.id,
          _user_id: user.id,
        });
        if (error) {
          toast.error("فشل في قبول الدعوة: " + error.message);
        } else {
          toast.success("تم قبول الدعوة! أنت الآن مضيف 🎤");
          await supabase.from("notifications").insert({
            user_id: invite.agent_id,
            title: "تم قبول الدعوة ✅",
            message: "قبل المستخدم دعوتك للانضمام كمضيف في وكالتك",
            type: "agency",
          });
        }
      } else {
        await supabase.from("agency_invites").update({ status: "rejected" }).eq("id", invite.id);
        toast.info("تم رفض الدعوة");
        await supabase.from("notifications").insert({
          user_id: invite.agent_id,
          title: "تم رفض الدعوة ❌",
          message: "رفض المستخدم دعوتك للانضمام كمضيف",
          type: "agency",
        });
      }

      markAsRead(notifId);
    } catch (err) {
      toast.error("حدث خطأ");
    }
    setProcessingInvite(null);
  };

  const officialName = boss?.display_name || "NOVA OFFICIAL";
  const officialAvatar = boss?.avatar_url || "/placeholder.svg";

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} aria-label="back"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">الإشعارات</h1>
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">{unreadCount}</span>
            )}
            <button onClick={markAllRead} className="ml-auto text-xs text-primary font-bold flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
            </button>
          </div>

          {/* Official sender header */}
          <button
            onClick={goToOfficialProfile}
            className="w-full max-w-lg mx-auto flex items-center gap-3 px-4 py-2 border-t border-border/40 bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-blue-500/10 hover:bg-primary/10 transition"
          >
            <img
              src={officialAvatar}
              alt={officialName}
              className="w-9 h-9 rounded-full object-cover border-2 border-blue-400/70 shadow-[0_0_12px_rgba(59,130,246,0.45)]"
            />
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <VerifiedBadge size={14} />
                <span className="text-sm font-black bg-gradient-to-r from-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
                  {officialName}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">الحساب الرسمي · جميع الإشعارات صادرة عنه</p>
            </div>
            <MessageSquare className="w-4 h-4 text-primary" />
          </button>

          {/* Stream tabs */}
          <div className="max-w-lg mx-auto px-3 pb-2 flex gap-2">
            {([
              { id: "all", label: "الكل", icon: Bell, count: counts.all },
              { id: "gifts", label: "الهدايا", icon: Gift, count: counts.gifts },
              { id: "recharge", label: "الشحن", icon: Wallet, count: counts.recharge },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setStream(t.id as Stream)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                  stream === t.id
                    ? "gradient-neon text-primary-foreground shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    : "bg-secondary/40 text-muted-foreground"
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
                <span className="text-[9px] opacity-80">({t.count})</span>
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-2 max-w-lg mx-auto">
          {filtered.length === 0 ? (
            <EmptyState icon="🔔" title="لا توجد إشعارات" subtitle="ستظهر هنا التنبيهات الجديدة" />
          ) : (
            <div className="space-y-1.5">
              {filtered.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-right p-3 rounded-2xl transition-all cursor-pointer hover:bg-primary/10 ${
                    n.is_read ? "bg-secondary/30" : "bg-primary/5 border border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Official avatar (always NOVA OFFICIAL) */}
                    {/* Official avatar (always NOVA OFFICIAL) — click goes to profile */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goToOfficialProfile(); }}
                      className="relative shrink-0"
                      aria-label="فتح حساب الإدارة"
                    >
                      <img
                        src={officialAvatar}
                        alt={officialName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-blue-400/60"
                      />
                      <span className="absolute -bottom-1 -right-1 text-base">{getIcon(n.type)}</span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[11px] font-bold text-blue-300 truncate">{officialName}</span>
                          <VerifiedBadge size={11} />
                        </div>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className={`text-sm font-bold mt-0.5 truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>

                      {n.type === "agency_invite" && !n.is_read && (
                        <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleInviteAction(n.id, "accept")}
                            disabled={processingInvite === n.id}
                            className="flex-1 py-1.5 rounded-xl text-xs font-bold gradient-neon text-primary-foreground flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" /> قبول
                          </button>
                          <button
                            onClick={() => handleInviteAction(n.id, "reject")}
                            disabled={processingInvite === n.id}
                            className="flex-1 py-1.5 rounded-xl text-xs font-bold border border-destructive/30 text-destructive flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" /> رفض
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default NotificationsPage;
