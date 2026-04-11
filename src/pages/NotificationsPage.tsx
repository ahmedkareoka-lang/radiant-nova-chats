import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Check, CheckCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case "gift": return "🎁";
      case "agency": return "🏢";
      case "agency_invite": return "📨";
      case "purchase": return "🛍️";
      case "system": return "⚙️";
      default: return "🔔";
    }
  };

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

  const handleInviteAction = async (notifId: string, action: "accept" | "reject") => {
    setProcessingInvite(notifId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the pending invite for this user
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
          // Notify agent
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

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">الإشعارات</h1>
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">{unreadCount}</span>
            )}
            <button onClick={markAllRead} className="ml-auto text-xs text-primary font-bold flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
            </button>
          </div>
        </header>

        <main className="px-4 py-2 max-w-lg mx-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={`w-full text-right p-3 rounded-2xl transition-all ${
                    n.is_read ? "bg-secondary/30" : "bg-primary/5 border border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>

                      {/* Agency Invite Actions */}
                      {n.type === "agency_invite" && !n.is_read && (
                        <div className="flex gap-2 mt-2">
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
