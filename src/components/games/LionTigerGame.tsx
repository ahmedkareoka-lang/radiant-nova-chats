import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LionTigerGameProps {
  onClose: () => void;
  currentUserId: string | null;
  roomId: string;
}

type Choice = "lion" | "tiger" | "tie";

const TIMER_SECONDS = 15;

const LionTigerGame = ({ onClose, currentUserId, roomId }: LionTigerGameProps) => {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [phase, setPhase] = useState<"betting" | "reveal" | "result">("betting");
  const [result, setResult] = useState<Choice | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto timer
  useEffect(() => {
    if (phase !== "betting") return;
    setTimer(TIMER_SECONDS);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  const handleReveal = async () => {
    if (phase !== "betting") return;
    setPhase("reveal");

    // Generate result
    const rand = Math.random();
    let r: Choice;
    if (rand < 0.45) r = "lion";
    else if (rand < 0.90) r = "tiger";
    else r = "tie";

    setTimeout(async () => {
      setResult(r);
      setPhase("result");

      if (!choice || !currentUserId) return;

      // Deduct bet
      const { error } = await supabase.rpc("deduct_coins", { _user_id: currentUserId, _amount: betAmount });
      if (error) { toast.error("رصيدك غير كافٍ!"); return; }

      let win = 0;
      if (choice === r) {
        if (r === "tie") win = betAmount * 30;
        else win = betAmount * 2;
      }

      if (win > 0) {
        await supabase.rpc("add_diamonds_add_charisma", { _user_id: currentUserId, _diamond_amount: win, _xp_amount: Math.floor(win / 10) });
        toast.success(`فزت بـ ${win} ماسة! 💎🎉`);
      } else if (choice) {
        toast.error("خسرت هذه الجولة!");
      }
      setWinAmount(win);
    }, 2000);
  };

  const playAgain = () => {
    setChoice(null);
    setResult(null);
    setWinAmount(0);
    setPhase("betting");
  };

  const BET_AMOUNTS = [50, 100, 500, 1000, 5000];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-lg overflow-auto">
      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-yellow-300 flex items-center gap-2">🦁 Lion vs Tiger 🐯</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Timer */}
        {phase === "betting" && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <Timer className="w-4 h-4 text-yellow-400" />
            <span className={`text-2xl font-black ${timer <= 5 ? "text-red-400 animate-pulse" : "text-yellow-300"}`}>
              {timer}s
            </span>
          </div>
        )}

        {/* Arena */}
        <div className="relative flex items-center justify-center gap-6 mb-6 py-8">
          {/* Lion */}
          <motion.div
            animate={phase === "reveal" ? { x: [0, 30, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }}
            className="text-center"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl border-4 transition-all ${
              result === "lion" ? "border-yellow-400 bg-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                : choice === "lion" ? "border-yellow-500/50 bg-yellow-900/20" : "border-border bg-secondary"
            }`}>
              🦁
            </div>
            <p className="text-sm font-bold mt-2 text-yellow-300">Lion</p>
            <p className="text-[10px] text-muted-foreground">X2</p>
          </motion.div>

          {/* VS */}
          <div className="text-center">
            <motion.span
              animate={phase === "reveal" ? { scale: [1, 1.5, 1], rotate: [0, 15, -15, 0] } : {}}
              transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }}
              className="text-3xl font-black text-red-500"
            >
              ⚡VS⚡
            </motion.span>
            {result === "tie" && phase === "result" && (
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-black text-sm mt-1">
                TIE! X30 🎉
              </motion.p>
            )}
          </div>

          {/* Tiger */}
          <motion.div
            animate={phase === "reveal" ? { x: [0, -30, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }}
            className="text-center"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl border-4 transition-all ${
              result === "tiger" ? "border-orange-400 bg-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.5)]"
                : choice === "tiger" ? "border-orange-500/50 bg-orange-900/20" : "border-border bg-secondary"
            }`}>
              🐯
            </div>
            <p className="text-sm font-bold mt-2 text-orange-300">Tiger</p>
            <p className="text-[10px] text-muted-foreground">X2</p>
          </motion.div>
        </div>

        {/* Bet Amount */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1.5">مبلغ الرهان</p>
          <div className="flex gap-2">
            {BET_AMOUNTS.map(a => (
              <button key={a} onClick={() => setBetAmount(a)} disabled={phase !== "betting"}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${betAmount === a ? "bg-gradient-to-r from-yellow-600 to-yellow-800 text-white" : "bg-secondary text-muted-foreground"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Betting Buttons */}
        {phase === "betting" && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button onClick={() => setChoice("lion")}
              className={`py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${choice === "lion" ? "bg-yellow-600/30 border-2 border-yellow-400 scale-105" : "bg-secondary border border-border"}`}>
              🦁
              <span className="text-yellow-300">Lion</span>
              <span className="text-[10px] text-muted-foreground">X2</span>
            </button>
            <button onClick={() => setChoice("tie")}
              className={`py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${choice === "tie" ? "bg-purple-600/30 border-2 border-purple-400 scale-105" : "bg-secondary border border-border"}`}>
              🤝
              <span className="text-purple-300">Tie</span>
              <span className="text-[10px] text-muted-foreground">X30</span>
            </button>
            <button onClick={() => setChoice("tiger")}
              className={`py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-1 transition-all ${choice === "tiger" ? "bg-orange-600/30 border-2 border-orange-400 scale-105" : "bg-secondary border border-border"}`}>
              🐯
              <span className="text-orange-300">Tiger</span>
              <span className="text-[10px] text-muted-foreground">X2</span>
            </button>
          </div>
        )}

        {/* Confirm Bet */}
        {phase === "betting" && (
          <button onClick={handleReveal} disabled={!choice}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 font-black text-lg text-white disabled:opacity-40 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            {choice ? `راهن ${betAmount} على ${choice === "lion" ? "🦁" : choice === "tiger" ? "🐯" : "🤝"}` : "اختر رهانك"}
          </button>
        )}

        {/* Result */}
        {phase === "result" && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center space-y-3">
            <p className="text-lg font-black">
              {result === "lion" ? "🦁 Lion فاز!" : result === "tiger" ? "🐯 Tiger فاز!" : "🤝 تعادل!"}
            </p>
            {winAmount > 0 && (
              <p className="text-2xl font-black text-yellow-300">+{winAmount} 💎</p>
            )}
            <button onClick={playAgain}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 font-bold text-black">
              🔄 جولة جديدة
            </button>
          </motion.div>
        )}

        {/* Odds Info */}
        <div className="mt-6 p-3 rounded-xl bg-secondary/50 border border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            🦁 Lion: X2 | 🐯 Tiger: X2 | 🤝 Tie: X30
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LionTigerGame;
