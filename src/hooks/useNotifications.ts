import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playGiftSound } from "@/lib/effects";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let userId: string;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: any) => !n.is_read).length);

      channel = supabase
        .channel(`notifications-rt-${user.id}-${Date.now()}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        }, (payload) => {
          const newNotif = payload.new as any;
          if (newNotif.user_id === userId) {
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            playGiftSound();
          }
        })
        .subscribe();
    };
    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllRead };
};
