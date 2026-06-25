import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Flame, Clock, X } from "lucide-react";

interface PKChallengeProps {
  roomId: string;
  isHost: boolean;
  members: { user_id: string; mic_slot?: number | null; profile?: { display_name: string; avatar_url: string | null } }[];
  micCount?: number;
  onStateChange?: (state: Pick<PKState, "active" | "startTime" | "score1" | "score2" | "durationMin">) => void;
}

interface PKState {
  active: boolean;
  team1: string[];
  team2: string[];
  score1: number;
  score2: number;
  startTime: string | null;
  /** Duration in minutes; null = manual (no auto-close) */
  durationMin: number | null;
}

const PKChallenge = ({ roomId, isHost, members, micCount = 8, onStateChange }: PKChallengeProps) => {
  const [pk, setPK] = useState<PKState>({ active: false, team1: [], team2: [], score1: 0, score2: 0, startTime: null, durationMin: null });
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Stable channel name shared with SupportCounter so they stay in sync.
    const channel = supabase.channel(`pk-room-${roomId}`, { config: { broadcast: { self: true } } });
    channel.on("broadcast", { event: "pk-update" }, ({ payload }) => {
      if (payload) setPK((prev) => ({ ...prev, ...(payload as PKState) }));
    });
    channel.subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const broadcastPK = useCallback((state: PKState) => {
    setPK(state);
    channelRef.current?.send({ type: "broadcast", event: "pk-update", payload: state });
  }, []);

  useEffect(() => {
    onStateChange?.({
      active: pk.active,
      startTime: pk.startTime,
      score1: pk.score1,
      score2: pk.score2,
      durationMin: pk.durationMin,
    });
  }, [pk.active, pk.startTime, pk.score1, pk.score2, pk.durationMin, onStateChange]);

  // Countdown + auto-close when a duration was set
  useEffect(() => {
    if (!pk.active || !pk.startTime || !pk.durationMin) { setRemaining(null); return; }
    const endMs = new Date(pk.startTime).getTime() + pk.durationMin * 60_000;
    const tick = () => {
      const left = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && isHost) {
        broadcastPK({ ...pk, active: false, score1: 0, score2: 0, startTime: null, durationMin: null });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pk, isHost, broadcastPK]);

  const startPK = (durationMin: number | null) => {
    setShowDurationPicker(false);
    broadcastPK({ active: true, team1: [], team2: [], score1: 0, score2: 0, startTime: new Date().toISOString(), durationMin });
  };

  const togglePK = () => {
    if (pk.active) broadcastPK({ ...pk, active: false, score1: 0, score2: 0, startTime: null, durationMin: null });
    else setShowDurationPicker(true);
  };

  const refreshGiftScores = useCallback(async (startTime: string) => {
    const seated = members.filter((m) => typeof m.mic_slot === "number");
    if (seated.length === 0) {
      setPK((prev) => prev.active && prev.startTime === startTime ? { ...prev, score1: 0, score2: 0 } : prev);
      return;
    }

    const receiverIds = seated.map((m) => m.user_id);
    const midpoint = Math.ceil(micCount / 2);
    const receiverTeam = new Map<string, 1 | 2>();
    seated.forEach((m) => receiverTeam.set(m.user_id, (m.mic_slot ?? 0) < midpoint ? 1 : 2));

    const { data } = await supabase
      .from("gift_transactions")
      .select("receiver_id, diamond_amount")
      .in("receiver_id", receiverIds)
      .gte("created_at", startTime);

    let score1 = 0;
    let score2 = 0;
    (data || []).forEach((gift) => {
      const amount = Number(gift.diamond_amount || 0);
      if (receiverTeam.get(gift.receiver_id) === 1) score1 += amount;
      else if (receiverTeam.get(gift.receiver_id) === 2) score2 += amount;
    });

    setPK((prev) => (
      prev.active && prev.startTime === startTime
        ? { ...prev, score1, score2 }
        : prev
    ));
  }, [members, micCount]);

  useEffect(() => {
    if (!pk.active || !pk.startTime) return;
    const startTime = pk.startTime;
    refreshGiftScores(startTime);
    const ch = supabase
      .channel(`pk-gifts-${roomId}-${startTime}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, () => refreshGiftScores(startTime))
      .subscribe();
    const id = window.setInterval(() => refreshGiftScores(startTime), 12_000);
    return () => {
      window.clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, [roomId, pk.active, pk.startTime, refreshGiftScores]);

  if (!pk.active && !isHost) return null;

  const total = pk.score1 + pk.score2 || 1;
  const pct1 = Math.round((pk.score1 / total) * 100);
  const pct2 = 100 - pct1;
  const formatScore = (value: number) => value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
    : value >= 1000
      ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}K`
      : value.toLocaleString("en-US");

  return (
    <>
      {/* Toggle Button for Host */}
      {isHost && !pk.active && (
        <button onClick={togglePK}
          className="flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-bold text-muted-foreground transition-all active:scale-95"
        >
          <Swords className="w-3.5 h-3.5" />
          بدء PK
        </button>
      )}

      {/* Duration picker */}
      {isHost && showDurationPicker && !pk.active && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setShowDurationPicker(false)} />
          <div className="fixed left-1/2 top-1/2 z-[71] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="text-sm font-black text-foreground mb-3 text-center flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> مدة الـ PK
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => startPK(30)} className="py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-red-500 text-white font-black text-xs">30 دقيقة</button>
              <button onClick={() => startPK(60)} className="py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs">ساعة كاملة</button>
              <button onClick={() => startPK(null)} className="py-2 rounded-xl bg-secondary text-foreground font-bold text-xs border border-border">يدوي (إيقاف عند الضغط)</button>
              <button onClick={() => setShowDurationPicker(false)} className="py-1.5 mt-1 rounded-xl text-muted-foreground text-[11px]">إلغاء</button>
            </div>
          </div>
        </>
      )}

      {/* Countdown pill while running */}
      {pk.active && remaining !== null && (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 border border-white/15 text-white text-[10px] font-black tabular-nums">
          <Clock className="w-3 h-3" />
          {Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}
        </span>
      )}

      {/* PK Display */}
      <AnimatePresence>
        {pk.active && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            className="w-full origin-top overflow-hidden rounded-xl border border-yellow-500/30 bg-card/85 shadow-lg backdrop-blur"
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-[10px] font-black text-yellow-300">
                <Flame className="h-3.5 w-3.5 animate-pulse" />
                PK
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black leading-none">
                  <span className="min-w-0 truncate text-blue-400">فريق 1</span>
                  <span className="shrink-0 tabular-nums text-yellow-300">{formatScore(pk.score1)} : {formatScore(pk.score2)}</span>
                  <span className="min-w-0 truncate text-red-400">فريق 2</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  animate={{ width: `${pct1}%` }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                  animate={{ width: `${pct2}%` }}
                />
                </div>
              </div>
              {remaining !== null && (
                <span className="shrink-0 rounded-full bg-black/45 px-1.5 py-1 text-[9px] font-black tabular-nums text-white">
                  {Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}
                </span>
              )}
              {isHost && (
                <button onClick={togglePK} className="shrink-0 rounded-full bg-secondary p-1.5 text-muted-foreground active:scale-95" title="إنهاء PK">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PKChallenge;
