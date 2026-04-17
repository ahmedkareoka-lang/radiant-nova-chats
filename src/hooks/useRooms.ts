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
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Get host profiles separately
      const hostIds = [...new Set(data.map((r) => r.host_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, vip_level, is_boss")
        .in("id", hostIds.length > 0 ? hostIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => { profileMap[p.id] = p; });

      // Get member counts
      const roomIds = data.map((r) => r.id);
      const { data: members } = await supabase
        .from("room_members")
        .select("room_id")
        .in("room_id", roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"]);

      const counts: Record<string, number> = {};
      members?.forEach((m) => {
        counts[m.room_id] = (counts[m.room_id] || 0) + 1;
      });

      setRooms(
        data.map((r) => ({
          ...r,
          host_profile: profileMap[r.host_id] || null,
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

    // Enforce one room per host: deactivate any existing active rooms first
    await supabase.from("rooms").update({ is_active: false }).eq("host_id", user.id).eq("is_active", true);
    // Clean leftover memberships
    const { data: oldRooms } = await supabase.from("rooms").select("id").eq("host_id", user.id).eq("is_active", false);
    if (oldRooms && oldRooms.length > 0) {
      await supabase.from("room_members").delete().in("room_id", oldRooms.map(r => r.id));
    }

    const { data, error } = await supabase.from("rooms").insert({
      name,
      type,
      host_id: user.id,
      is_private: isPrivate,
      password: isPrivate ? password : null,
      mic_count: micCount,
    }).select().single();

    if (!error && data) {
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
