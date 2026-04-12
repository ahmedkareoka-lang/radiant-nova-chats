import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RouletteGameProps {
  onClose: () => void;
  currentUserId: string | null;
}

const NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

type BetType = { type: "number"; value: number } | { type: "color"; value: "red" | "black" } | { type: "parity"; value: "even" | "odd" } | { type: "half"; value: "1-18" | "19-36" };

const getColor = (n: number) => n === 0 ? "green" : RED_NUMBERS.includes(n) ? "red" : "black";

const RouletteGame = ({ onClose, currentUserId }: RouletteGameProps) => {
  const [bet, setBet] = useState<BetType | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const spinDeg = useRef(0);

  const calculateWin = (r: number, b: BetType): number => {
    if (b.type === "number" && b.value === r) return betAmount * 35;
    if (b.type === "color" && b.value === getColor(r)) return betAmount * 2;
    if (b.type === "parity") {
      if (r === 0) return 0;
      const isEven = r % 2 === 0;
      if ((b.value === "even" && isEven) || (b.value === "odd" && !isEven)) return betAmount * 2;
    }
    if (b.type === "half") {
      if (r === 0) return 0;
      if ((b.value === "1-18" && r <= 18) || (b.value === "19-36" && r > 18)) return betAmount * 2;
    }
    return 0;
  };

  const spin = async () => {
    if (!bet || !currentUserId || spinning) return;
    
    // Deduct coins
    const { error } = await supabase.rpc("deduct_coins", { _user_id: currentUserId, _amount: betAmount });
    if (error) { toast.error("رصيدك غير كافٍ!"); return; }

    setSpinning(true);
    setResult(null);
    setWinAmount(null);

    const r = Math.floor(Math.random() * 37);
    const extraRotations = 5 * 360;
    const sliceAngle = 360 / 37;
    const targetAngle = extraRotations + (360 - (r * sliceAngle));
    spinDeg.current = targetAngle;

    setTimeout(async () => {
      setResult(r);
      const win = calculateWin(r, bet);
      setWinAmount(win);
      setSpinning(false);

      if (win > 0) {
        // Add winnings - use diamonds as payout
        await supabase.rpc("add_diamonds_add_charisma", { _user_id: currentUserId, _diamond_amount: win, _xp_amount: Math.floor(win / 10) });
        toast.success(`فزت بـ ${win} ماسة! 💎🎉`);
      } else {
        toast.error(`لم تفز هذه المرة. الرقم: ${r}`);
      }
    }, 4000);
  };

  const BET_AMOUNTS = [50, 100, 500, 1000, 5000];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-lg overflow-auto">
      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-yellow-300 flex items-center gap-2">🎰 Premium Roulette</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Wheel */}
        <div className="flex justify-center mb-4">
          <div className="relative w-56 h-56">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl">▼</div>
            <motion.div
              className="w-56 h-56 rounded-full border-4 border-yellow-500/50 bg-gradient-to-br from-green-900 via-gray-900 to-red-900 flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.3)]"
              animate={{ rotate: spinning ? spinDeg.current : 0 }}
              transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 border-2 border-yellow-400 flex items-center justify-center">
                <span className="text-2xl font-black text-yellow-200">
                  {result !== null ? result : "N"}
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Result */}
        {result !== null && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className={`text-center mb-4 p-3 rounded-xl ${winAmount && winAmount > 0 ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-red-500/10 border border-red-500/20"}`}>
            <p className="text-sm font-bold">
              الرقم: <span className={`text-lg ${getColor(result) === "red" ? "text-red-400" : getColor(result) === "black" ? "text-white" : "text-green-400"}`}>{result}</span>
              {" "}<span className={getColor(result) === "red" ? "text-red-400" : getColor(result) === "black" ? "text-gray-300" : "text-green-400"}>
                ({getColor(result) === "red" ? "🔴" : getColor(result) === "black" ? "⚫" : "🟢"})
              </span>
            </p>
            {winAmount !== null && winAmount > 0 && (
              <p className="text-yellow-300 font-black text-lg mt-1">+{winAmount} 💎</p>
            )}
          </motion.div>
        )}

        {/* Bet Amount */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1.5">مبلغ الرهان</p>
          <div className="flex gap-2">
            {BET_AMOUNTS.map(a => (
              <button key={a} onClick={() => setBetAmount(a)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${betAmount === a ? "bg-gradient-to-r from-yellow-600 to-yellow-800 text-white" : "bg-secondary text-muted-foreground"}`}>
                <CurrencyIcon type="gold" size="xs" /> {a}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Bets */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button onClick={() => setBet({ type: "color", value: "red" })}
            className={`py-2.5 rounded-xl text-xs font-bold ${bet?.type === "color" && bet.value === "red" ? "bg-red-600 text-white" : "bg-red-900/30 text-red-400 border border-red-500/20"}`}>
            🔴 أحمر
          </button>
          <button onClick={() => setBet({ type: "color", value: "black" })}
            className={`py-2.5 rounded-xl text-xs font-bold ${bet?.type === "color" && bet.value === "black" ? "bg-gray-600 text-white" : "bg-gray-800/50 text-gray-300 border border-gray-500/20"}`}>
            ⚫ أسود
          </button>
          <button onClick={() => setBet({ type: "parity", value: "even" })}
            className={`py-2.5 rounded-xl text-xs font-bold ${bet?.type === "parity" && bet.value === "even" ? "bg-purple-600 text-white" : "bg-purple-900/20 text-purple-300 border border-purple-500/20"}`}>
            زوجي
          </button>
          <button onClick={() => setBet({ type: "parity", value: "odd" })}
            className={`py-2.5 rounded-xl text-xs font-bold ${bet?.type === "parity" && bet.value === "odd" ? "bg-purple-600 text-white" : "bg-purple-900/20 text-purple-300 border border-purple-500/20"}`}>
            فردي
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setBet({ type: "half", value: "1-18" })}
            className={`py-2 rounded-xl text-xs font-bold ${bet?.type === "half" && bet.value === "1-18" ? "bg-yellow-600 text-white" : "bg-secondary text-muted-foreground"}`}>
            1-18
          </button>
          <button onClick={() => setBet({ type: "half", value: "19-36" })}
            className={`py-2 rounded-xl text-xs font-bold ${bet?.type === "half" && bet.value === "19-36" ? "bg-yellow-600 text-white" : "bg-secondary text-muted-foreground"}`}>
            19-36
          </button>
        </div>

        {/* Number Grid */}
        <div className="grid grid-cols-6 gap-1.5 mb-4">
          {NUMBERS.map(n => (
            <button key={n} onClick={() => setBet({ type: "number", value: n })}
              className={`py-2 rounded-lg text-[11px] font-bold transition-all ${
                bet?.type === "number" && bet.value === n
                  ? "ring-2 ring-yellow-400 scale-110"
                  : ""
              } ${getColor(n) === "red" ? "bg-red-700/60 text-white" : getColor(n) === "black" ? "bg-gray-700/60 text-white" : "bg-green-700/60 text-white"}`}>
              {n}
            </button>
          ))}
        </div>

        {/* Spin Button */}
        <button onClick={spin} disabled={!bet || spinning}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 font-black text-lg text-black disabled:opacity-40 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(234,179,8,0.4)]">
          {spinning ? (
            <><RotateCcw className="w-5 h-5 animate-spin" /> جارٍ الدوران...</>
          ) : (
            <>🎰 دوّر العجلة - {betAmount} <CurrencyIcon type="gold" size="sm" /></>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default RouletteGame;
