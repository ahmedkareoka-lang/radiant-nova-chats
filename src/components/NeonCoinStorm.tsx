import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfileStore } from "@/stores/profileStore";
import { Zap, X } from "lucide-react";
import novaCoin3d from "@/assets/nova-coin-3d.png";

interface NeonCoinStormProps {
  open: boolean;
  onClose: () => void;
  durationMs?: number;
  currentUserId?: string | null;
}

const POP_SOUND_URL = "https://cdn.pixabay.com/audio/2022/03/10/audio_38f2eb25e7.mp3";
const THUNDER_URL = "https://cdn.pixabay.com/audio/2022/03/15/audio_d1718ab923.mp3";

const TIERS = [
  { cost: 2500, coins: 25, label: "نسيم", color: "from-purple-500 to-fuchsia-500" },
  { cost: 5000, coins: 45, label: "عاصفة", color: "from-fuchsia-500 to-pink-500" },
  { cost: 15000, coins: 90, label: "إعصار", color: "from-pink-500 to-rose-500" },
  { cost: 25000, coins: 140, label: "زلزال", color: "from-amber-500 to-orange-500" },
  { cost: 50000, coins: 220, label: "بركان", color: "from-orange-500 to-red-500" },
  { cost: 100000, coins: 350, label: "أسطورة", color: "from-yellow-400 via-fuchsia-500 to-cyan-400" },
];

interface Coin {
  id: number;
  x: number;
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  size: number;
  value: number;
}

interface Pop {
  id: number;
  x: number;
  y: number;
}

