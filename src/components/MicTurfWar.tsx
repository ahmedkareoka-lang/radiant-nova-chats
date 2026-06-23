import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Crown, Flame, Search, Snowflake, Swords, VolumeX, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * MicTurfWar — REAL cross-room battles.
 * Backend: public.turf_wars + RPCs (start/respond/add_points/finalize/cancel).
 * Realtime: postgres_changes on turf_wars row.
 */

interface MicTurfWarProps {
  roomId: string;
  isHost: boolean;
  currentUserId: string | null;
  ourRoomName?: string;
}

interface WarRow {
  id: string;
  room_a: string;
  room_b: string;
  host_a: string;
  host_b: string;
  status: "pending" | "active" | "finished" | "declined" | "cancelled" | "expired";
  score_a: number;
  score_b: number;
  winner_room: string | null;
  started_at: string | null;
  ends_at: string | null;
}

const BATTLE_SECONDS = 5 * 60;
const MUTE_SECONDS = 30;

const fmtTime = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.max(0, s) % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

export default function MicTurfWar({ roomId, isHost, currentUserId, ourRoomName = "غرفتنا" }: MicTurfWarProps) {
  const [war, setWar] = useState<WarRow | null>(null);
  const [matching, setMatching] = useState(false);
  const [opponentName, setOpponentName] = useState<string>("");
  const [now, setNow] = useState<number>(Date.now());
  const [muteCountdown, setMuteCountdown] = useState(0);
  const [showResult, setShowResult] = useState<null | "victory" | "defeat" | "draw">(null);
  const lastWarIdRef = useRef<string | null>(null);

  const weAreA = war?.room_a === roomId;
  const ourScore = weAreA ? war?.score_a ?? 0 : war?.score_b ?? 0;
  const oppScore = weAreA ? war?.score_b ?? 0 : war?.score_a ?? 0;
  const total = ourScore + oppScore;
  const ourPct = total === 0 ? 50 : Math.round((ourScore / total) * 100);
  const oppPct = 100 - ourPct;

  // --- Load active/pending war for this room + subscribe to live changes ---
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("turf_wars")
        .select("*")
        .or(`room_a.eq.${roomId},room_b.eq.${roomId}`)
        .in("status", ["pending", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      if (data) setWar(data as WarRow);
    };
    load();

    const channel = supabase
      .channel(`turfwar-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "turf_wars" },
        (payload) => {
          const row = (payload.new ?? payload.old) as WarRow | undefined;
          if (!row) return;
          if (row.room_a !== roomId && row.room_b !== roomId) return;
          if (payload.eventType === "DELETE") {
            setWar((cur) => (cur?.id === row.id ? null : cur));
          } else {
            setWar(row as WarRow);
          }
        },
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Fetch opponent display name when war changes
  useEffect(() => {
    if (!war) {
      setOpponentName("");
      return;
    }
    const opponentRoomId = war.room_a === roomId ? war.room_b : war.room_a;
    let active = true;
    supabase
      .from("rooms")
      .select("name")
      .eq("id", opponentRoomId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.name) setOpponentName(data.name);
      });
    return () => {
      active = false;
    };
  }, [war, roomId]);

  // 1s tick for countdown
  useEffect(() => {
    if (!war || war.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [war?.status]);

  const endsAtMs = war?.ends_at ? new Date(war.ends_at).getTime() : 0;
  const timeLeft = war?.status === "active" ? Math.max(0, Math.round((endsAtMs - now) / 1000)) : BATTLE_SECONDS;

  // Auto-finalize when timer hits zero (host_a calls it; host_b is a fallback)
  useEffect(() => {
    if (!war || war.status !== "active") return;
    if (timeLeft > 0) return;
    if (currentUserId !== war.host_a && currentUserId !== war.host_b) return;
    supabase.rpc("finalize_turf_war", { _war_id: war.id });
  }, [war, timeLeft, currentUserId]);

  // Result detection (only fire once per war id)
  useEffect(() => {
    if (!war) return;
    if (war.status !== "finished") return;
    if (lastWarIdRef.current === war.id) return;
    lastWarIdRef.current = war.id;
    const ourRoom = roomId;
    if (!war.winner_room) setShowResult("draw");
    else if (war.winner_room === ourRoom) setShowResult("victory");
    else {
      setShowResult("defeat");
      setMuteCountdown(MUTE_SECONDS);
    }
    // auto-dismiss
    window.setTimeout(() => setShowResult(null), 9000);
  }, [war, roomId]);

  // Mute countdown
  useEffect(() => {
    if (muteCountdown <= 0) return;
    const id = window.setInterval(() => setMuteCountdown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [muteCountdown]);

  // --- Actions ---
  const startWar = async () => {
    if (!isHost) return;
    setMatching(true);
    try {
      const { data, error } = await supabase.rpc("start_turf_war", { _room_id: roomId });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("no_opponent_available"))
          toast.error("لا توجد غرف نشطة متاحة للتحدي حاليًا");
        else if (msg.includes("already_in_war")) toast.error("غرفتك في حرب نشطة بالفعل");
        else if (msg.includes("not_room_host")) toast.error("المضيف فقط يمكنه بدء الحرب");
        else toast.error("تعذر بدء الحرب: " + msg);
      } else if (data) {
        setWar(data as unknown as WarRow);
        toast.success("تم إرسال التحدي! بانتظار رد الخصم...");
      }
    } finally {
      setMatching(false);
    }
  };

  const respond = async (accept: boolean) => {
    if (!war) return;
    const { error } = await supabase.rpc("respond_turf_war", {
      _war_id: war.id,
      _accept: accept,
      _duration_seconds: BATTLE_SECONDS,
    });
    if (error) toast.error(error.message);
    else toast.success(accept ? "بدأت الحرب!" : "تم رفض التحدي");
  };

  const cancel = async () => {
    if (!war) return;
    const { error } = await supabase.rpc("cancel_turf_war", { _war_id: war.id });
    if (error) toast.error(error.message);
  };

  const addPoints = async (amount: number) => {
    if (!war || war.status !== "active") return;
    const { error } = await supabase.rpc("add_turf_war_points", {
      _war_id: war.id,
      _room_id: roomId,
      _amount: amount,
    });
    if (error) toast.error(error.message);
  };

  // Hide finished/declined/cancelled wars from the persistent state
  useEffect(() => {
    if (!war) return;
    if (["finished", "declined", "cancelled", "expired"].includes(war.status)) {
      const t = window.setTimeout(() => setWar(null), 9500);
      return () => window.clearTimeout(t);
    }
  }, [war?.status]);

  // ----- UI -----
  const showIncomingChallenge =
    war && war.status === "pending" && currentUserId === war.host_b;
  const showOutgoingPending =
    war && war.status === "pending" && currentUserId === war.host_a;
  const battleOverlay = war && war.status === "active";

  return (
    <>
      {/* Trigger button — host only */}
      {isHost && !war && (
        <button
          onClick={startWar}
          disabled={matching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 text-white shadow-[0_0_18px_rgba(217,70,239,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          style={{ willChange: "transform" }}
        >
          <Swords className="w-3.5 h-3.5" />
          {matching ? "جاري البحث..." : "حرب المايكات"}
        </button>
      )}

      {/* Outgoing pending — small status pill */}
      {showOutgoingPending && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-fuchsia-900/40 border border-fuchsia-500/40 text-fuchsia-200">
          <Search className="w-3.5 h-3.5 animate-pulse" />
          بانتظار رد {opponentName || "الخصم"}...
          {isHost && (
            <button onClick={cancel} className="ml-1 text-fuchsia-200/70 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Incoming challenge modal */}
      {showIncomingChallenge &&
        createPortal(
          <IncomingChallenge
            challengerName={opponentName}
            onAccept={() => respond(true)}
            onDecline={() => respond(false)}
          />,
          document.body,
        )}

      {/* Active battle overlay */}
      {battleOverlay &&
        createPortal(
          <BattleOverlay
            ourRoomName={ourRoomName}
            opponentName={opponentName || "خصم"}
            timeLeft={timeLeft}
            scoreA={ourScore}
            scoreB={oppScore}
            pctA={ourPct}
            pctB={oppPct}
            isHost={isHost}
            onAddPoints={addPoints}
            onCancel={cancel}
          />,
          document.body,
        )}

      {/* Victory / defeat result */}
      {showResult &&
        createPortal(
          <ResultOverlay
            result={showResult}
            muteCountdown={muteCountdown}
            onClose={() => setShowResult(null)}
          />,
          document.body,
        )}
    </>
  );
}

// =============== Sub components ===============

function IncomingChallenge({
  challengerName,
  onAccept,
  onDecline,
}: {
  challengerName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.7, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-3xl p-6 text-center bg-gradient-to-b from-purple-900/90 via-fuchsia-900/80 to-pink-900/80 border border-fuchsia-400/40"
        style={{ boxShadow: "0 0 50px rgba(217,70,239,0.45)" }}
      >
        <motion.div
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="mx-auto mb-3"
          style={{ willChange: "transform" }}
        >
          <Swords className="w-14 h-14 text-yellow-300" style={{ filter: "drop-shadow(0 0 16px rgba(253,224,71,0.8))" }} />
        </motion.div>
        <h3 className="text-2xl font-black text-white mb-1">تحدي حرب مايكات!</h3>
        <p className="text-fuchsia-100/90 text-sm mb-1">غرفة <span className="font-bold text-yellow-200">{challengerName || "..."}</span></p>
        <p className="text-fuchsia-200/70 text-xs mb-5">تتحداكم في حرب مدتها 5 دقائق</p>
        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold text-sm border border-white/15 active:scale-95 transition-transform"
          >
            رفض
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-black text-sm shadow-[0_0_18px_rgba(217,70,239,0.55)] active:scale-95 transition-transform flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> قبول التحدي
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface OverlayProps {
  ourRoomName: string;
  opponentName: string;
  timeLeft: number;
  scoreA: number;
  scoreB: number;
  pctA: number;
  pctB: number;
  isHost: boolean;
  onAddPoints: (amount: number) => void;
  onCancel: () => void;
}

function BattleOverlay({
  ourRoomName,
  opponentName,
  timeLeft,
  scoreA,
  scoreB,
  pctA,
  pctB,
  isHost,
  onAddPoints,
  onCancel,
}: OverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex flex-col"
      style={{ willChange: "opacity", transform: "translateZ(0)" }}
    >
      <div className="pt-6 flex justify-center pointer-events-none">
        <NeonTimer seconds={timeLeft} />
      </div>

      <div className="px-4 mt-3">
        <VsBar pctA={pctA} pctB={pctB} scoreA={scoreA} scoreB={scoreB} />
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2 p-3 min-h-0">
        <SplitPanel side="A" name={ourRoomName} score={scoreA} />
        <SplitPanel side="B" name={opponentName} score={scoreB} />
      </div>

      <div className="px-4 pb-5 flex items-center gap-2">
        <button
          onClick={() => onAddPoints(100)}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(168,85,247,0.55)] active:scale-95 transition-transform"
          style={{ willChange: "transform" }}
        >
          +100 لـ {ourRoomName}
        </button>
        {isHost && (
          <button
            onClick={onCancel}
            className="px-3 py-3 rounded-xl bg-white/10 text-white text-xs font-bold"
          >
            إلغاء
          </button>
        )}
      </div>
    </motion.div>
  );
}

function NeonTimer({ seconds }: { seconds: number }) {
  const critical = seconds <= 30;
  return (
    <div
      className={`px-6 py-2 rounded-2xl border-2 ${
        critical ? "border-red-500" : "border-fuchsia-400"
      } bg-black/60`}
      style={{
        boxShadow: critical
          ? "0 0 24px rgba(239,68,68,0.7), inset 0 0 12px rgba(239,68,68,0.4)"
          : "0 0 24px rgba(217,70,239,0.7), inset 0 0 12px rgba(217,70,239,0.35)",
      }}
    >
      <span
        className={`font-mono text-3xl font-black tracking-widest ${
          critical ? "text-red-400 animate-pulse" : "text-fuchsia-200"
        }`}
        style={{
          textShadow: critical ? "0 0 12px rgba(239,68,68,0.9)" : "0 0 12px rgba(217,70,239,0.9)",
        }}
      >
        {fmtTime(seconds)}
      </span>
    </div>
  );
}

function VsBar({ pctA, pctB, scoreA, scoreB }: { pctA: number; pctB: number; scoreA: number; scoreB: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-black mb-1">
        <span className="text-purple-300">🟣 {scoreA.toLocaleString()}</span>
        <span className="text-white/70">VS</span>
        <span className="text-pink-300">{scoreB.toLocaleString()} 🩷</span>
      </div>
      <div className="relative h-5 rounded-full overflow-hidden bg-white/10 border border-white/15 flex">
        <motion.div
          animate={{ width: `${pctA}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400"
          style={{
            boxShadow: "inset 0 0 12px rgba(255,255,255,0.3), 0 0 14px rgba(168,85,247,0.6)",
            willChange: "width",
          }}
        />
        <motion.div
          animate={{ width: `${pctB}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="h-full bg-gradient-to-l from-pink-500 via-rose-400 to-pink-300"
          style={{
            boxShadow: "inset 0 0 12px rgba(255,255,255,0.3), 0 0 14px rgba(244,114,182,0.6)",
            willChange: "width",
          }}
        />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/40" />
      </div>
    </div>
  );
}

function SplitPanel({ side, name, score }: { side: "A" | "B"; name: string; score: number }) {
  const seats = useMemo(() => Array.from({ length: 8 }), []);
  const accent = side === "A" ? "from-purple-700/40 to-fuchsia-900/30" : "from-pink-700/40 to-rose-900/30";
  const ring = side === "A" ? "ring-fuchsia-500/50" : "ring-pink-500/50";
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-b ${accent} p-3 flex flex-col overflow-hidden`}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black text-white/90 truncate max-w-[60%]">{name}</span>
        <span
          className={`text-xs font-black px-2 py-0.5 rounded-full bg-black/40 ring-1 ${ring} ${
            side === "A" ? "text-fuchsia-300" : "text-pink-300"
          }`}
        >
          {score.toLocaleString()}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 flex-1 content-start">
        {seats.map((_, i) => (
          <div
            key={i}
            className={`relative aspect-square rounded-full bg-black/30 border ${
              side === "A" ? "border-fuchsia-500/30" : "border-pink-500/30"
            } flex items-center justify-center`}
          >
            <span className="text-[10px] text-white/40">🎙️</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultOverlay({
  result,
  muteCountdown,
  onClose,
}: {
  result: "victory" | "defeat" | "draw";
  muteCountdown: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-sm flex items-center justify-center overflow-hidden"
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
      >
        <X className="w-4 h-4" />
      </button>

      {result === "victory" && <VictoryFx />}
      {result === "defeat" && <DefeatFx muteCountdown={muteCountdown} />}
      {result === "draw" && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-3">🤝</div>
          <div className="text-4xl font-black text-white">تعادل</div>
        </motion.div>
      )}
    </motion.div>
  );
}

function VictoryFx() {
  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2 + Math.random() * 1.6,
        size: 6 + Math.random() * 8,
        rot: Math.random() * 360,
        color: ["#fde047", "#facc15", "#f59e0b", "#fbbf24", "#fff8b8"][i % 5],
      })),
    [],
  );
  const fireworks = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        id: i,
        cx: 20 + Math.random() * 60,
        cy: 25 + Math.random() * 30,
        delay: i * 0.4,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {confetti.map((c) => (
        <motion.span
          key={c.id}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: c.rot + 720, opacity: [1, 1, 0] }}
          transition={{ duration: c.dur, delay: c.delay, ease: "linear" }}
          className="absolute block"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size * 0.4,
            background: c.color,
            borderRadius: 2,
            boxShadow: `0 0 8px ${c.color}`,
            willChange: "transform, opacity",
          }}
        />
      ))}
      {fireworks.map((fw) => (
        <div key={fw.id} className="absolute" style={{ left: `${fw.cx}%`, top: `${fw.cy}%` }}>
          {Array.from({ length: 14 }).map((_, j) => {
            const angle = (j / 14) * Math.PI * 2;
            const dx = Math.cos(angle) * 80;
            const dy = Math.sin(angle) * 80;
            return (
              <motion.span
                key={j}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: dx, y: dy, opacity: 0, scale: 0.4 }}
                transition={{ duration: 1.1, delay: fw.delay, ease: "easeOut", repeat: 2, repeatDelay: 0.6 }}
                className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
                style={{ boxShadow: "0 0 10px #fde047", willChange: "transform, opacity" }}
              />
            );
          })}
        </div>
      ))}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: -30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
      >
        <Crown className="w-16 h-16 mx-auto text-yellow-300" style={{ filter: "drop-shadow(0 0 18px rgba(253,224,71,0.9))" }} />
        <div
          className="mt-2 text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600"
          style={{ textShadow: "0 0 30px rgba(253,224,71,0.7)" }}
        >
          VICTORY
        </div>
        <div className="mt-1 text-sm font-bold text-yellow-200/90">انتصرنا في حرب المايكات 👑</div>
      </motion.div>
    </div>
  );
}

