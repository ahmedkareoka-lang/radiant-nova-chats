import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupportCounterProps {
  userId: string;
  /** Fallback session start when PK is not active (kept for backwards compat) */
  sessionStart: string;
  /** Required to subscribe to the room's PK channel */
  roomId?: string;
}

interface PKState {
  active: boolean;
  startTime: string | null;
}

/**
 * Fiery red support counter shown UNDER a user's avatar frame.
 * Only visible while the room is in PK mode. When PK starts again,
 * the counter resets (it filters gifts by pk.startTime).
 */
const SupportCounter = ({ userId, sessionStart, roomId }: SupportCounterProps) => {
  const [total, setTotal] = useState(0);
  const [pk, setPK] = useState<PKState>({ active: false, startTime: null });
  const pkRef = useRef(pk);
  pkRef.current = pk;

  // Subscribe to the room-wide PK state (shared with PKChallenge.tsx)
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`pk-room-${roomId}`, { config: { broadcast: { self: true } } });
    ch.on("broadcast", { event: "pk-update" }, ({ payload }) => {
      if (payload) setPK({ active: !!payload.active, startTime: payload.startTime || null });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  const cutoffIso = pk.active ? (pk.startTime || sessionStart) : sessionStart;

  const fetch = useCallback(async () => {
    if (!pkRef.current.active) { setTotal(0); return; }
    const { data } = await supabase
      .from("gift_transactions")
      .select("diamond_amount")
      .eq("receiver_id", userId)
      .gte("created_at", cutoffIso);
    setTotal(data?.reduce((s, g) => s + Number(g.diamond_amount), 0) || 0);
  }, [userId, cutoffIso]);

  useEffect(() => {
    // Reset & refetch whenever PK toggles or a new round starts
    setTotal(0);
    if (!pk.active) return;
    fetch();
    const ch = supabase
      .channel(`support-${userId}-${pk.startTime || "manual"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, (p) => {
        if ((p.new as any).receiver_id === userId) fetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetch, pk.active, pk.startTime]);

  if (!pk.active) return null;

  const display = total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString();

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-[2px] rounded-md text-[10px] font-black text-white leading-none whitespace-nowrap shadow-[0_0_10px_rgba(255,60,0,0.65)] border border-orange-300/70"
      style={{
        background: "linear-gradient(180deg,#ff5a1f 0%,#e0220c 55%,#8a0a00 100%)",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      <span className="text-[10px] leading-none">🔥</span>
      <span className="tabular-nums">{display}</span>
    </span>
  );
};

export default SupportCounter;
