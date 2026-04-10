import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Check, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case "gift": return "🎁";
      case "agency": return "🏢";
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
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={`w-full text-right p-3 rounded-2xl transition-all flex items-start gap-3 ${
                    n.is_read ? "bg-secondary/30" : "bg-primary/5 border border-primary/20"
                  }`}
                >
                  <span className="text-2xl mt-0.5">{getIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </button>
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
