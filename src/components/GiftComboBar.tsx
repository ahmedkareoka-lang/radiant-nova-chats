import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface GiftComboBarProps {
  count: number;
  visible: boolean;
}

// Multiplier ladder — celebrates rapid successive gift sends.
// Inspired by Yalla Live combo banners.
const TIERS = [
  { min: 2, label: "x2", color: "from-blue-400 to-cyan-500" },
  { min: 5, label: "x5", color: "from-cyan-400 to-emerald-500" },
  { min: 10, label: "x10", color: "from-emerald-400 to-yellow-500" },
  { min: 25, label: "x25", color: "from-yellow-400 to-orange-500" },
  { min: 50, label: "x50", color: "from-orange-500 to-rose-500" },
  { min: 100, label: "x100 LEGENDARY", color: "from-rose-500 via-purple-500 to-amber-500" },
];

export default function GiftComboBar({ count, visible }: GiftComboBarProps) {
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 250);
      return () => clearTimeout(t);
    }
  }, [count]);

  if (!visible || count < 2) return null;

  const tier = [...TIERS].reverse().find((t) => count >= t.min) || TIERS[0];

  return (
    <AnimatePresence>
      <motion.div
        key={tier.label}
        initial={{ x: 100, opacity: 0, scale: 0.7 }}
        animate={{ x: 0, opacity: 1, scale: shake ? 1.15 : 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="fixed top-1/2 right-4 -translate-y-1/2 z-[60] pointer-events-none"
      >
        <div className={`px-4 py-3 rounded-2xl bg-gradient-to-br ${tier.color} shadow-[0_0_30px_rgba(255,200,80,0.5)] border-2 border-foreground/20`}>
          <div className="text-3xl font-black text-foreground text-center leading-none">{tier.label}</div>
          <div className="text-[10px] font-black text-foreground/90 text-center mt-1">COMBO</div>
          <div className="text-[10px] text-foreground/80 text-center">{count} هدايا</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
