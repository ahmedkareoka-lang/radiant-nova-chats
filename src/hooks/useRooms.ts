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
  mic_previews?: Array<{ user_id: string; profiles?: { avatar_url: string | null; display_name: string } | null }>;
  hot_score?: number;
  background_theme?: string;
  room_image?: string | null;
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

      // Fetch up to 3 mic members per room for preview avatars (Soulmatch-style)
      const { data: micMembers } = await supabase
        .from("room_members")
        .select("room_id, user_id, mic_slot, profiles:user_id(avatar_url, display_name)")
        .in("room_id", roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("is_on_mic", true)
        .order("mic_slot", { ascending: true });

      const micMap: Record<string, any[]> = {};
      micMembers?.forEach((m: any) => {
        if (!micMap[m.room_id]) micMap[m.room_id] = [];
        if (micMap[m.room_id].length < 3) micMap[m.room_id].push(m);
      });

      // Fetch hot rooms based on last hour gifts received by host
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: hotGifts } = await supabase
        .from("gift_transactions")
        .select("receiver_id, gold_amount")
        .gte("created_at", oneHourAgo);
      const hotMap: Record<string, number> = {};
      hotGifts?.forEach((g: any) => {
        hotMap[g.receiver_id] = (hotMap[g.receiver_id] || 0) + Number(g.gold_amount || 0);
      });

      setRooms(
        data.map((r) => ({
          ...r,
          host_profile: profileMap[r.host_id] || null,
          member_count: counts[r.id] || 0,
          mic_previews: micMap[r.id] || [],
          hot_score: hotMap[r.host_id] || 0,
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

    // Rooms are permanent: re-use the host's existing room if it exists.
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Update settings + reactivate, keep all stats/history intact
      const { data: updated } = await supabase
        .from("rooms")
        .update({
          name,
          type,
          is_private: isPrivate,
          password: isPrivate ? password : null,
          mic_count: micCount,
          is_active: true,
        })
        .eq("id", existing.id)
        .select()
        .single();

      // Ensure host is on mic seat 0
      await supabase.from("room_members").upsert(
        { room_id: existing.id, user_id: user.id, is_on_mic: true, mic_slot: 0 },
        { onConflict: "room_id,user_id" }
      );
      return updated;
    }

    // First-time creation
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
