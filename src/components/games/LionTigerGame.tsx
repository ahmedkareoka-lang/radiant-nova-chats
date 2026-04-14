import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
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
const BET_AMOUNTS = [50, 100, 500, 1000, 5000, 25000];

const LionTigerGame = ({ onClose, currentUserId, roomId }: LionTigerGameProps) => {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [customBetInput, setCustomBetInput] = useState("");
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [phase, setPhase] = useState<"betting" | "reveal" | "result">("betting");
  const [result, setResult] = useState<Choice | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [balance, setBalance] = useState(0);
  const [myBet, setMyBet] = useState(0);
  const [totalBets, setTotalBets] = useState({ lion: 0, tie: 0, tiger: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasDeducted = useRef(false);

  // Fetch balance
  useEffect(() => {
    if (!currentUserId) return;
    const fetchBal = async () => {
      const { data } = await supabase.from("profiles").select("coins").eq("id", currentUserId).single();
      if (data) setBalance(data.coins);
    };
    fetchBal();
  }, [currentUserId, phase]);

  // Auto timer
  useEffect(() => {
    if (phase !== "betting") return;
    hasDeducted.current = false;
    setTimer(TIMER_SECONDS);
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleReveal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase, roundNumber]);

  const handleChoice = (c: Choice) => {
    if (phase !== "betting") return;
    setChoice(c);
    setMyBet(betAmount);
    setTotalBets(prev => ({ ...prev, [c]: prev[c] + betAmount }));
  };

  const handleReveal = async () => {
    if (phase !== "betting") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("reveal");

    // Deduct coins first if user placed a bet
    if (choice && currentUserId && !hasDeducted.current) {
      hasDeducted.current = true;
      const { error } = await supabase.rpc("deduct_coins", { _user_id: currentUserId, _amount: betAmount });
      if (error) {
        toast.error("رصيدك غير كافٍ!");
        setPhase("betting");
        hasDeducted.current = false;
        return;
      }
      setBalance(prev => prev - betAmount);
    }

    const rand = Math.random();
    let r: Choice;
    if (rand < 0.45) r = "lion";
    else if (rand < 0.9) r = "tiger";
    else r = "tie";

    setTimeout(async () => {
      setResult(r);
      setPhase("result");

      if (!choice || !currentUserId) return;

      let win = 0;
      if (choice === r) {
        if (r === "tie") win = betAmount * 30;
        else win = betAmount * 2;
      }

      if (win > 0) {
        await supabase.rpc("add_diamonds_add_charisma", {
          _user_id: currentUserId,
          _diamond_amount: win,
          _xp_amount: Math.floor(win / 10),
        });
        setBalance(prev => prev + win);
        toast.success(`🎉 فزت بـ ${win.toLocaleString()} عملة!`);
      }
      setWinAmount(win);
    }, 2000);
  };

  const playAgain = () => {
    setChoice(null);
    setResult(null);
    setWinAmount(0);
    setMyBet(0);
    setTotalBets({ lion: 0, tie: 0, tiger: 0 });
    setRoundNumber((prev) => prev + 1);
    setPhase("betting");
  };

  const handleCustomBet = () => {
    const val = parseInt(customBetInput);
    if (val && val >= 10 && val <= 1000000) {
      setBetAmount(val);
      setCustomBetInput("");
    } else {
      toast.error("أدخل مبلغ صحيح (10 - 1,000,000)");
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-lg mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-black text-white">Lion vs Tiger</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <X className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-center gap-2 mb-3 py-2 rounded-xl bg-black/30 border border-yellow-500/20">
          <CurrencyIcon type="gold" size="sm" />
          <span className="font-black text-yellow-300 text-lg">{balance.toLocaleString()}</span>
        </div>

        {/* Round counter */}
        <div className="text-center mb-3">
          <div className="inline-block px-6 py-1.5 rounded-full border border-purple-500/40 bg-purple-900/30">
            <span className="text-sm font-bold text-purple-300">الجولة: {roundNumber}</span>
          </div>
        </div>

        {/* Arena */}
        <div className="relative rounded-2xl overflow-hidden mb-4 py-8"
          style={{ background: "linear-gradient(180deg, #2d1060 0%, #e8c080 50%, #c8a060 70%, #a88850 100%)" }}>
          <div className="text-center mb-4">
            <h3 className="text-3xl font-black italic"
              style={{ background: "linear-gradient(135deg, #ff6b9d, #c084fc, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              LION <span style={{ color: "#ff4444", WebkitTextFillColor: "#ff4444" }}>or</span> TIGER
            </h3>
          </div>

          <div className="flex items-center justify-around px-4">
            <motion.div animate={phase === "reveal" ? { x: [0, 30, 0], scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }} className="text-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl transition-all ${
                result === "tiger" ? "shadow-[0_0_30px_rgba(59,130,246,0.8)]" : ""
              }`} style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)" }}>
                🐯
              </div>
            </motion.div>

            <motion.div animate={phase === "reveal" ? { scale: [1, 1.5, 1] } : {}}
              transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }} className="text-center">
              <span className="text-2xl font-black text-red-500">⚡</span>
            </motion.div>

            <motion.div animate={phase === "reveal" ? { x: [0, -30, 0], scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.5, repeat: phase === "reveal" ? 3 : 0 }} className="text-center">
              <div className={`w-28 h-28 rounded-full flex items-center justify-center text-6xl transition-all ${
                result === "lion" ? "shadow-[0_0_30px_rgba(239,68,68,0.8)]" : ""
              }`} style={{ background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)" }}>
                🦁
              </div>
            </motion.div>
          </div>
        </div>

        {/* Timer bar */}
        {phase === "betting" && (
          <div className="text-center mb-3 py-2 rounded-xl bg-blue-900/40 border border-blue-500/30">
            <span className={`text-xl font-black ${timer <= 5 ? "text-red-400 animate-pulse" : "text-white"}`}>
              وقت الرهان: {timer}s
            </span>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {phase === "result" && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center mb-4 space-y-2">
              <p className="text-xl font-black text-white">
                {result === "lion" ? "🦁 Lion فاز!" : result === "tiger" ? "🐯 Tiger فاز!" : "🤝 تعادل! X30"}
              </p>
              {winAmount > 0 && <p className="text-2xl font-black text-yellow-300">+{winAmount.toLocaleString()} 💰</p>}
              {winAmount === 0 && choice && <p className="text-sm text-red-400 font-bold">خسرت هذه الجولة 😔</p>}
              {!choice && <p className="text-sm text-white/50">لم تراهن في هذه الجولة</p>}
              <button onClick={playAgain} className="px-8 py-3 rounded-2xl font-bold text-black"
                style={{ background: "linear-gradient(135deg, #f5c842, #e6a817)" }}>
                🔄 جولة جديدة
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Betting cards */}
        {phase === "betting" && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button onClick={() => handleChoice("tiger")}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                choice === "tiger" ? "border-blue-400 scale-105" : "border-purple-500/30"
              }`} style={{ background: "linear-gradient(180deg, #3b1f7a, #2d1560)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-black text-blue-300">X 2</span>
                <span className="text-xl">🐯</span>
              </div>
              <div className="text-[9px] text-purple-300/70 mb-1">إجمالي الرهانات</div>
              <div className="text-sm font-bold text-white">{totalBets.tiger.toLocaleString()}</div>
              <div className="mt-1 py-1 rounded-lg bg-purple-800/50 text-[10px] text-purple-300">
                أنا: <span className="text-blue-300 font-bold">{choice === "tiger" ? myBet : 0}</span>
              </div>
            </button>

            <button onClick={() => handleChoice("tie")}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                choice === "tie" ? "border-yellow-400 scale-105" : "border-yellow-500/30"
              }`} style={{ background: "linear-gradient(180deg, #5a3f1a, #3d2a10)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-black text-yellow-300">X 30</span>
                <span className="text-xl">🤝</span>
              </div>
              <div className="text-[9px] text-yellow-300/70 mb-1">إجمالي الرهانات</div>
              <div className="text-sm font-bold text-white">{totalBets.tie.toLocaleString()}</div>
              <div className="mt-1 py-1 rounded-lg bg-yellow-900/50 text-[10px] text-yellow-300">
                أنا: <span className="text-yellow-300 font-bold">{choice === "tie" ? myBet : 0}</span>
              </div>
            </button>

            <button onClick={() => handleChoice("lion")}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                choice === "lion" ? "border-red-400 scale-105" : "border-pink-500/30"
              }`} style={{ background: "linear-gradient(180deg, #5a1f3a, #3d1028)" }}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-black text-red-300">X 2</span>
                <span className="text-xl">🦁</span>
              </div>
              <div className="text-[9px] text-pink-300/70 mb-1">إجمالي الرهانات</div>
              <div className="text-sm font-bold text-white">{totalBets.lion.toLocaleString()}</div>
              <div className="mt-1 py-1 rounded-lg bg-pink-900/50 text-[10px] text-pink-300">
                أنا: <span className="text-red-300 font-bold">{choice === "lion" ? myBet : 0}</span>
              </div>
            </button>
          </div>
        )}

        {/* Bet Amount Chips */}
        {phase === "betting" && (
          <div className="mb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {BET_AMOUNTS.map((a) => (
                <button key={a} onClick={() => setBetAmount(a)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    betAmount === a
                      ? "bg-gradient-to-r from-yellow-500 to-yellow-700 text-black shadow-[0_0_15px_rgba(245,200,66,0.4)]"
                      : "bg-white/10 text-white/70 border border-white/10"
                  }`}>
                  {a >= 1000 ? `${a / 1000}K` : a}
                </button>
              ))}
            </div>
            {/* Custom bet */}
            <div className="flex gap-2 mt-2">
              <input type="number" value={customBetInput} onChange={(e) => setCustomBetInput(e.target.value)}
                placeholder="مبلغ مخصص..." className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-xs placeholder:text-white/30 outline-none" />
              <button onClick={handleCustomBet} className="px-4 py-2 rounded-xl bg-yellow-600/30 border border-yellow-500/30 text-yellow-300 text-xs font-bold">
                تأكيد
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-1 text-center">الرهان الحالي: {betAmount.toLocaleString()} 💰</p>
          </div>
        )}

        {/* Confirm Bet */}
        {phase === "betting" && (
          <button onClick={handleReveal} disabled={!choice || betAmount > balance}
            className="w-full py-4 rounded-2xl font-black text-lg text-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #f5c842, #e6a817, #f5c842)", boxShadow: "0 0 30px rgba(245,200,66,0.4)" }}>
            {!choice ? "اختر رهانك" : betAmount > balance ? "رصيد غير كافٍ" :
              `راهن ${betAmount.toLocaleString()} على ${choice === "lion" ? "🦁" : choice === "tiger" ? "🐯" : "🤝"}`}
          </button>
        )}

        {/* Odds */}
        <div className="mt-4 p-2 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-white/40 text-center">🦁 Lion: X2 | 🐯 Tiger: X2 | 🤝 Tie: X30</p>
        </div>
      </div>
    </div>
  );
};

export default LionTigerGame;
