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
      .select("*, profile:profiles!room_members_user_id_profiles_fkey(display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp)")
      .eq("room_id", roomId);
    if (data) {
      setMembers(data.map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      })));
    }
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_profiles_fkey(display_name, vip_level, is_boss)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) {
      setMessages(data.map((m) => ({
        ...m,
        sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
      })));
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
      .select("*, host_profile:profiles!rooms_host_id_profiles_fkey(display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp)")
      .eq("id", roomId)
        .single();
      if (room) {
        setRoomData({
          ...room,
          host_profile: Array.isArray(room.host_profile) ? room.host_profile[0] : room.host_profile,
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, (payload) => {
        // Fetch the new message with sender info
        supabase
          .from("messages")
          .select("*, sender:profiles!messages_sender_id_fkey(display_name, vip_level, is_boss)")
          .select("*, sender:profiles!messages_sender_id_profiles_fkey(display_name, vip_level, is_boss)")
          .single()
          .then(({ data }) => {
            if (data) {
              setMessages((prev) => [...prev, {
                ...data,
                sender: Array.isArray(data.sender) ? data.sender[0] : data.sender,
              }]);
            }
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchMembers, fetchMessages]);

  const joinRoom = async () => {
    if (!roomId || !currentUserId) return;
    await supabase.from("room_members").upsert({
      room_id: roomId,
      user_id: currentUserId,
    });
  };

  const leaveRoom = async () => {
    if (!roomId || !currentUserId) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", currentUserId);
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
