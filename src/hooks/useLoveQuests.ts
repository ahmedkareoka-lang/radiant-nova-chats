import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LoveQuest {
  id: string;
  couple_id: string;
  quest_date: string;
  quest_key: string;
  target: number;
  progress: number;
  reward_points: number;
  completed: boolean;
  claimed: boolean;
}

const DEFAULT_QUESTS = [
  { key: "send_3_gifts",       target: 3,   reward: 1500, label: "أرسلوا 3 هدايا لبعض",        emoji: "🎁" },
  { key: "spend_30_min_room",  target: 30,  reward: 2000, label: "اقضوا 30 دقيقة معاً في غرفة", emoji: "🎙️" },
  { key: "exchange_50_msgs",   target: 50,  reward: 1000, label: "تبادلوا 50 رسالة دردشة",      emoji: "💬" },
];

export function useLoveQuests(coupleId: string | null) {
  const [quests, setQuests] = useState<LoveQuest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrSeed = useCallback(async () => {
    if (!coupleId) { setQuests([]); setLoading(false); return; }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("love_quests")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("quest_date", today);

    let rows = data ?? [];

    // Seed missing default quests
    const existingKeys = new Set(rows.map((r: any) => r.quest_key));
    const toInsert = DEFAULT_QUESTS
      .filter((q) => !existingKeys.has(q.key))
      .map((q) => ({
        couple_id: coupleId,
        quest_date: today,
        quest_key: q.key,
        target: q.target,
        reward_points: q.reward,
      }));
    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from("love_quests")
        .insert(toInsert)
        .select("*");
      rows = [...rows, ...(inserted ?? [])];
    }

    setQuests(rows as any);
    setLoading(false);
  }, [coupleId]);

  useEffect(() => { fetchOrSeed(); }, [fetchOrSeed]);

  const claim = useCallback(async (questId: string) => {
    const { data, error } = await supabase.rpc("claim_love_quest", { _quest_id: questId });
    if (!error) await fetchOrSeed();
    return { data, error };
  }, [fetchOrSeed]);

  return { quests, loading, refetch: fetchOrSeed, claim, meta: DEFAULT_QUESTS };
}
