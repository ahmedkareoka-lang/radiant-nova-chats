import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Room {
  id: string;
  name: string;
  type: string;
  host_id: string;
  is_private: boolean;
  mic_count: number;
  is_active: boolean;
  created_at: string;
  host_profile?: {
    display_name: string;
    avatar_url: string | null;
    vip_level: number;
    is_boss: boolean;
  };
  member_count?: number;
}

export const useRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*, host_profile:profiles!rooms_host_id_profiles_fkey(display_name, avatar_url, vip_level, is_boss)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Get member counts
      const roomIds = data.map((r) => r.id);
      const { data: members } = await supabase
        .from("room_members")
        .select("room_id")
        .in("room_id", roomIds);

      const counts: Record<string, number> = {};
      members?.forEach((m) => {
        counts[m.room_id] = (counts[m.room_id] || 0) + 1;
      });

      setRooms(
        data.map((r) => ({
          ...r,
          host_profile: Array.isArray(r.host_profile) ? r.host_profile[0] : r.host_profile,
          member_count: counts[r.id] || 0,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel(`rooms-realtime-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
        fetchRooms();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members" }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const createRoom = async (name: string, type: string, isPrivate: boolean, password: string, micCount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.from("rooms").insert({
      name,
      type,
      host_id: user.id,
      is_private: isPrivate,
      password: isPrivate ? password : null,
      mic_count: micCount,
    }).select().single();

    if (!error && data) {
      // Host auto-joins
      await supabase.from("room_members").insert({
        room_id: data.id,
        user_id: user.id,
        is_on_mic: true,
        mic_slot: 0,
      });
      return data;
    }
    return null;
  };

  return { rooms, loading, createRoom, refetch: fetchRooms };
};