function DefeatFx({ muteCountdown }: { muteCountdown: number }) {
  useEffect(() => {
    try {
      const a = new Audio("https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3");
      a.volume = 0.3;
      a.play().catch(() => {});
    } catch {}
  }, []);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.35] }}
        transition={{ duration: 0.9 }}
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 40%, rgba(186,230,253,0.55), rgba(8,47,73,0.0) 70%)",
        }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-70" viewBox="0 0 400 800" preserveAspectRatio="none">
        <g stroke="rgba(224,242,254,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M40 80 L160 220 L120 380 L260 520 L200 720" />
          <path d="M160 220 L300 170" />
          <path d="M160 220 L80 320" />
          <path d="M120 380 L40 480" />
          <path d="M260 520 L380 460" />
          <path d="M320 60 L260 180 L340 280 L280 400 L380 580" />
        </g>
      </svg>
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <Snowflake className="w-16 h-16 mx-auto text-cyan-200" style={{ filter: "drop-shadow(0 0 18px rgba(125,211,252,0.9))" }} />
        <div
          className="mt-2 text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-sky-300 to-blue-500"
          style={{ textShadow: "0 0 30px rgba(125,211,252,0.7)" }}
        >
          DEFEAT
        </div>
        <div className="mt-2 text-sm font-bold text-sky-200/90 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3" /> تم تجميد المايكات
        </div>
        {muteCountdown > 0 && (
          <div className="mt-1 text-xs font-black text-cyan-200 flex items-center justify-center gap-1">
            <VolumeX className="w-3 h-3" />
            كتم {muteCountdown}ث
          </div>
        )}
      </motion.div>
    </div>
  );
}
