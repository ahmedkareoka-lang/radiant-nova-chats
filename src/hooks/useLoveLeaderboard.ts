import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardCouple {
  id: string;
  love_points: number;
  love_level: number;
  user1: { id: string; display_name: string; avatar_url: string | null };
  user2: { id: string; display_name: string; avatar_url: string | null };
}

export function useLoveLeaderboard(limit = 50) {
  const [rows, setRows] = useState<LeaderboardCouple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: couples } = await supabase
        .from("love_couples")
        .select("id, user1_id, user2_id, love_points, love_level")
        .eq("is_active", true)
        .order("love_points", { ascending: false })
        .limit(limit);

      if (!couples || cancelled) { setRows([]); setLoading(false); return; }
      const ids = Array.from(new Set(couples.flatMap((c) => [c.user1_id, c.user2_id])));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      if (cancelled) return;
      setRows(couples.map((c: any) => ({
        id: c.id,
        love_points: c.love_points,
        love_level: c.love_level,
        user1: pmap.get(c.user1_id) as any,
        user2: pmap.get(c.user2_id) as any,
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  return { rows, loading };
}
