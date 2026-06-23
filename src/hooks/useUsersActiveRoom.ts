import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveRoomInfo {
  roomId: string;
  roomName: string;
  roomCover: string | null;
}

// Returns a map: userId -> active room (if the user is currently sitting in a room).
// "Active" = present in room_members. Rows are deleted on leave, so presence is truth.

export function useUsersActiveRoom(userIds: (string | null | undefined)[]) {
  const [map, setMap] = useState<Record<string, ActiveRoomInfo>>({});

  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  const key = ids.sort().join(",");

  useEffect(() => {
    if (!ids.length) {
      setMap({});
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data: members } = await supabase
        .from("room_members")
        .select("user_id, room_id, joined_at")
        .in("user_id", ids);
      if (!members || cancelled) return;

      const now = Date.now();
      const fresh = members.filter(
        (m) => now - new Date(m.joined_at as any).getTime() < FRESH_MS,
      );
      const roomIds = Array.from(new Set(fresh.map((m) => m.room_id)));
      if (!roomIds.length) {
        setMap({});
        return;
      }

      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, name, cover_url")
        .in("id", roomIds);

      const roomById: Record<string, { name: string; cover: string | null }> = {};
      rooms?.forEach((r: any) => {
        roomById[r.id] = { name: r.name, cover: r.cover_url ?? null };
      });

      const next: Record<string, ActiveRoomInfo> = {};
      for (const m of fresh) {
        const r = roomById[m.room_id];
        if (!r) continue;
        next[m.user_id] = {
          roomId: m.room_id,
          roomName: r.name,
          roomCover: r.cover,
        };
      }
      if (!cancelled) setMap(next);
    };

    load();
    const interval = setInterval(load, 30_000);

    const channel = supabase
      .channel(`users-active-room-${key.slice(0, 32)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return map;
}

export function useUserActiveRoom(userId: string | null | undefined) {
  const map = useUsersActiveRoom([userId]);
  return userId ? map[userId] ?? null : null;
}
