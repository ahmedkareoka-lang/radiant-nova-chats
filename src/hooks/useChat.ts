import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  other_user: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    vip_level: number;
    is_boss: boolean;
    user_id: string;
  };
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!convs) { setLoading(false); return; }

    const enriched: Conversation[] = [];
    for (const conv of convs) {
      const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, vip_level, is_boss, user_id")
        .eq("id", otherId)
        .single();

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      enriched.push({
        id: conv.id,
        other_user: profile || { id: otherId, display_name: "User", avatar_url: null, vip_level: 0, is_boss: false, user_id: "" },
        last_message: lastMsg?.content,
        last_message_at: lastMsg?.created_at,
        unread_count: 0,
      });
    }

    setConversations(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel(`conversations-realtime-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const startConversation = async (otherUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check existing
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .single();

    if (existing) return existing.id;

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({ user1_id: user.id, user2_id: otherUserId })
      .select("id")
      .single();

    return newConv?.id || null;
  };

  return { conversations, loading, currentUserId, startConversation, refetch: fetchConversations };
};

export const useChatMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (data) {
      setMessages(data.map((m) => ({
        ...m,
        sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
      })));
    }
  }, [conversationId]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}-${Date.now()}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        supabase
          .from("messages")
          .select("*, sender:profiles!messages_sender_id_fkey(display_name, avatar_url)")
          .eq("id", (payload.new as any).id)
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
  }, [conversationId, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !currentUserId || !content.trim()) return;
    await supabase.from("messages").insert({
      sender_id: currentUserId,
      conversation_id: conversationId,
      content: content.trim(),
    });
  };

  return { messages, currentUserId, sendMessage };
};