export default function NeonCoinStorm({
  open,
  onClose,
  durationMs = 10_000,
  currentUserId,
}: NeonCoinStormProps) {
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const balance = profile?.coins ?? 0;

  const [phase, setPhase] = useState<"select" | "storm">("select");
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[number] | null>(null);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [collected, setCollected] = useState(0);
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  const thunderRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);
  const collectedRef = useRef(0);

  useEffect(() => {
    collectedRef.current = collected;
  }, [collected]);

  // Reset to selection screen each time the sheet opens.
  useEffect(() => {
    if (open) {
      setPhase("select");
      setSelectedTier(null);
      setCollected(0);
      setCoins([]);
      setPops([]);
      closedRef.current = false;
    }
  }, [open]);

  const launchStorm = useCallback(
    async (tier: typeof TIERS[number]) => {
      if (!currentUserId) {
        toast.error("يجب تسجيل الدخول");
        return;
      }
      if (balance < tier.cost) {
        toast.error(`رصيدك غير كافٍ! تحتاج ${tier.cost.toLocaleString()} كوين`);
        return;
      }
      // Only 5% of the tier cost is actually deducted from the launcher;
      // the remaining 95% becomes the prize pool that rains for everyone.
      const fee = Math.max(1, Math.ceil(tier.cost * 0.05));
      const pool = tier.cost - fee;

      const { error } = await supabase.rpc("deduct_coins", {
        _user_id: currentUserId,
        _amount: fee,
      });
      if (error) {
        toast.error(error.message || "تعذر خصم الرصيد");
        return;
      }
      setProfile({ coins: balance - fee });

      setSelectedTier(tier);
      setPhase("storm");

      // Distribute the pool across the falling coins
      const perCoin = Math.max(1, Math.floor(pool / tier.coins));
      const next: Coin[] = Array.from({ length: tier.coins }, (_, i) => ({
        id: i,
        x: Math.random() * 92 + 2,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 30,
        rotate: 360 + Math.random() * 720,
        size: 38 + Math.random() * 24,
        value: perCoin,
      }));
      setCoins(next);

      // Audio
      try {
        thunderRef.current = new Audio(THUNDER_URL);
        thunderRef.current.volume = 0.45;
        thunderRef.current.play().catch(() => {});
        popAudioRef.current = new Audio(POP_SOUND_URL);
        popAudioRef.current.volume = 0.55;
      } catch {}

      setTimeout(() => {
        if (closedRef.current) return;
        closedRef.current = true;
        const winnings = collectedRef.current;
        if (winnings > 0 && currentUserId) {
          supabase.rpc("add_coins", { _user_id: currentUserId, _amount: winnings }).then(() => {
            setProfile({ coins: (useProfileStore.getState().profile?.coins ?? 0) + winnings });
          });
        }
        toast.success(
          `انتهت ${tier.label}! جمعت ${winnings.toLocaleString()} كوين ⚡`,
          { description: "The storm has ended!" }
        );
        thunderRef.current?.pause();
        onClose();
      }, durationMs);
    },
    [balance, currentUserId, durationMs, onClose, setProfile]
  );

  const handleCoinTap = useCallback((coin: Coin, e: React.MouseEvent | React.TouchEvent) => {
    let x = 0, y = 0;
    if ("touches" in e && e.touches[0]) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else if ("clientX" in e) {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    const popId = Date.now() + Math.random();
    setPops((p) => [...p, { id: popId, x, y }]);
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== popId)), 500);
    setCoins((cs) => cs.filter((c) => c.id !== coin.id));
    setCollected((n) => n + coin.value);
    try {
      if (popAudioRef.current) {
        const a = popAudioRef.current.cloneNode(true) as HTMLAudioElement;
        a.volume = 0.45;
        a.play().catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      thunderRef.current?.pause();
      thunderRef.current = null;
      popAudioRef.current = null;
    };
  }, []);

  if (!open) return null;

  return (
    <AnimatePresence>
      {phase === "select" ? (
        <motion.div
          key="select"
          className="fixed inset-0 z-[100] flex items-start justify-center pt-6 px-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drop-down panel from top */}
          <motion.div
            initial={{ y: -400, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -400, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative w-full max-w-md rounded-3xl overflow-hidden border border-fuchsia-400/40 shadow-[0_25px_80px_rgba(217,70,239,0.45)]"
            style={{
              background:
                "linear-gradient(160deg, rgba(30,10,60,0.98) 0%, rgba(60,15,90,0.98) 50%, rgba(20,5,50,0.98) 100%)",
            }}
          >
            {/* Glow border accents */}
            <div className="pointer-events-none absolute -top-20 -left-20 w-60 h-60 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-purple-500/30 blur-3xl" />

            <div className="relative p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center shadow-lg shadow-fuchsia-500/50"
                  >
                    <Zap className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-white font-bold text-lg leading-tight">
                      عاصفة الكوينز النيون
                    </h2>
                    <p className="text-fuchsia-300/80 text-[11px]">Neon Coin Storm</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 mb-4 flex items-center justify-between px-3 py-2 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[11px] text-white/70">رصيدك</span>
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Coins className="w-4 h-4" />
                  <span>{balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {TIERS.map((tier) => {
                  const canAfford = balance >= tier.cost;
                  return (
                    <motion.button
                      key={tier.cost}
                      whileHover={canAfford ? { scale: 1.03 } : {}}
                      whileTap={canAfford ? { scale: 0.97 } : {}}
                      disabled={!canAfford}
                      onClick={() => launchStorm(tier)}
                      className={`relative rounded-2xl p-3 text-left overflow-hidden border transition-all ${
                        canAfford
                          ? "border-white/20 hover:border-fuchsia-400/60"
                          : "border-white/10 opacity-40 cursor-not-allowed"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.6))`,
                      }}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-25`}
                      />
                      <div className="relative">
                        <div className="text-white font-bold text-sm mb-0.5">{tier.label}</div>
                        <div className="text-[10px] text-white/70 mb-2">
                          {tier.coins} كوين متطاير
                        </div>
                        <div className="flex items-center gap-1 text-amber-300 font-extrabold text-sm">
                          <Coins className="w-3.5 h-3.5" />
                          {tier.cost.toLocaleString()}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-[10px] text-white/50 text-center mt-3">
                اضغط على كوين أثناء العاصفة لتجمعه ⚡
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <StormOverlay
          key="storm"
          tier={selectedTier!}
          coins={coins}
          pops={pops}
          collected={collected}
          onCoinTap={handleCoinTap}
          onSkip={() => {
            closedRef.current = true;
            thunderRef.current?.pause();
            onClose();
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
function StormOverlay({
  tier,
  coins,
  pops,
  collected,
  onCoinTap,
  onSkip,
}: {
  tier: { label: string; color: string; cost: number };
  coins: Coin[];
  pops: Pop[];
  collected: number;
  onCoinTap: (c: Coin, e: React.MouseEvent | React.TouchEvent) => void;
  onSkip: () => void;
}) {
  // Lightning flashes
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFlash((n) => n + 1), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{ touchAction: "none" }}
    >
      {/* Dark stormy sky backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,5,45,0.98) 0%, rgba(50,10,80,0.95) 40%, rgba(15,5,35,0.98) 100%)",
        }}
      />

      {/* Lightning flash */}
      <AnimatePresence>
        <motion.div
          key={flash}
          className="absolute inset-0 bg-white pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ duration: 0.4 }}
        />
      </AnimatePresence>

      {/* Cloud band at top */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 0%, rgba(168,85,247,0.55), transparent 60%), radial-gradient(ellipse at 70% 10%, rgba(236,72,153,0.55), transparent 65%), linear-gradient(180deg, rgba(0,0,0,0.7), transparent)",
          filter: "blur(2px)",
        }}
        animate={{ x: [0, 20, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Tier banner */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring" }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[112] pointer-events-none"
      >
        <div
          className={`px-5 py-1.5 rounded-full bg-gradient-to-r ${tier.color} text-white font-bold text-sm shadow-[0_0_30px_rgba(217,70,239,0.7)] border border-white/30`}
        >
          {tier.label} • Coin Storm
        </div>
      </motion.div>

      {/* Counter badge */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="absolute top-16 left-1/2 -translate-x-1/2 z-[112] pointer-events-none"
      >
        <div className="px-4 py-1.5 rounded-full bg-black/70 border border-fuchsia-400/60 shadow-[0_0_22px_rgba(217,70,239,0.6)] text-white font-bold text-xs">
          Coins Collected: +{collected} 🪙
        </div>
      </motion.div>

      {/* Coins raining from sky */}
      {coins.map((coin) => (
        <motion.button
          key={coin.id}
          onClick={(e) => onCoinTap(coin, e)}
          onTouchStart={(e) => onCoinTap(coin, e)}
          className="absolute z-[108] cursor-pointer select-none"
          style={{
            left: `${coin.x}%`,
            top: 0,
            width: coin.size,
            height: coin.size,
            willChange: "transform, opacity",
            transform: "translateZ(0)",
          }}
          initial={{ y: -80, opacity: 0, x: 0, rotate: 0 }}
          animate={{
            y: ["0vh", "105vh"],
            x: [0, coin.drift, -coin.drift, coin.drift / 2],
            rotate: coin.rotate,
            opacity: [0, 1, 1, 1, 0.9],
          }}
          transition={{
            duration: coin.duration,
            delay: coin.delay,
            ease: "linear",
            repeat: Infinity,
            repeatDelay: Math.random() * 1.5,
          }}
          whileTap={{ scale: 1.4 }}
          aria-label="coin"
        >
          <svg
            viewBox="0 0 64 64"
            className="w-full h-full drop-shadow-[0_0_12px_rgba(250,204,21,0.95)]"
          >
            <defs>
              <radialGradient id={`coinGrad-${coin.id}`} cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#fffbeb" />
                <stop offset="40%" stopColor="#fde047" />
                <stop offset="80%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
              </radialGradient>
            </defs>
            <circle
              cx="32"
              cy="32"
              r="28"
              fill={`url(#coinGrad-${coin.id})`}
              stroke="#fef3c7"
              strokeWidth="2"
            />
            <circle cx="32" cy="32" r="20" fill="none" stroke="#fffbeb" strokeWidth="1.5" opacity="0.7" />
            <text
              x="32"
              y="41"
              textAnchor="middle"
              fontSize="24"
              fontWeight="900"
              fill="#7c2d12"
              fontFamily="system-ui"
            >
              $
            </text>
          </svg>
        </motion.button>
      ))}

      {/* Pop explosions */}
      {pops.map((p) => (
        <motion.div
          key={p.id}
          className="fixed pointer-events-none z-[120]"
          style={{ left: p.x, top: p.y, willChange: "transform, opacity" }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="-translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-400 via-yellow-300 to-pink-500 blur-md" />
        </motion.div>
      ))}

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[115] px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs backdrop-blur-md"
      >
        إغلاق العاصفة
      </button>
    </motion.div>
  );
}
