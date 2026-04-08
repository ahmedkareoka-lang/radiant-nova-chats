import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePresence = () => {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    let userId: string | null = null;

    const setupPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Upsert presence
      await supabase.from("user_presence").upsert({
        user_id: user.id,
        is_online: true,
        last_seen: new Date().toISOString(),
      });

      // Fetch current online users
      const { data } = await supabase
        .from("user_presence")
        .select("user_id")
        .eq("is_online", true);
      if (data) setOnlineUsers(data.map((u) => u.user_id));
    };

    setupPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const record = payload.new as { user_id: string; is_online: boolean };
            setOnlineUsers((prev) => {
              if (record.is_online) {
                return prev.includes(record.user_id) ? prev : [...prev, record.user_id];
              }
              return prev.filter((id) => id !== record.user_id);
            });
          }
        }
      )
      .subscribe();

    // Set offline on page unload
    const handleUnload = () => {
      if (userId) {
        navigator.sendBeacon && supabase.from("user_presence").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (userId) {
        supabase.from("user_presence").update({
          is_online: false,
          last_seen: new Date().toISOString(),
        }).eq("user_id", userId);
      }
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineUsers };
};
