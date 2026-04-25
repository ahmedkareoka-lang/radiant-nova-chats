import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RelationshipType } from "@/lib/relationshipTypes";

export interface RelationshipRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  relationship_type: RelationshipType;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired";
  message: string | null;
  created_at: string;
  expires_at: string;
  other_party?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    user_id: string;
  };
  is_incoming: boolean;
}

/**
 * Loads pending relationship requests for the given user — both
 * incoming (you decide) and outgoing (you wait). Subscribes to realtime.
 */
export function useRelationshipRequests(userId: string | null) {
  const [incoming, setIncoming] = useState<RelationshipRequest[]>([]);
  const [outgoing, setOutgoing] = useState<RelationshipRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) { setIncoming([]); setOutgoing([]); setLoading(false); return; }
    const { data: rows } = await supabase
      .from("relationship_requests")
      .select("*")
      .eq("status", "pending")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (!rows || rows.length === 0) {
      setIncoming([]); setOutgoing([]); setLoading(false); return;
    }

    // Resolve other-party profiles in one query
    const otherIds = Array.from(new Set(rows.map((r: any) => r.sender_id === userId ? r.receiver_id : r.sender_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, user_id")
      .in("id", otherIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const enriched: RelationshipRequest[] = rows.map((r: any) => {
      const isIncoming = r.receiver_id === userId;
      const otherId = isIncoming ? r.sender_id : r.receiver_id;
      return { ...r, is_incoming: isIncoming, other_party: profileMap.get(otherId) as any };
    });

    setIncoming(enriched.filter((r) => r.is_incoming));
    setOutgoing(enriched.filter((r) => !r.is_incoming));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`rel-req-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "relationship_requests" },
        () => fetchAll()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchAll]);

  return { incoming, outgoing, loading, refetch: fetchAll };
}
