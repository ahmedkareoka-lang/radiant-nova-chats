import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Trophy, Flame, Clock } from "lucide-react";

interface PKChallengeProps {
  roomId: string;
  isHost: boolean;
  members: { user_id: string; profile?: { display_name: string; avatar_url: string | null } }[];
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

const PKChallenge = ({ roomId, isHost, members }: PKChallengeProps) => {
  const [pk, setPK] = useState<PKState>({ active: false, team1: [], team2: [], score1: 0, score2: 0, startTime: null, durationMin: null });
  const [showPK, setShowPK] = useState(false);
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

  // Countdown + auto-close when a duration was set
  useEffect(() => {
    if (!pk.active || !pk.startTime || !pk.durationMin) { setRemaining(null); return; }
    const endMs = new Date(pk.startTime).getTime() + pk.durationMin * 60_000;
    const tick = () => {
      const left = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && isHost) {
        broadcastPK({ ...pk, active: false });
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
    if (pk.active) broadcastPK({ ...pk, active: false });
    else setShowDurationPicker(true);
  };

  const addScore = (team: 1 | 2, amount: number) => {
    const updated = { ...pk };
    if (team === 1) updated.score1 += amount;
    else updated.score2 += amount;
    broadcastPK(updated);
  };

  if (!pk.active && !isHost) return null;

  const total = pk.score1 + pk.score2 || 1;
  const pct1 = Math.round((pk.score1 / total) * 100);
  const pct2 = 100 - pct1;
  const winner = pk.score1 > pk.score2 ? 1 : pk.score2 > pk.score1 ? 2 : 0;

  return (
    <>
      {/* Toggle Button for Host */}
      {isHost && (
        <button onClick={() => { if (!pk.active) togglePK(); else setShowPK(!showPK); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${pk.active ? "bg-gradient-to-r from-yellow-500 to-red-500 text-white animate-pulse" : "bg-secondary text-muted-foreground"}`}
        >
          <Swords className="w-3.5 h-3.5" />
          {pk.active ? "PK 🔥" : "بدء PK"}
        </button>
      )}

      {/* Duration picker */}
      {isHost && showDurationPicker && !pk.active && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setShowDurationPicker(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71] w-[280px] rounded-2xl bg-card border border-border shadow-2xl p-4">
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
            className="w-full rounded-2xl overflow-hidden border border-yellow-500/30 bg-gradient-to-b from-yellow-900/20 via-red-900/10 to-transparent"
          >
            {/* Header */}
            <div className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-yellow-600/30 via-red-600/30 to-yellow-600/30">
              <Flame className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm font-black text-yellow-300">⚔️ PK CHALLENGE ⚔️</span>
              <Flame className="w-4 h-4 text-red-400 animate-pulse" />
            </div>

            {/* Score Bar */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-400">🔵 الفريق 1</span>
                <span className="text-lg font-black text-yellow-300">{pk.score1} : {pk.score2}</span>
                <span className="text-xs font-bold text-red-400">🔴 الفريق 2</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                  animate={{ width: `${pct1}%` }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all"
                  animate={{ width: `${pct2}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-blue-400 font-bold">{pct1}%</span>
                <span className="text-[9px] text-red-400 font-bold">{pct2}%</span>
              </div>
            </div>

            {/* Host Controls */}
            {isHost && (
              <div className="px-3 pb-3 flex items-center gap-2">
                <button onClick={() => addScore(1, 100)} className="flex-1 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-[10px] font-bold border border-blue-500/30">+100 🔵</button>
                <button onClick={() => addScore(2, 100)} className="flex-1 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">+100 🔴</button>
                <button onClick={togglePK} className="px-3 py-1.5 rounded-lg bg-secondary text-[10px] font-bold text-muted-foreground">إنهاء</button>
              </div>
            )}

            {/* Winner */}
            {!pk.active && winner !== 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-2">
                <Trophy className="w-6 h-6 text-yellow-400 mx-auto" />
                <p className="text-sm font-black text-yellow-300">الفائز: الفريق {winner} 🏆</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PKChallenge;
