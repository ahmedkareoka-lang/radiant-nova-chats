import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RoomMember {
  id: string;
  user_id: string;
  is_on_mic: boolean;
  mic_slot: number | null;
  profile?: {
    display_name: string;
    avatar_url: string | null;
    vip_level: number;
    is_boss: boolean;
    user_id: string;
    wealth_level?: number;
    wealth_xp?: number;
    charisma_level?: number;
    charisma_xp?: number;
  };
}

export interface RoomMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    display_name: string;
    vip_level: number;
    is_boss: boolean;
  };
}

export const useVoiceRoom = (roomId: string | null) => {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", roomId);

    if (data && data.length > 0) {
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame")
        .in("id", userIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => { profileMap[p.id] = p; });

      setMembers(data.map((m) => ({
        ...m,
        profile: profileMap[m.user_id] || null,
      })));
    } else {
      setMembers([]);
    }
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, vip_level, is_boss")
        .in("id", senderIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => { profileMap[p.id] = p; });

      setMessages(data.map((m) => ({
        ...m,
        sender: profileMap[m.sender_id] || null,
      })));
    } else {
      setMessages([]);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      // Fetch room info
      const { data: room } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (room) {
        // Fetch host profile separately
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame")
          .eq("id", room.host_id)
          .single();

        setRoomData({
          ...room,
          host_profile: hostProfile || null,
        });
      }

      fetchMembers();
      fetchMessages();
    };

    init();

    const channel = supabase
      .channel(`room-${roomId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, () => {
        fetchMembers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchMembers, fetchMessages]);

  const joinRoom = async () => {
    if (!roomId || !currentUserId) return;
    // Clear any existing mic_slot to prevent duplicates
    await supabase.from("room_members").upsert({
      room_id: roomId,
      user_id: currentUserId,
      mic_slot: null,
      is_on_mic: false,
    });
  };

  const leaveRoom = async () => {
    if (!roomId || !currentUserId) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", currentUserId);

    // If user is the host, deactivate the room
    if (roomData?.host_id === currentUserId) {
      await supabase.from("rooms").update({ is_active: false }).eq("id", roomId);
      // Remove all remaining members
      await supabase.from("room_members").delete().eq("room_id", roomId);
    }
  };

  const sendMessage = async (content: string) => {
    if (!roomId || !currentUserId || !content.trim()) return;
    await supabase.from("messages").insert({
      sender_id: currentUserId,
      room_id: roomId,
      content: content.trim(),
    });
  };

  const toggleMic = async (on: boolean) => {
    if (!roomId || !currentUserId) return;
    await supabase.from("room_members").update({ is_on_mic: on }).eq("room_id", roomId).eq("user_id", currentUserId);
  };

  return { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic };
};
