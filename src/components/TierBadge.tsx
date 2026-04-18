import { motion } from "framer-motion";
import { Crown, Diamond, Flame, Sparkles } from "lucide-react";

/**
 * Visual evolution tiers for Wealth (spending) & Charm (receiving) levels.
 * Lv 1-10   Wood          (static)
 * Lv 11-15  Bronze        (static)
 * Lv 16-20  Silver        (animated shimmer)
 * Lv 21-25  Luxury Gold   (rotating shine)
 * Lv 26-30  Fiery Red     (internal glow pulse)
 * Lv 31-35  Inferno Red   (external particles)
 * Lv 36-40  Ultimate Pro  (complex FX)
 * Lv 41-50  Crystal Blue  (legendary)
 * Lv 51-75  Royal Diamond
 * Lv 76-100 Galaxy / Black Hole
 */
export type TierType = "wealth" | "charm";

interface TierBadgeProps {
  level: number;
  type: TierType;
  size?: "sm" | "md" | "lg";
}

function getTier(level: number) {
  if (level >= 76) return "galaxy";
  if (level >= 51) return "diamond";
  if (level >= 41) return "crystal";
  if (level >= 36) return "pro";
  if (level >= 31) return "inferno";
  if (level >= 26) return "fiery";
  if (level >= 21) return "gold";
  if (level >= 16) return "silver";
  if (level >= 11) return "bronze";
  return "wood";
}

const TIER_STYLES: Record<string, { bg: string; ring: string; text: string; label: string }> = {
  wood: {
    bg: "linear-gradient(135deg, hsl(25 50% 35%), hsl(20 40% 22%))",
    ring: "ring-1 ring-amber-900/40",
    text: "text-amber-100",
    label: "Wood",
  },
  bronze: {
    bg: "linear-gradient(135deg, hsl(28 70% 50%), hsl(20 60% 32%))",
    ring: "ring-2 ring-orange-700/60",
    text: "text-orange-50",
    label: "Bronze",
  },
  silver: {
    bg: "linear-gradient(135deg, hsl(220 15% 75%), hsl(220 10% 50%))",
    ring: "ring-2 ring-slate-300/70",
    text: "text-slate-900",
    label: "Silver",
  },
  gold: {
    bg: "linear-gradient(135deg, hsl(45 95% 65%), hsl(40 90% 45%) 50%, hsl(45 95% 65%))",
    ring: "ring-2 ring-yellow-300/80 shadow-[0_0_15px_hsl(45_90%_55%/0.6)]",
    text: "text-yellow-950",
    label: "Gold",
  },
  fiery: {
    bg: "linear-gradient(135deg, hsl(0 90% 55%), hsl(15 85% 40%))",
    ring: "ring-2 ring-red-400/80 shadow-[0_0_18px_hsl(0_90%_55%/0.7)]",
    text: "text-white",
    label: "Fiery",
  },
  inferno: {
    bg: "linear-gradient(135deg, hsl(15 95% 55%), hsl(0 100% 45%) 50%, hsl(30 95% 50%))",
    ring: "ring-2 ring-orange-400/90 shadow-[0_0_22px_hsl(10_95%_55%/0.85)]",
    text: "text-white",
    label: "Inferno",
  },
  pro: {
    bg: "linear-gradient(135deg, hsl(280 80% 55%), hsl(320 75% 45%) 50%, hsl(45 90% 55%))",
    ring: "ring-2 ring-fuchsia-400/90 shadow-[0_0_25px_hsl(300_85%_60%/0.9)]",
    text: "text-white",
    label: "Pro",
  },
  crystal: {
    bg: "linear-gradient(135deg, hsl(195 90% 65%), hsl(220 85% 50%) 50%, hsl(180 90% 60%))",
    ring: "ring-2 ring-cyan-300/90 shadow-[0_0_28px_hsl(200_90%_60%/0.95)]",
    text: "text-white",
    label: "Crystal",
  },
  diamond: {
    bg: "linear-gradient(135deg, hsl(0 0% 100%), hsl(195 100% 80%) 30%, hsl(280 80% 75%) 70%, hsl(0 0% 100%))",
    ring: "ring-2 ring-white shadow-[0_0_32px_hsl(195_100%_75%/1)]",
    text: "text-purple-950",
    label: "Diamond",
  },
  galaxy: {
    bg: "linear-gradient(135deg, hsl(260 60% 8%), hsl(280 80% 35%) 30%, hsl(320 90% 45%) 60%, hsl(260 60% 8%))",
    ring: "ring-2 ring-fuchsia-500 shadow-[0_0_40px_hsl(280_90%_55%/1)]",
    text: "text-white",
    label: "Galaxy",
  },
};

const SIZES = {
  sm: { wrap: "px-2 py-0.5 text-[9px]", icon: "w-2.5 h-2.5" },
  md: { wrap: "px-2.5 py-1 text-[11px]", icon: "w-3 h-3" },
  lg: { wrap: "px-3 py-1.5 text-xs", icon: "w-3.5 h-3.5" },
};

export default function TierBadge({ level, type, size = "md" }: TierBadgeProps) {
  if (!level || level < 1) return null;
  const tier = getTier(level);
  const style = TIER_STYLES[tier];
  const dim = SIZES[size];

  // Special FX per tier
  const animated = ["silver", "gold", "fiery", "inferno", "pro", "crystal", "diamond", "galaxy"].includes(tier);
  const hasParticles = ["inferno", "pro", "crystal", "diamond", "galaxy"].includes(tier);

  const Icon = type === "wealth" ? Crown : Sparkles;
  const TypeLabel = type === "wealth" ? "ثروة" : "سحر";

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      className={`relative inline-flex items-center gap-1 rounded-full font-black ${dim.wrap} ${style.text} ${style.ring} overflow-hidden`}
      style={{ background: style.bg }}
    >
      {/* Shimmer for silver+ */}
      {animated && (
        <motion.span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, hsl(0 0% 100% / 0.45) 50%, transparent 70%)",
          }}
          initial={{ x: "-120%" }}
          animate={{ x: "220%" }}
          transition={{ duration: tier === "galaxy" ? 2.2 : 2.8, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Floating particles for high tiers */}
      {hasParticles &&
        Array.from({ length: 3 }).map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute w-1 h-1 rounded-full bg-white/80 pointer-events-none"
            style={{ left: `${20 + i * 28}%`, top: "50%" }}
            animate={{
              y: [-2, -10, -2],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

      <Icon className={`${dim.icon} relative z-10`} />
      <span className="relative z-10">
        {TypeLabel} {level}
      </span>
    </motion.span>
  );
}
