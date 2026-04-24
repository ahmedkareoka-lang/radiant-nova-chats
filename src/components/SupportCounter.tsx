import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupportCounterProps {
  userId: string;
  sessionStart: string;
}

const SupportCounter = ({ userId, sessionStart }: SupportCounterProps) => {
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("gift_transactions")
      .select("diamond_amount")
      .eq("receiver_id", userId)
      .gte("created_at", sessionStart);
    setTotal(data?.reduce((s, g) => s + Number(g.diamond_amount), 0) || 0);
  }, [userId, sessionStart]);

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel(`support-${userId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, (p) => {
        if ((p.new as any).receiver_id === userId) fetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetch]);

  if (total === 0) return null;

  const display = total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString();

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-full bg-accent/15 border border-accent/30 text-[9px] font-bold text-accent leading-none whitespace-nowrap">
      <span className="text-[10px] leading-none">💎</span>
      <span className="tabular-nums">{display}</span>
    </span>
  );
};

export default SupportCounter;
