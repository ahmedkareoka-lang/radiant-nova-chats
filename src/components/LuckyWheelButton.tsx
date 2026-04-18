import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CurrencyIcon from "@/components/CurrencyIcon";

// Hourly lucky wheel — anyone in a voice room can spin once per hour for free coins.
// Rewards range from 50 to 5000 coins.
const REWARDS = [
  { coins: 50, color: "from-slate-400 to-slate-600", weight: 30 },
  { coins: 100, color: "from-blue-400 to-blue-600", weight: 25 },
  { coins: 250, color: "from-emerald-400 to-emerald-600", weight: 20 },
  { coins: 500, color: "from-purple-400 to-purple-600", weight: 12 },
  { coins: 1000, color: "from-pink-400 to-rose-600", weight: 8 },
  { coins: 2500, color: "from-amber-400 to-orange-600", weight: 4 },
  { coins: 5000, color: "from-yellow-300 via-amber-400 to-orange-500", weight: 1 },
];

const COOLDOWN_KEY = "nova_lucky_wheel_last";
const COOLDOWN_MS = 60 * 60 * 1000;

export default function LuckyWheelButton() {
  const [open, setOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - last));
      setCooldownLeft(left);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const pickReward = () => {
    const total = REWARDS.reduce((s, r) => s + r.weight, 0);
    let n = Math.random() * total;
    for (const r of REWARDS) {
      n -= r.weight;
      if (n <= 0) return r;
    }
    return REWARDS[0];
  };

  const spin = async () => {
    if (cooldownLeft > 0) return;
    setSpinning(true);
    setResult(null);
    setTimeout(async () => {
      const reward = pickReward();
      setResult(reward.coins);
      setSpinning(false);
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("add_coins", { _user_id: user.id, _amount: reward.coins });
        toast.success(`ربحت ${reward.coins.toLocaleString()} عملة! 🎉`);
      }
    }, 3500);
  };

  const minsLeft = Math.ceil(cooldownLeft / 60000);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-32 left-4 z-30 w-12 h-12 rounded-full gradient-gold flex items-center justify-center shadow-[0_0_18px_hsl(45_100%_55%/0.5)] hover:scale-110 transition-transform"
        aria-label="عجلة الحظ"
      >
        <span className="text-xl">🎡</span>
        {cooldownLeft === 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.7, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl p-5"
              style={{ background: "linear-gradient(135deg, hsl(280 50% 18%), hsl(260 40% 12%))" }}
            >
              <h3 className="text-center text-lg font-black mb-1 glow-gold-text">🎡 عجلة الحظ</h3>
              <p className="text-center text-[11px] text-muted-foreground mb-4">دورة مجانية كل ساعة</p>

              {/* Wheel */}
              <div className="relative w-64 h-64 mx-auto mb-4">
                <motion.div
                  className="w-full h-full rounded-full border-4 border-accent relative overflow-hidden shadow-[0_0_30px_hsl(45_100%_55%/0.5)]"
                  animate={{ rotate: spinning ? 360 * 8 + Math.random() * 360 : 0 }}
                  transition={{ duration: spinning ? 3.5 : 0, ease: "easeOut" }}
                >
                  {REWARDS.map((r, i) => {
                    const angle = (360 / REWARDS.length) * i;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 left-1/2 origin-bottom h-1/2 w-[40%] -translate-x-1/2 bg-gradient-to-b ${r.color} flex items-start justify-center pt-3`}
                        style={{ transform: `translateX(-50%) rotate(${angle}deg)`, transformOrigin: "bottom center", clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
                      >
                        <span className="text-xs font-black text-foreground rotate-180" style={{ writingMode: "vertical-rl" }}>
                          {r.coins}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl">▼</div>
                {/* Center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full gradient-gold flex items-center justify-center text-2xl shadow-lg">
                  🎁
                </div>
              </div>

              {result !== null && !spinning && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="text-center mb-3 flex items-center justify-center gap-2"
                >
                  <CurrencyIcon type="gold" size="sm" />
                  <span className="text-xl font-black text-accent">+{result.toLocaleString()}</span>
                </motion.div>
              )}

              <button
                onClick={spin}
                disabled={spinning || cooldownLeft > 0}
                className="w-full py-3 rounded-full gradient-gold text-accent-foreground font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {spinning ? "جارٍ الدوران..." : cooldownLeft > 0 ? `الدورة التالية بعد ${minsLeft} دقيقة` : "🎡 ابدأ الدوران"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
