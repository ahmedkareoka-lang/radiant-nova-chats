import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FollowedRoomRow {
  id: string;
  room_id: string;
  status: "pending" | "approved";
  created_at: string;
  room?: any;
}

/** Hook to manage the current user's room follows. */
export const useRoomFollows = () => {
  const [followed, setFollowed] = useState<FollowedRoomRow[]>([]);
  const [pending, setPending] = useState<FollowedRoomRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setFollowed([]); setPending([]); setLoading(false); return; }
    const { data } = await (supabase.from("room_follows" as any) as any)
      .select("*")
      .eq("user_id", user.id);
    const rows = (data || []) as FollowedRoomRow[];
    setFollowed(rows.filter(r => r.status === "approved"));
    setPending(rows.filter(r => r.status === "pending"));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`room-follows-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_follows" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const follow = useCallback(async (roomId: string) => {
    const { data, error } = await (supabase.rpc as any)("request_room_follow", { _room_id: roomId });
    if (error) throw error;
    await refresh();
    return data as "pending" | "approved";
  }, [refresh]);

  const unfollow = useCallback(async (roomId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from("room_follows" as any) as any)
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", user.id);
    await refresh();
  }, [refresh]);

  return { followed, pending, loading, follow, unfollow, refresh };
};
