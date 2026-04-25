import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import { measurePerformance } from "./perfUtils";
import { debounce } from "./perfUtils";

// 🎯 Helpers for fast, optimistic chat queries (NOVA schema)
//
// Schema notes:
// - Messages table: id, room_id, conversation_id, sender_id, content, created_at
// - User data lives in the `profiles` table (id, display_name, avatar_url, …)
// - There is no `users` table and no `username` column.

type ChatMessage = {
  id: string;
  room_id: string | null;
  conversation_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

/**
 * Fetch room messages with pagination + count.
 * Returns oldest-first for natural chronological display.
 */
export const fetchMessagesOptimized = async (
  roomId: string,
  page = 1,
  limit = 50,
) => {
  return measurePerformance("fetchMessages", async () => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        room_id,
        conversation_id,
        sender_id,
        content,
        created_at,
        sender:profiles!sender_id (
          id,
          display_name,
          avatar_url
        )
      `,
        { count: "exact" },
      )
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const messages = ((data ?? []) as unknown as ChatMessage[]).reverse();
    return {
      messages,
      count: count ?? 0,
      hasMore: count ? from + limit < count : false,
    };
  });
};

/**
 * Subscribe to new room messages via Supabase Realtime.
 * Optional debounce smooths bursts of inserts (e.g., spam/gift floods).
 */
export const subscribeToRoomMessages = (
  roomId: string,
  onMessage: (payload: any) => void,
  debounceMs = 0,
) => {
  const handler =
    debounceMs > 0 ? debounce(onMessage, debounceMs) : onMessage;

  const channel = supabase
    .channel(`room:${roomId}:messages`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handler(payload),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Optimistic message send: UI updates instantly, then reconciles with server.
 * Falls back to rollback on error. Designed for non-paginated flat caches —
 * use `useInfiniteQuery` patterns separately if you need page-aware caches.
 */
export const sendMessageOptimistic = async (
  roomId: string,
  content: string,
  senderId: string,
  queryClient: QueryClient,
) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const queryKey = ["messages", roomId];

  const tempMessage: ChatMessage = {
    id: tempId,
    room_id: roomId,
    conversation_id: null,
    sender_id: senderId,
    content,
    created_at: new Date().toISOString(),
    sender: null,
  };

  // 🎯 Snapshot for rollback
  const previous = queryClient.getQueryData<ChatMessage[]>(queryKey);

  queryClient.setQueryData<ChatMessage[]>(queryKey, (old) => [
    ...(old ?? []),
    tempMessage,
  ]);

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, content, sender_id: senderId })
      .select(
        `
        id,
        room_id,
        conversation_id,
        sender_id,
        content,
        created_at,
        sender:profiles!sender_id ( id, display_name, avatar_url )
      `,
      )
      .single();

    if (error) throw error;

    const real = data as unknown as ChatMessage;

    // 🔄 Replace temp with real message (no duplicate from realtime)
    queryClient.setQueryData<ChatMessage[]>(queryKey, (old) =>
      (old ?? []).map((m) => (m.id === tempId ? real : m)),
    );

    return real;
  } catch (error) {
    // 🔙 Rollback to snapshot on failure
    queryClient.setQueryData(queryKey, previous);
    throw error;
  }
};
