import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createRealtimeBatcher, type RealtimeBatcher } from "@/lib/realtimeBatcher";
import { recordLatency } from "@/lib/perfMetrics";
import { applyDisplayedVip } from "@/lib/vipDisplay";

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

// 🚀 Tighter cycle for sub-second responsiveness without overloading the DB.
// Server cleanup still runs at 90s/3min — we just refresh more often locally.
const HEARTBEAT_INTERVAL = 15_000; // 15s heartbeat (was 25s)
const STALE_MIC_MS = 60_000;       // drop from mic after 60s of silence (was 90s)
const STALE_MEMBER_MS = 150_000;   // hide member after 2.5min (was 3min)
const STALE_SWEEP_INTERVAL = 15_000; // re-evaluate stale members every 15s (was 30s)

export const useVoiceRoom = (roomId: string | null) => {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [roomData, setRoomData] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string | null>(roomId);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  // 🧹 Per-session chat cutoff — messages older than this are hidden for the
  // current user only. Reset every time they enter (or re-enter) the room.
  const sessionStartRef = useRef<number>(Date.now());


  // 🚀 Performance: micro-cache + in-flight dedup + abort for fetchMembers
  const membersCacheRef = useRef<{ ts: number; data: RoomMember[] } | null>(null);
  const membersInflightRef = useRef<Promise<void> | null>(null);
  const membersAbortRef = useRef<AbortController | null>(null);
  const MEMBERS_CACHE_TTL = 1500; // 1.5s — shorter than sweep, longer than burst clicks

  // 🚀 Heartbeat queue: coalesce rapid triggers (visibility, focus, manual)
  const heartbeatInflightRef = useRef<Promise<void> | null>(null);
  const heartbeatLastAtRef = useRef<number>(0);
  const HEARTBEAT_MIN_GAP = 2000; // ignore extra calls within 2s of last beat

  // Keep refs in sync
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const fetchMembers = useCallback(async (force = false) => {
    if (!roomId) return;

    // 🚀 Serve from micro-cache when fresh enough (and not forced)
    const cached = membersCacheRef.current;
    if (!force && cached && Date.now() - cached.ts < MEMBERS_CACHE_TTL) {
      setMembers(cached.data);
      return;
    }

    // 🚀 Dedupe concurrent calls — return the in-flight promise instead of stacking
    if (membersInflightRef.current) {
      return membersInflightRef.current;
    }

    // 🚀 Abort any prior pending request before starting a new one
    membersAbortRef.current?.abort();
    const ac = new AbortController();
    membersAbortRef.current = ac;

    const run = (async () => {
      try {
        const { data } = await supabase
          .from("room_members")
          .select("*")
          .eq("room_id", roomId)
          .abortSignal(ac.signal);

        if (ac.signal.aborted) return;

        if (data && data.length > 0) {
          // Client-side filter: hide stale users immediately (don't wait for cron)
          const now = Date.now();
          const fresh = data.filter((m) => {
            const age = now - new Date(m.joined_at).getTime();
            return age < STALE_MEMBER_MS;
          }).map((m) => {
            const age = now - new Date(m.joined_at).getTime();
            // Force-drop from mic if heartbeat is stale, even before cron runs
            if (m.is_on_mic && age >= STALE_MIC_MS) {
              return { ...m, is_on_mic: false, mic_slot: null };
            }
            return m;
          });

          const userIds = fresh.map((m) => m.user_id);
          if (userIds.length === 0) {
            membersCacheRef.current = { ts: Date.now(), data: [] };
            setMembers([]);
            return;
          }

          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, vip_level, displayed_vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame, entrance_video_url, entrance_audio_url, equipped_entrance_effect")
            .in("id", userIds)
            .abortSignal(ac.signal);

          if (ac.signal.aborted) return;

          const profileMap: Record<string, any> = {};
          profiles?.forEach((p) => { profileMap[p.id] = applyDisplayedVip(p as any); });

          const next = fresh.map((m) => ({
            ...m,
            profile: profileMap[m.user_id] || null,
          }));
          membersCacheRef.current = { ts: Date.now(), data: next };
          setMembers(next);
        } else {
          membersCacheRef.current = { ts: Date.now(), data: [] };
          setMembers([]);
        }
      } catch (err: any) {
        // Swallow abort errors silently
        if (err?.name === 'AbortError') return;
      } finally {
        membersInflightRef.current = null;
      }
    })();

    membersInflightRef.current = run;
    return run;
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    // Only load messages created AT OR AFTER this user's session join time.
    // Each user that re-enters the room gets a fresh chat view; chat for other
    // users currently inside is unaffected (cutoff is purely client-side).
    const cutoffIso = new Date(sessionStartRef.current).toISOString();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(100);

    // If RLS blocked us (not yet a room member), keep existing state to avoid wiping the chat.
    if (error) return;
    if (!data) return;

    if (data.length > 0) {
      const senderIds = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, vip_level, displayed_vip_level, is_boss")
        .in("id", senderIds);

      const profileMap: Record<string, any> = {};
      profiles?.forEach((p) => { profileMap[p.id] = applyDisplayedVip(p as any); });

      setMessages(data.map((m) => ({
        ...m,
        sender: profileMap[m.sender_id] || null,
      })));
    } else {
      // Empty result: only clear if we had no messages before, otherwise preserve cache
      // (a returning user may briefly see [] before their join completes)
      setMessages((prev) => (prev.length === 0 ? [] : prev));
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
        .select("display_name, avatar_url, vip_level, displayed_vip_level, is_boss, user_id, wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame, entrance_video_url, entrance_audio_url, equipped_entrance_effect")
        .eq("id", room.host_id)
        .single();

      setRoomData({
        ...room,
        host_profile: hostProfile ? applyDisplayedVip(hostProfile as any) : null,
      });
    }
  }, [roomId]);

  // 🚀 Persistent presence/broadcast channel for SUB-100ms mic & typing updates.
  // We still keep postgres_changes as the source of truth (RLS-protected),
  // but Broadcast bypasses the DB round-trip for instant UI feedback.
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const batcherRef = useRef<RealtimeBatcher | null>(null);

  useEffect(() => {
    if (!roomId) return;
    // 🧹 Reset chat cutoff every time the user (re)enters a room
    sessionStartRef.current = Date.now();
    setMessages([]);

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      await fetchRoomData();
      fetchMembers();
      fetchMessages();
    };

    init();


    // 🚀 Apply a single mic-update payload to the local members array.
    const applyMicUpdate = (payload: any) => {
      const { user_id, mic_slot, is_on_mic, sentAt } = payload || {};
      if (!user_id) return;
      // Latency = receive time − send time (when batcher includes sentAt)
      if (typeof sentAt === "number") {
        recordLatency("mic", Math.max(0, Date.now() - sentAt));
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === user_id ? { ...m, mic_slot, is_on_mic } : m
        )
      );
    };

    const presenceChannel = supabase.channel(`room-presence-${roomId}`, {
      config: { broadcast: { self: false, ack: false } },
    })
      // Single-event path (legacy / immediate)
      .on("broadcast", { event: "mic-update" }, (payload) => {
        applyMicUpdate(payload.payload);
      })
      // 🚀 Batched path: a single message can carry many events sent within
      // a 100–150ms window — drastically reduces channel chatter.
      .on("broadcast", { event: "batch" }, (payload) => {
        const events = payload.payload?.events as Array<{ event: string; payload: any }> | undefined;
        const sentAt = payload.payload?.sentAt as number | undefined;
        if (!events) return;
        for (const e of events) {
          if (e.event === "mic-update") {
            applyMicUpdate({ ...e.payload, sentAt });
          }
        }
      })
      .subscribe();
    presenceChannelRef.current = presenceChannel;
    batcherRef.current = createRealtimeBatcher(presenceChannel, { intervalMs: 120 });

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
      // 🔄 React instantly when ANY profile updates equipped frame/badge etc.
      // We refetch members so the new look (frame, name, avatar) appears in real time.
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => {
        fetchMembers(true);
        fetchRoomData();
      })
      .subscribe();

    // Same-tab instant refresh: when the user equips a frame/badge in the
    // inventory sheet, we don't want to wait for the realtime round-trip.
    const handleLocalEquip = () => {
      fetchMembers(true);
      fetchRoomData();
    };
    window.addEventListener("profile-cosmetics-changed", handleLocalEquip);

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

    // 🚀 Queued heartbeat: coalesces rapid triggers (visibility/focus/interval)
    // into a single in-flight request, with a minimum gap between successful beats.
    const sendHeartbeat = async (): Promise<void> => {
      const uid = currentUserIdRef.current;
      const rid = roomIdRef.current;
      if (!uid || !rid) return;

      // Reuse the in-flight beat if one is already running
      if (heartbeatInflightRef.current) return heartbeatInflightRef.current;

      // Skip if we just beat very recently (debounce against burst events)
      if (Date.now() - heartbeatLastAtRef.current < HEARTBEAT_MIN_GAP) return;

      const run = (async () => {
        try {
          await supabase
            .from("room_members")
            .update({ joined_at: new Date().toISOString() })
            .eq("room_id", rid)
            .eq("user_id", uid);
          heartbeatLastAtRef.current = Date.now();
        } catch {
          // Silent — next interval will retry
        } finally {
          heartbeatInflightRef.current = null;
        }
      })();

      heartbeatInflightRef.current = run;
      return run;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-establish presence the moment the user returns (queued + cached)
        sendHeartbeat();
        fetchMembers(true); // force refresh on return — bypass cache
      }
    };

    const handleFocus = () => {
      sendHeartbeat();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Heartbeat: update joined_at periodically to show user is still active
    // Also increment mic_hours for agency hosts who are on mic
    let heartbeatTickCount = 0;
    heartbeatRef.current = setInterval(async () => {
      const uid = currentUserIdRef.current;
      const rid = roomIdRef.current;
      if (uid && rid) {
        // 🚀 Use queued helper — coalesces with any visibility/focus beat in flight
        await sendHeartbeat();

        // Daily task: increment room_minutes every 4 ticks (= 1 minute at 15s/tick)
        heartbeatTickCount += 1;
        if (heartbeatTickCount % 4 === 0) {
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

    // 🚀 Periodic re-filter to drop stale users from UI even without DB changes
    const staleSweepRef = setInterval(() => {
      fetchMembers();
    }, STALE_SWEEP_INTERVAL);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("profile-cosmetics-changed", handleLocalEquip);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      clearInterval(staleSweepRef);
      // 🚀 Abort any pending fetch + clear caches/queues so a re-mount starts clean
      membersAbortRef.current?.abort();
      membersAbortRef.current = null;
      membersInflightRef.current = null;
      membersCacheRef.current = null;
      heartbeatInflightRef.current = null;
      supabase.removeChannel(channel);
      if (batcherRef.current) {
        batcherRef.current.flushNow();
        batcherRef.current.dispose();
        batcherRef.current = null;
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, [roomId, fetchMembers, fetchMessages, fetchRoomData]);

  const joinRoom = async () => {
    if (!roomId || !currentUserId) return;
    // Upsert ensures one entry per user per room (unique constraint)
    const { error } = await supabase.from("room_members").upsert(
      {
        room_id: roomId,
        user_id: currentUserId,
        mic_slot: null,
        is_on_mic: false,
      },
      { onConflict: "room_id,user_id" }
    );
    // After membership is confirmed, RLS now allows reading messages.
    // Re-fetch so returning users see the existing chat history.
    if (!error) {
      await fetchMessages();
      await fetchMembers();
    }
  };

  const leaveRoom = async () => {
    if (!roomId || !currentUserId) return;
    // Remove only the leaving user. Rooms are PERMANENT — even when the host
    // leaves, the room stays so they can re-enter with all settings intact.
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", currentUserId);
  };

  const sendMessage = async (content: string) => {
    if (!roomId || !currentUserId || !content.trim()) return;
    const trimmed = content.trim();

    // 🚀 Optimistic UI: show the message instantly to the sender (latency
    // compensation). The realtime listener will replace this temp entry with
    // the real one on echo. If the insert fails, we roll back.
    const tempId = `optimistic-${Date.now()}-${Math.random()}`;
    const optimisticMsg: RoomMessage = {
      id: tempId,
      sender_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUserId,
      room_id: roomId,
      content: trimmed,
    });

    if (error) {
      // Rollback: remove the optimistic entry
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      // Drop the optimistic temp; realtime fetch will bring the real row.
      // We keep it in place momentarily so the user doesn't see a flicker —
      // fetchMessages will replace the whole list shortly.
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }, 1500);
    }
  };

  const toggleMic = async (on: boolean) => {
    if (!roomId || !currentUserId) return;
    // Optimistic local update
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === currentUserId ? { ...m, is_on_mic: on } : m
      )
    );
    // 🚀 Queue into the 100–150ms batcher (coalesces rapid toggles)
    batcherRef.current?.queue("mic-update", {
      user_id: currentUserId,
      mic_slot: null,
      is_on_mic: on,
    });
    await supabase
      .from("room_members")
      .update({ is_on_mic: on })
      .eq("room_id", roomId)
      .eq("user_id", currentUserId);
  };

  const updateMicSlot = async (slot: number | null, isOnMic: boolean) => {
    if (!roomId || !currentUserId) return;
    // Optimistic update — UI reflects the change instantly.
    setMembers(prev => prev.map(m =>
      m.user_id === currentUserId ? { ...m, mic_slot: slot, is_on_mic: isOnMic } : m
    ));
    // 🚀 Queue into the 100–150ms batcher
    batcherRef.current?.queue("mic-update", {
      user_id: currentUserId,
      mic_slot: slot,
      is_on_mic: isOnMic,
    });
    const { error } = await supabase
      .from("room_members")
      .update({ mic_slot: slot, is_on_mic: isOnMic })
      .eq("room_id", roomId)
      .eq("user_id", currentUserId);
    if (error) {
      // Revert on error
      fetchMembers(true);
    }
  };

  return { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic, updateMicSlot, fetchMembers };
};
