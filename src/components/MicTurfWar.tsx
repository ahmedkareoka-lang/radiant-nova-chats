import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Flame, Search, Snowflake, Swords, Volume2, VolumeX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * MicTurfWar (حرب المايكات الساخنة)
 * - Host-only trigger to start a 5:00 split-screen battle vs. a simulated opponent room.
 * - Live VS bar (Neon Purple vs Neon Pink) with simulation buttons.
 * - Victory: golden confetti + fireworks + glowing crown banner.
 * - Defeat: ice-crack frost overlay + 30s "mute" mock state.
 *
 * Self-contained component. Place once inside VoiceRoom alongside isHost flag.
 */

interface MicTurfWarProps {
  roomId: string;
  isHost: boolean;
  ourRoomName?: string;
}

type Phase = "idle" | "matching" | "battle" | "victory" | "defeat";

const BATTLE_SECONDS = 5 * 60;
const MUTE_SECONDS = 30;

const FAKE_OPPONENTS = [
  "👑 ملوك الصوت",
  "🔥 أسود العرب",
  "💎 قصر الماس",
  "⚡️ صقور الليل",
  "🌙 همسات القمر",
  "🎵 نجوم الطرب",
];

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

export default function MicTurfWar({ roomId, isHost, ourRoomName = "غرفتنا" }: MicTurfWarProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [opponentName, setOpponentName] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(BATTLE_SECONDS);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [muteCountdown, setMuteCountdown] = useState<number>(0);
  const channelRef = useRef<any>(null);
  const tickRef = useRef<number | null>(null);

  // Broadcast battle state to all room members for split-screen sync.
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase.channel(`turfwar-${roomId}`);
    ch.on("broadcast", { event: "tw-state" }, ({ payload }) => {
      if (!payload) return;
      const p = payload as {
        phase: Phase;
        opponentName: string;
        timeLeft: number;
        scoreA: number;
        scoreB: number;
      };
      setPhase(p.phase);
      setOpponentName(p.opponentName);
      setTimeLeft(p.timeLeft);
      setScoreA(p.scoreA);
      setScoreB(p.scoreB);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  const broadcast = useCallback(
    (next: Partial<{ phase: Phase; opponentName: string; timeLeft: number; scoreA: number; scoreB: number }>) => {
      const payload = {
        phase: next.phase ?? phase,
        opponentName: next.opponentName ?? opponentName,
        timeLeft: next.timeLeft ?? timeLeft,
        scoreA: next.scoreA ?? scoreA,
        scoreB: next.scoreB ?? scoreB,
      };
      channelRef.current?.send({ type: "broadcast", event: "tw-state", payload });
    },
    [phase, opponentName, timeLeft, scoreA, scoreB],
  );

  // Timer
  useEffect(() => {
    if (phase !== "battle") return;
    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          // determine winner using latest scores
          setScoreA((a) => {
            setScoreB((b) => {
              const won = a >= b;
              const nextPhase: Phase = won ? "victory" : "defeat";
              setPhase(nextPhase);
              if (isHost) {
                channelRef.current?.send({
                  type: "broadcast",
                  event: "tw-state",
                  payload: { phase: nextPhase, opponentName, timeLeft: 0, scoreA: a, scoreB: b },
                });
              }
              if (!won) setMuteCountdown(MUTE_SECONDS);
              return b;
            });
            return a;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [phase, isHost, opponentName]);

  // Host syncs timer to room every 2s
  useEffect(() => {
    if (!isHost || phase !== "battle") return;
    const id = window.setInterval(() => {
      broadcast({});
    }, 2000);
    return () => window.clearInterval(id);
  }, [isHost, phase, broadcast]);

  // Mute countdown after defeat
  useEffect(() => {
    if (muteCountdown <= 0) return;
    const id = window.setInterval(() => setMuteCountdown((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [muteCountdown]);

  // Auto close victory/defeat
  useEffect(() => {
    if (phase === "victory" || phase === "defeat") {
      const id = window.setTimeout(() => {
        setPhase("idle");
        setScoreA(0);
        setScoreB(0);
        setTimeLeft(BATTLE_SECONDS);
      }, 8000);
      return () => window.clearTimeout(id);
    }
  }, [phase]);

  // Matching simulation
  const startMatchmaking = () => {
    if (!isHost) return;
    setPhase("matching");
    setOpponentName("");
    let i = 0;
    const id = window.setInterval(() => {
      setOpponentName(FAKE_OPPONENTS[i % FAKE_OPPONENTS.length]);
      i++;
    }, 280);
    window.setTimeout(() => {
      window.clearInterval(id);
      const final = FAKE_OPPONENTS[Math.floor(Math.random() * FAKE_OPPONENTS.length)];
      setOpponentName(final);
      setTimeLeft(BATTLE_SECONDS);
      setScoreA(0);
      setScoreB(0);
      setPhase("battle");
      broadcast({ phase: "battle", opponentName: final, timeLeft: BATTLE_SECONDS, scoreA: 0, scoreB: 0 });
      toast.success(`بدأت الحرب ضد ${final}!`);
    }, 2800);
  };

  const cancel = () => {
    setPhase("idle");
    setOpponentName("");
    broadcast({ phase: "idle", timeLeft: BATTLE_SECONDS, scoreA: 0, scoreB: 0 });
  };

  const addScoreA = () => {
    setScoreA((v) => {
      const nv = v + 100;
      broadcast({ scoreA: nv });
      return nv;
    });
  };
  const addScoreB = () => {
    setScoreB((v) => {
      const nv = v + 100;
      broadcast({ scoreB: nv });
      return nv;
    });
  };

  const total = scoreA + scoreB;
  const pctA = total === 0 ? 50 : Math.round((scoreA / total) * 100);
  const pctB = 100 - pctA;

  const overlay =
    phase === "matching" || phase === "battle" || phase === "victory" || phase === "defeat";

  return (
    <>
      {/* Trigger button — host only */}
      {isHost && (
        <button
          onClick={startMatchmaking}
          disabled={phase !== "idle"}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 text-white shadow-[0_0_18px_rgba(217,70,239,0.55)] disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
          style={{ willChange: "transform" }}
        >
          <Swords className="w-3.5 h-3.5" />
          حرب المايكات
        </button>
      )}

      {overlay &&
        createPortal(
          <BattleOverlay
            phase={phase}
            opponentName={opponentName}
            ourRoomName={ourRoomName}
            timeLeft={timeLeft}
            scoreA={scoreA}
            scoreB={scoreB}
            pctA={pctA}
            pctB={pctB}
            isHost={isHost}
            muteCountdown={muteCountdown}
            onCancel={cancel}
            onAddA={addScoreA}
            onAddB={addScoreB}
            onClose={() => setPhase("idle")}
          />,
          document.body,
        )}
    </>
  );
}

interface OverlayProps {
  phase: Phase;
  opponentName: string;
  ourRoomName: string;
  timeLeft: number;
  scoreA: number;
  scoreB: number;
  pctA: number;
  pctB: number;
  isHost: boolean;
  muteCountdown: number;
  onCancel: () => void;
  onAddA: () => void;
  onAddB: () => void;
  onClose: () => void;
}

function BattleOverlay({
  phase,
  opponentName,
  ourRoomName,
  timeLeft,
  scoreA,
  scoreB,
  pctA,
  pctB,
  isHost,
  muteCountdown,
  onCancel,
  onAddA,
  onAddB,
  onClose,
}: OverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-sm flex flex-col"
      style={{ willChange: "opacity", transform: "translateZ(0)" }}
    >
      {/* Close (host only, idle/post) */}
      {(phase === "victory" || phase === "defeat") && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {phase === "matching" && (
        <Matchmaking opponentName={opponentName} onCancel={isHost ? onCancel : undefined} />
      )}

      {(phase === "battle" || phase === "victory" || phase === "defeat") && (
        <>
          {/* Neon timer */}
          <div className="pt-6 flex justify-center pointer-events-none">
            <NeonTimer seconds={timeLeft} />
          </div>

          {/* VS Progress bar */}
          <div className="px-4 mt-3">
            <VsBar pctA={pctA} pctB={pctB} scoreA={scoreA} scoreB={scoreB} />
          </div>

          {/* Split screen */}
          <div className="flex-1 grid grid-cols-2 gap-2 p-3 min-h-0">
            <SplitPanel
              side="A"
              name={ourRoomName}
              score={scoreA}
              winner={phase === "victory"}
              loser={phase === "defeat"}
              muteCountdown={phase === "defeat" ? muteCountdown : 0}
            />
            <SplitPanel
              side="B"
              name={opponentName || "خصم"}
              score={scoreB}
              winner={phase === "defeat"}
              loser={phase === "victory"}
              muteCountdown={0}
            />
          </div>

          {/* Sim controls during battle */}
          {phase === "battle" && (
            <div className="px-4 pb-5 flex items-center gap-2">
              <button
                onClick={onAddA}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(168,85,247,0.55)] active:scale-95 transition-transform"
                style={{ willChange: "transform" }}
              >
                +100 لـ {ourRoomName}
              </button>
              <button
                onClick={onAddB}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-extrabold shadow-[0_0_18px_rgba(244,114,182,0.55)] active:scale-95 transition-transform"
                style={{ willChange: "transform" }}
              >
                +100 للخصم
              </button>
              {isHost && (
                <button
                  onClick={onCancel}
                  className="px-3 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  إنهاء
                </button>
              )}
            </div>
          )}

          {phase === "victory" && <VictoryFx />}
          {phase === "defeat" && <DefeatFx />}
        </>
      )}
    </motion.div>
  );
}

function Matchmaking({ opponentName, onCancel }: { opponentName: string; onCancel?: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-24 h-24 rounded-full border-4 border-fuchsia-500 border-t-transparent shadow-[0_0_40px_rgba(217,70,239,0.6)] mb-6 flex items-center justify-center"
        style={{ willChange: "transform" }}
      >
        <Search className="w-10 h-10 text-fuchsia-300" />
      </motion.div>
      <p className="text-white/80 text-sm mb-2">جاري البحث عن غرفة منافسة...</p>
      <motion.p
        key={opponentName}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-400"
      >
        {opponentName || "..."}
      </motion.p>
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-8 px-5 py-2 rounded-full bg-white/10 text-white text-xs font-bold"
        >
          إلغاء
        </button>
      )}
    </div>
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
          textShadow: critical
            ? "0 0 12px rgba(239,68,68,0.9)"
            : "0 0 12px rgba(217,70,239,0.9)",
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

function SplitPanel({
  side,
  name,
  score,
  winner,
  loser,
  muteCountdown,
}: {
  side: "A" | "B";
  name: string;
  score: number;
  winner: boolean;
  loser: boolean;
  muteCountdown: number;
}) {
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
            {loser && <FrostSeat />}
          </div>
        ))}
      </div>

      {loser && muteCountdown > 0 && (
        <div className="mt-2 text-center text-[10px] font-bold text-cyan-200 flex items-center justify-center gap-1">
          <VolumeX className="w-3 h-3" />
          مايكات مجمدة {muteCountdown}ث
        </div>
      )}
      {winner && (
        <div className="mt-2 text-center text-[10px] font-black text-yellow-300 flex items-center justify-center gap-1">
          <Crown className="w-3 h-3" /> الفائز
        </div>
      )}

      {/* Frost overlay full panel */}
      {loser && <FrostOverlay />}
    </div>
  );
}

function FrostSeat() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 rounded-full flex items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(186,230,253,0.85), rgba(56,189,248,0.4) 60%, rgba(8,47,73,0.6) 100%)",
        boxShadow: "inset 0 0 8px rgba(255,255,255,0.6), 0 0 8px rgba(56,189,248,0.5)",
      }}
    >
      <Snowflake className="w-3.5 h-3.5 text-white" />
    </motion.div>
  );
}

function FrostOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="pointer-events-none absolute inset-0 rounded-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(186,230,253,0.25), rgba(125,211,252,0.18) 40%, rgba(14,165,233,0.2))",
        backdropFilter: "blur(2px)",
      }}
    >
      {/* SVG ice cracks */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 300" preserveAspectRatio="none">
        <g stroke="rgba(224,242,254,0.9)" strokeWidth="1.2" fill="none" strokeLinecap="round">
          <path d="M20 30 L80 90 L60 160 L120 210 L100 280" />
          <path d="M80 90 L140 70" />
          <path d="M80 90 L40 130" />
          <path d="M60 160 L20 200" />
          <path d="M120 210 L180 180" />
          <path d="M120 210 L160 260" />
          <path d="M160 20 L130 70 L170 110 L140 160 L180 220" />
          <path d="M170 110 L200 90" />
        </g>
      </svg>
    </motion.div>
  );
}

function VictoryFx() {
  // Golden confetti + simple fireworks
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
        <div
          key={fw.id}
          className="absolute"
          style={{ left: `${fw.cx}%`, top: `${fw.cy}%` }}
        >
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

      {/* Crown banner */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: -30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
      >
        <Crown
          className="w-16 h-16 mx-auto text-yellow-300"
          style={{ filter: "drop-shadow(0 0 18px rgba(253,224,71,0.9))" }}
        />
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

function DefeatFx() {
  // Play short mute placeholder
  useEffect(() => {
    try {
      const a = new Audio("https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3");
      a.volume = 0.3;
      a.play().catch(() => {});
    } catch {}
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Frost flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.35] }}
        transition={{ duration: 0.9 }}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(186,230,253,0.55), rgba(8,47,73,0.0) 70%)",
        }}
      />
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
      >
        <Snowflake
          className="w-16 h-16 mx-auto text-cyan-200"
          style={{ filter: "drop-shadow(0 0 18px rgba(125,211,252,0.9))" }}
        />
        <div
          className="mt-2 text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 via-sky-300 to-blue-500"
          style={{ textShadow: "0 0 30px rgba(125,211,252,0.7)" }}
        >
          DEFEAT
        </div>
        <div className="mt-1 text-sm font-bold text-sky-200/90 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3" /> تم تجميد المايكات
        </div>
      </motion.div>
    </div>
  );
}
