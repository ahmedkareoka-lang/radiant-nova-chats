import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SupportCounterProps {
  userId: string;
  /** Fallback session start when PK is not active (kept for backwards compat) */
  sessionStart: string;
  /** Required to subscribe to the room's PK channel */
  roomId?: string;
  /** Authoritative PK flag from the room layout. When supplied, no stale broadcast state is used. */
  pkActive?: boolean;
  /** PK round start; changing this resets the counter for the new battle. */
  pkStartTime?: string | null;
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
const SupportCounter = ({ userId, sessionStart, roomId, pkActive, pkStartTime }: SupportCounterProps) => {
  const [total, setTotal] = useState(0);
  const [pk, setPK] = useState<PKState>({ active: false, startTime: null });
  const controlled = typeof pkActive === "boolean";
  const effectivePK: PKState = controlled
    ? { active: !!pkActive, startTime: pkStartTime || null }
    : pk;
  const pkRef = useRef(effectivePK);
  pkRef.current = effectivePK;

  // Subscribe to the room-wide PK state (shared with PKChallenge.tsx)
  useEffect(() => {
    if (controlled) return;
    if (!roomId) return;
    const ch = supabase.channel(`pk-room-${roomId}`, { config: { broadcast: { self: true } } });
    ch.on("broadcast", { event: "pk-update" }, ({ payload }) => {
      if (payload) setPK({ active: !!payload.active, startTime: payload.startTime || null });
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId, controlled]);

  const cutoffIso = effectivePK.active ? (effectivePK.startTime || sessionStart) : sessionStart;

  const fetch = useCallback(async () => {
    if (!pkRef.current.active) { setTotal(0); return; }
    const { data } = await supabase
      .from("gift_transactions")
      .select("diamond_amount")
      .eq("receiver_id", userId)
      .gte("created_at", cutoffIso);
    setTotal(data?.reduce((s, g) => s + Number(g.diamond_amount || 0), 0) || 0);
  }, [userId, cutoffIso]);

  useEffect(() => {
    // Reset & refetch whenever PK toggles or a new round starts
    setTotal(0);
    if (!effectivePK.active) return;
    fetch();
    const ch = supabase
      .channel(`support-${userId}-${effectivePK.startTime || "manual"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, (p) => {
        if ((p.new as any).receiver_id === userId) fetch();
      })
      .subscribe();
    // Instant local update for self-gifts (no realtime round-trip).
    const onLocalGift = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail || detail.receiverId !== userId) return;
      setTotal((t) => t + Number(detail.diamondAmount || 0));
    };
    window.addEventListener("gift-sent", onLocalGift);
    return () => {
      supabase.removeChannel(ch);
      window.removeEventListener("gift-sent", onLocalGift);
    };
  }, [userId, fetch, effectivePK.active, effectivePK.startTime]);

  if (!effectivePK.active) return null;

  const display = total >= 1_000_000
    ? `${(total / 1_000_000).toFixed(total >= 10_000_000 ? 0 : 1)}M`
    : total >= 1000
      ? `${(total / 1000).toFixed(total >= 10_000 ? 0 : 1)}K`
      : total.toLocaleString("en-US");

  return (
    <span
      className="inline-flex min-w-[38px] max-w-[64px] items-center justify-center overflow-hidden rounded-[5px] border border-orange-300/70 px-1.5 py-[2px] text-[10px] font-black leading-none text-white shadow-[0_0_10px_rgba(255,60,0,0.65)] whitespace-nowrap"
      style={{
        background: "linear-gradient(180deg,#ff5a1f 0%,#e0220c 55%,#8a0a00 100%)",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    >
      <span className="tabular-nums leading-none">{display}</span>
    </span>
  );
};

export default SupportCounter;
