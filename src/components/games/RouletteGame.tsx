import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Users, Trophy } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RouletteGameProps {
  onClose: () => void;
  currentUserId: string | null;
}

const NUMBERS = Array.from({ length: 37 }, (_, i) => i);
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

type BetType = 
  | { type: "number"; value: number }
  | { type: "color"; value: "red" | "black" }
  | { type: "parity"; value: "even" | "odd" }
  | { type: "range"; value: "0" | "1-12" | "13-24" | "25-36" };

const getColor = (n: number) => n === 0 ? "green" : RED_NUMBERS.includes(n) ? "red" : "black";

const RouletteGame = ({ onClose, currentUserId }: RouletteGameProps) => {
  const [bet, setBet] = useState<BetType | null>(null);
  const [betAmount, setBetAmount] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timer, setTimer] = useState(30);
  const [phase, setPhase] = useState<"betting" | "spinning" | "result">("betting");
  const [balance, setBalance] = useState<number>(0);
  const spinDeg = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch user balance
  useEffect(() => {
    if (!currentUserId) return;
    const fetchBalance = async () => {
      const { data } = await supabase.from("profiles").select("coins").eq("id", currentUserId).single();
      if (data) setBalance(data.coins);
    };
    fetchBalance();
  }, [currentUserId, result]);

  // Auto timer for betting phase
  useEffect(() => {
    if (phase !== "betting") return;
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (bet) spin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, roundNumber]);

  const calculateWin = (r: number, b: BetType): number => {
    if (b.type === "number" && b.value === r) return betAmount * 36;
    if (b.type === "color" && r !== 0 && b.value === getColor(r)) return betAmount * 2;
    if (b.type === "parity") {
      if (r === 0) return 0;
      const isEven = r % 2 === 0;
      if ((b.value === "even" && isEven) || (b.value === "odd" && !isEven)) return betAmount * 2;
    }
    if (b.type === "range") {
      if (r === 0) { return b.value === "0" ? betAmount * 36 : 0; }
      if (b.value === "1-12" && r >= 1 && r <= 12) return betAmount * 3;
      if (b.value === "13-24" && r >= 13 && r <= 24) return betAmount * 3;
      if (b.value === "25-36" && r >= 25 && r <= 36) return betAmount * 3;
    }
    return 0;
  };

  const spin = async () => {
    if (!bet || !currentUserId || spinning) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const { error } = await supabase.rpc("deduct_coins", { _user_id: currentUserId, _amount: betAmount });
    if (error) { toast.error("رصيدك غير كافٍ!"); return; }

    setPhase("spinning");
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
      setPhase("result");

      if (win > 0) {
        await supabase.rpc("add_diamonds_add_charisma", { _user_id: currentUserId, _diamond_amount: win, _xp_amount: Math.floor(win / 10) });
      }
    }, 4000);
  };

  const playAgain = () => {
    setBet(null);
    setResult(null);
    setWinAmount(null);
    setRoundNumber(prev => prev + 1);
    setPhase("betting");
  };

  const BET_AMOUNTS = [50, 100, 500, 1000, 5000, 25000];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] overflow-auto"
      style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #2d0f0f 30%, #1a0a15 70%, #0d0515 100%)" }}>
      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-black italic tracking-tighter" style={{ color: "#f5c842", textShadow: "0 0 20px rgba(245,200,66,0.5)" }}>
            Roulette
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Round counter */}
        <div className="text-center mb-3">
          <div className="inline-block px-6 py-1.5 rounded-full border border-purple-500/40 bg-purple-900/30">
            <span className="text-sm font-bold text-purple-300">الجولة: {roundNumber}</span>
          </div>
        </div>

        {/* Wheel */}
        <div className="flex justify-center mb-4">
          <div className="relative w-52 h-52">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10 text-2xl drop-shadow-lg">▼</div>
            <motion.div
              className="w-52 h-52 rounded-full border-4 border-yellow-600/70 shadow-[0_0_40px_rgba(245,200,66,0.3),inset_0_0_30px_rgba(0,0,0,0.5)]"
              style={{
                background: "conic-gradient(from 0deg, #c0392b, #2c3e50, #c0392b, #2c3e50, #c0392b, #2c3e50, #c0392b, #2c3e50, #27ae60, #c0392b, #2c3e50, #c0392b, #2c3e50, #c0392b, #2c3e50, #c0392b, #2c3e50, #c0392b)"
              }}
              animate={{ rotate: spinning ? spinDeg.current : 0 }}
              transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-700 to-yellow-900 border-2 border-yellow-500 flex items-center justify-center shadow-lg">
                  <span className="text-xl font-black text-yellow-200">
                    {result !== null ? result : "🎰"}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Timer or result */}
        {phase === "betting" && (
          <div className="text-center mb-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-900/30 border border-yellow-600/30">
              <span className="text-lg font-black" style={{ color: timer <= 5 ? "#ef4444" : "#f5c842" }}>
                بدء {timer}s
              </span>
            </div>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result !== null && phase === "result" && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`text-center mb-3 p-3 rounded-xl ${winAmount && winAmount > 0 ? "bg-yellow-500/20 border border-yellow-500/30" : "bg-red-500/10 border border-red-500/20"}`}>
              <p className="text-sm font-bold text-white">
                الرقم: <span className={`text-xl ${getColor(result) === "red" ? "text-red-400" : getColor(result) === "black" ? "text-white" : "text-green-400"}`}>{result}</span>
                {" "}<span>{getColor(result) === "red" ? "🔴" : getColor(result) === "black" ? "⚫" : "🟢"}</span>
              </p>
              {winAmount !== null && winAmount > 0 && (
                <p className="text-yellow-300 font-black text-xl mt-1">+{winAmount} 💎</p>
              )}
              <button onClick={playAgain} className="mt-2 px-6 py-2 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-800 font-bold text-sm text-black">
                🔄 جولة جديدة
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Betting board - matching reference image layout */}
        {phase === "betting" && (
          <>
            {/* Range bets row (0, 1-12, 13-24, 25-36) */}
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([
                { label: "0", value: "0" as const, multiplier: "x36", totalBets: 0 },
                { label: "1-12", value: "1-12" as const, multiplier: "x3", totalBets: 0 },
                { label: "13-24", value: "13-24" as const, multiplier: "x3", totalBets: 0 },
                { label: "25-36", value: "25-36" as const, multiplier: "x3", totalBets: 0 },
              ]).map(item => (
                <button key={item.value} onClick={() => setBet({ type: "range", value: item.value })}
                  className={`py-3 rounded-xl text-center transition-all border ${
                    bet?.type === "range" && bet.value === item.value
                      ? "border-yellow-400 bg-yellow-600/30 scale-105"
                      : "border-red-800/40 bg-red-900/30"
                  }`}>
                  <p className="text-lg font-black text-white">{item.label}</p>
                  <p className="text-[9px] text-yellow-400/70 font-bold">{item.multiplier}</p>
                </button>
              ))}
            </div>

            {/* Color & parity bets (أحمر، أسود، زوجي، فردي) */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <button onClick={() => setBet({ type: "color", value: "red" })}
                className={`py-3 rounded-xl text-center transition-all border ${
                  bet?.type === "color" && bet.value === "red" ? "border-red-400 bg-red-600/40 scale-105" : "border-red-800/40 bg-red-900/30"
                }`}>
                <p className="text-sm font-black text-red-400">أحمر</p>
                <p className="text-[9px] text-yellow-400/70 font-bold">x2</p>
              </button>
              <button onClick={() => setBet({ type: "color", value: "black" })}
                className={`py-3 rounded-xl text-center transition-all border ${
                  bet?.type === "color" && bet.value === "black" ? "border-gray-400 bg-gray-600/40 scale-105" : "border-red-800/40 bg-red-900/30"
                }`}>
                <p className="text-sm font-black text-white">أسود</p>
                <p className="text-[9px] text-yellow-400/70 font-bold">x2</p>
              </button>
              <button onClick={() => setBet({ type: "parity", value: "even" })}
                className={`py-3 rounded-xl text-center transition-all border ${
                  bet?.type === "parity" && bet.value === "even" ? "border-purple-400 bg-purple-600/40 scale-105" : "border-red-800/40 bg-red-900/30"
                }`}>
                <p className="text-sm font-black text-purple-300">زوجي</p>
                <p className="text-[9px] text-yellow-400/70 font-bold">x2</p>
              </button>
              <button onClick={() => setBet({ type: "parity", value: "odd" })}
                className={`py-3 rounded-xl text-center transition-all border ${
                  bet?.type === "parity" && bet.value === "odd" ? "border-purple-400 bg-purple-600/40 scale-105" : "border-red-800/40 bg-red-900/30"
                }`}>
                <p className="text-sm font-black text-purple-300">فردي</p>
                <p className="text-[9px] text-yellow-400/70 font-bold">x2</p>
              </button>
            </div>
          </>
        )}

        {/* Bet Amount Chips - bottom bar style */}
        {phase === "betting" && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/50 font-bold">الرصيد: <CurrencyIcon type="gold" size="xs" /> {balance.toLocaleString()}</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {BET_AMOUNTS.map(a => (
                <button key={a} onClick={() => setBetAmount(a)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    betAmount === a
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-700 text-black shadow-[0_0_15px_rgba(245,200,66,0.4)]"
                      : "bg-white/10 text-white/70 border border-white/10"
                  }`}>
                  {a >= 1000 ? `${a/1000}K` : a}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spin Button */}
        {phase === "betting" && (
          <button onClick={spin} disabled={!bet || spinning}
            className="w-full py-4 rounded-2xl font-black text-lg text-black disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #f5c842, #e6a817, #f5c842)", boxShadow: "0 0 30px rgba(245,200,66,0.4)" }}>
            {spinning ? (
              <><RotateCcw className="w-5 h-5 animate-spin" /> جارٍ الدوران...</>
            ) : (
              <>🎰 دوّر - {betAmount} <CurrencyIcon type="gold" size="sm" /></>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default RouletteGame;