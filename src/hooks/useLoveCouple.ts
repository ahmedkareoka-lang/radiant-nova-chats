import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LoveCouple {
  id: string;
  user1_id: string;
  user2_id: string;
  love_points: number;
  love_level: number;
  is_active: boolean;
  activated_at: string;
  partner?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    user_id: string;
  };
}

/** Returns the active couple (if any) for the given user. */
export function useLoveCouple(userId: string | null) {
  const [couple, setCouple] = useState<LoveCouple | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setCouple(null); setLoading(false); return; }
    const { data } = await supabase
      .from("love_couples")
      .select("*")
      .eq("is_active", true)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .maybeSingle();
    if (!data) { setCouple(null); setLoading(false); return; }
    const partnerId = data.user1_id === userId ? data.user2_id : data.user1_id;
    const { data: p } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, user_id")
      .eq("id", partnerId)
      .single();
    setCouple({ ...data, partner: p as any });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime updates
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`love-couple-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "love_couples" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetch]);

  return { couple, loading, refetch: fetch };
}
