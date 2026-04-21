import { useEffect, useState, useCallback, useRef } from "react";
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
    equipped_frame?: string | null;
    entrance_video_url?: string | null;
    entrance_audio_url?: string | null;
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

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const useVoiceRoom = (roomId: string | null) => {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(roomId);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

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
        .select("id, display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame, entrance_video_url, entrance_audio_url, equipped_entrance_effect")
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

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (room) {
      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame, entrance_video_url, entrance_audio_url, equipped_entrance_effect")
        .eq("id", room.host_id)
        .single();

      setRoomData({
        ...room,
        host_profile: hostProfile || null,
      });
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      await fetchRoomData();
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, () => {
        fetchRoomData();
      })
      .subscribe();

    // Cleanup function using refs to avoid stale closures
    const cleanupMember = async () => {
      const uid = currentUserIdRef.current;
      const rid = roomIdRef.current;
      if (uid && rid) {
        await supabase.from("room_members").delete().eq("room_id", rid).eq("user_id", uid);
      }
    };

    const handleUnload = () => {
      const uid = currentUserIdRef.current;
      const rid = roomIdRef.current;
      if (uid && rid) {
        // Use fetch with keepalive as sendBeacon alternative for DELETE
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/room_members?room_id=eq.${rid}&user_id=eq.${uid}`;
        fetch(url, {
          method: 'DELETE',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${(supabase as any).auth.session?.()?.access_token || ''}`,
            'Content-Type': 'application/json',
          },
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Don't remove immediately on visibility change, heartbeat will handle stale users
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Heartbeat: update joined_at periodically to show user is still active
    // Also increment mic_hours for agency hosts who are on mic
    let heartbeatTickCount = 0;
    heartbeatRef.current = setInterval(async () => {
      const uid = currentUserIdRef.current;
      const rid = roomIdRef.current;
      if (uid && rid) {
        await supabase
          .from("room_members")
          .update({ joined_at: new Date().toISOString() })
          .eq("room_id", rid)
          .eq("user_id", uid);

        // Daily task: increment room_minutes every 2 ticks (= 1 minute)
        heartbeatTickCount += 1;
        if (heartbeatTickCount % 2 === 0) {
          supabase.rpc("increment_daily_task", {
            _user_id: uid,
            _task_type: "room",
            _amount: 1,
          });
        }

        // Check if user is on mic and is an agency host, then increment mic_hours
        const currentMember = members.find(m => m.user_id === uid);
        if (currentMember?.is_on_mic) {
          const hoursIncrement = HEARTBEAT_INTERVAL / 3600000; // convert ms to hours
          const { data: membership } = await supabase
            .from("agency_members")
            .select("id, mic_hours")
            .eq("user_id", uid)
            .single();
          if (membership) {
            await supabase
              .from("agency_members")
              .update({ mic_hours: (Number(membership.mic_hours) || 0) + hoursIncrement })
              .eq("id", membership.id);
          }
        }
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchMembers, fetchMessages, fetchRoomData]);

  const joinRoom = async () => {
    if (!roomId || !currentUserId) return;
    // Upsert ensures one entry per user per room (unique constraint)
    await supabase.from("room_members").upsert(
      {
        room_id: roomId,
        user_id: currentUserId,
        mic_slot: null,
        is_on_mic: false,
      },
      { onConflict: "room_id,user_id" }
    );
  };

  const leaveRoom = async () => {
    if (!roomId || !currentUserId) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", currentUserId);

    // If user is the host, deactivate the room
    if (roomData?.host_id === currentUserId) {
      await supabase.from("rooms").update({ is_active: false }).eq("id", roomId);
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

  const updateMicSlot = async (slot: number | null, isOnMic: boolean) => {
    if (!roomId || !currentUserId) return;
    // Optimistic update
    setMembers(prev => prev.map(m =>
      m.user_id === currentUserId ? { ...m, mic_slot: slot, is_on_mic: isOnMic } : m
    ));
    const { error } = await supabase
      .from("room_members")
      .update({ mic_slot: slot, is_on_mic: isOnMic })
      .eq("room_id", roomId)
      .eq("user_id", currentUserId);
    if (error) {
      // Revert on error
      fetchMembers();
    }
  };

  return { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic, updateMicSlot, fetchMembers };
};
