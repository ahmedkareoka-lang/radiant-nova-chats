import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the active room owned by the current user (if any).
 * Used by the "My Room" button on the profile page to either
 * navigate to the user's existing room or to the create-room flow.
 */
export const useMyRoom = (userId: string | null) => {
  const [myRoomId, setMyRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;

    const fetchMyRoom = async () => {
      // Rooms are permanent — fetch the host's room regardless of is_active.
      // If the room was auto-deactivated, also reactivate it so the host can re-enter.
      const { data } = await supabase
        .from("rooms")
        .select("id, is_active")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (data && !data.is_active) {
        await supabase.from("rooms").update({ is_active: true }).eq("id", data.id);
      }
      setMyRoomId(data?.id ?? null);
      setLoading(false);
    };

    fetchMyRoom();

    const channel = supabase
      .channel(`my-room-${userId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `host_id=eq.${userId}` },
        () => fetchMyRoom()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { myRoomId, loading };
};
