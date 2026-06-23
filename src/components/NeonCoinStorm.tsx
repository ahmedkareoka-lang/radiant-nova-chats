import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

interface NeonCoinStormProps {
  open: boolean;
  onClose: () => void;
  durationMs?: number;
  coinCount?: number;
}

const STORM_SOUND_URL = "https://cdn.pixabay.com/audio/2022/03/15/audio_d1718ab923.mp3"; // thunder placeholder
const POP_SOUND_URL = "https://cdn.pixabay.com/audio/2022/03/10/audio_38f2eb25e7.mp3"; // coin pop placeholder

interface Coin {
  id: number;
  x: number; // vw
  y: number; // vh
  delay: number;
  duration: number;
  drift: number;
  rotate: number;
  size: number;
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
  coinCount = 25,
}: NeonCoinStormProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [collected, setCollected] = useState(0);
  const stormAudioRef = useRef<HTMLAudioElement | null>(null);
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    closedRef.current = false;
    setCollected(0);
    setPops([]);
    const next: Coin[] = Array.from({ length: coinCount }, (_, i) => ({
      id: i,
      x: 40 + (Math.random() - 0.5) * 20, // start near vortex center
      y: 40 + (Math.random() - 0.5) * 10,
      delay: Math.random() * 0.6,
      duration: 3 + Math.random() * 3,
      drift: (Math.random() - 0.5) * 80,
      rotate: 360 + Math.random() * 720,
      size: 36 + Math.random() * 24,
    }));
    setCoins(next);

    // Audio
    try {
      stormAudioRef.current = new Audio(STORM_SOUND_URL);
      stormAudioRef.current.volume = 0.5;
      stormAudioRef.current.play().catch(() => {});
      popAudioRef.current = new Audio(POP_SOUND_URL);
      popAudioRef.current.volume = 0.6;
    } catch {}

    const t = setTimeout(() => {
      if (closedRef.current) return;
      closedRef.current = true;
      const c = collectedRef.current;
      toast.success(`انتهت العاصفة! جمعت ${c} كوينز ⚡`, {
        description: "The storm has ended!",
      });
      stormAudioRef.current?.pause();
      onClose();
    }, durationMs);

    return () => {
      clearTimeout(t);
      stormAudioRef.current?.pause();
      stormAudioRef.current = null;
      popAudioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const collectedRef = useRef(0);
  useEffect(() => {
    collectedRef.current = collected;
  }, [collected]);

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
    setTimeout(() => setPops((p) => p.filter((pp) => pp.id !== popId)), 600);
    setCoins((cs) => cs.filter((c) => c.id !== coin.id));
    setCollected((n) => n + 1);
    try {
      if (popAudioRef.current) {
        const a = popAudioRef.current.cloneNode(true) as HTMLAudioElement;
        a.volume = 0.5;
        a.play().catch(() => {});
      }
    } catch {}
  }, []);

  const vortex = useMemo(
    () => (
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: 360 }}
        transition={{
          scale: { duration: 0.6, ease: "easeOut" },
          opacity: { duration: 0.6 },
          rotate: { duration: 4, repeat: Infinity, ease: "linear" },
        }}
        style={{ willChange: "transform" }}
      >
        <svg width="280" height="280" viewBox="0 0 280 280" fill="none">
          <defs>
            <radialGradient id="vortexGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </radialGradient>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="140" cy="140" r="130" fill="url(#vortexGrad)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx="140"
              cy="140"
              rx={120 - i * 20}
              ry={50 - i * 8}
              stroke="#d8b4fe"
              strokeWidth="2"
              fill="none"
              opacity={0.7 - i * 0.1}
              filter="url(#neonGlow)"
              transform={`rotate(${i * 18} 140 140)`}
            />
          ))}
        </svg>
      </motion.div>
    ),
    []
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="storm-root"
        className="fixed inset-0 z-[100] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        style={{ touchAction: "none" }}
      >
        {/* dim purple backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(76,29,149,0.55) 0%, rgba(15,5,40,0.92) 70%, rgba(0,0,0,0.96) 100%)",
            willChange: "opacity",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {vortex}

        {/* Counter badge */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[110] pointer-events-none">
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="px-5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-fuchsia-400/60 shadow-[0_0_30px_rgba(217,70,239,0.6)] text-white font-bold text-sm"
          >
            Coins Collected: +{collected} 🪙
          </motion.div>
        </div>

        {/* Coins */}
        {coins.map((coin) => (
          <motion.button
            key={coin.id}
            onClick={(e) => handleCoinTap(coin, e)}
            onTouchStart={(e) => handleCoinTap(coin, e)}
            className="absolute z-[105] cursor-pointer select-none"
            style={{
              left: `${coin.x}%`,
              top: `${coin.y}%`,
              width: coin.size,
              height: coin.size,
              willChange: "transform, opacity",
              transform: "translateZ(0)",
            }}
            initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
            animate={{
              scale: [0, 1, 1, 0.9],
              opacity: [0, 1, 1, 1],
              x: [0, coin.drift, coin.drift * 1.5],
              y: [0, 120, 320],
              rotate: coin.rotate,
            }}
            transition={{
              duration: coin.duration,
              delay: coin.delay,
              ease: "easeOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
            whileTap={{ scale: 1.3 }}
            aria-label="coin"
          >
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]">
              <defs>
                <radialGradient id={`coinGrad-${coin.id}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="55%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#9a3412" />
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill={`url(#coinGrad-${coin.id})`} stroke="#fde68a" strokeWidth="2" />
              <circle cx="32" cy="32" r="20" fill="none" stroke="#fffbeb" strokeWidth="1.5" opacity="0.7" />
              <text
                x="32"
                y="40"
                textAnchor="middle"
                fontSize="22"
                fontWeight="bold"
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
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-r from-fuchsia-400 via-yellow-300 to-pink-500 blur-md" />
          </motion.div>
        ))}

        {/* Skip button */}
        <button
          onClick={() => {
            closedRef.current = true;
            stormAudioRef.current?.pause();
            onClose();
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[115] px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs backdrop-blur-md"
        >
          إغلاق العاصفة
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
