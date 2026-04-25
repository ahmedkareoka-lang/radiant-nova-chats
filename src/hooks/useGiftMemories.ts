import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GiftMemory {
  id: string;
  sender_id: string;
  receiver_id: string;
  gift_name: string;
  gold_amount: number;
  diamond_amount: number;
  created_at: string;
  direction: "sent" | "received";
}

/**
 * Returns the timeline of gifts exchanged between the user and their partner.
 * Used in the Memory Wall section of the relationships page.
 */
export function useGiftMemories(myId: string | null, partnerId: string | null, limit = 30) {
  const [memories, setMemories] = useState<GiftMemory[]>([]);
  const [totalGold, setTotalGold] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!myId || !partnerId) { setMemories([]); setTotalGold(0); setLoading(false); return; }
      setLoading(true);
      const { data } = await supabase
        .from("gift_transactions")
        .select("id, sender_id, receiver_id, gift_name, gold_amount, diamond_amount, created_at")
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cancelled) return;
      const enriched = (data ?? []).map((g: any): GiftMemory => ({
        ...g,
        direction: g.sender_id === myId ? "sent" : "received",
      }));
      setMemories(enriched);
      setTotalGold(enriched.reduce((sum, g) => sum + (g.gold_amount || 0), 0));
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [myId, partnerId, limit]);

  return { memories, totalGold, loading };
}
