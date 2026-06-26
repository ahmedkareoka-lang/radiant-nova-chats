import { Crown, Sparkles, Star, Flame, Gem, Zap, Lock } from "lucide-react";
import { ROOM_LEVEL_TIERS, type RoomLevelTier } from "@/lib/roomLevels";

/**
 * RoomBadgesShowcase — premium 6-slot grid showcasing all room-level badges a user
 * has earned (across rooms they own). Each tier is progressively more luxurious:
 * gold gradients, layered shadows, glow halos, and a unique icon per level.
 *
 * Pass `unlockedLevels` — an array of level numbers (1-6) the user has earned.
 * Locked tiers are rendered as desaturated placeholders so the full 6-slot grid is
 * always visible (and aspirational) for everyone viewing the profile.
 */

interface Props {
  /** Levels the user has unlocked, e.g. [1,2,3]. */
  unlockedLevels: number[];
  /** Optional: highlight the user's current room level. */
  currentLevel?: number;
  /** Compact mode for tight spaces. */
  compact?: boolean;
}

const TIER_ICONS: Record<number, typeof Crown> = {
  1: Sparkles,
  2: Star,
  3: Gem,
  4: Crown,
  5: Zap,
  6: Flame,
};

// Per-tier visual recipe: gradient, ring, halo, label color.
// Each step is intentionally more elaborate than the previous one.
const TIER_VISUALS: Record<number, {
  bg: string;        // tailwind/CSS background gradient
  ring: string;      // ring color
  halo: string;      // box-shadow halo
  text: string;      // label text color
  shine: string;     // inner shine overlay
}> = {
  1: {
    bg: "linear-gradient(145deg,#3a3f4b 0%,#1f232c 100%)",
    ring: "rgba(203,213,225,0.35)",
    halo: "0 0 14px rgba(156,163,175,0.35)",
    text: "#cbd5e1",
    shine: "linear-gradient(180deg,rgba(255,255,255,0.18),transparent 55%)",
  },
  2: {
    bg: "linear-gradient(145deg,#cbd5e1 0%,#64748b 55%,#334155 100%)",
    ring: "rgba(226,232,240,0.65)",
    halo: "0 0 18px rgba(203,213,225,0.55), 0 0 36px rgba(148,163,184,0.35)",
    text: "#f8fafc",
    shine: "linear-gradient(180deg,rgba(255,255,255,0.45),transparent 60%)",
  },
  3: {
    bg: "linear-gradient(145deg,#67e8f9 0%,#0ea5e9 50%,#0c4a6e 100%)",
    ring: "rgba(125,211,252,0.85)",
    halo: "0 0 22px rgba(56,189,248,0.7), 0 0 48px rgba(14,165,233,0.45)",
    text: "#ecfeff",
    shine: "linear-gradient(180deg,rgba(255,255,255,0.55),transparent 60%)",
  },
  4: {
    bg: "linear-gradient(145deg,#f0abfc 0%,#a855f7 45%,#581c87 100%)",
    ring: "rgba(232,121,249,0.95)",
    halo: "0 0 26px rgba(168,85,247,0.85), 0 0 60px rgba(192,38,211,0.5), inset 0 0 18px rgba(255,255,255,0.18)",
    text: "#faf5ff",
    shine: "linear-gradient(180deg,rgba(255,255,255,0.6),transparent 55%)",
  },
  5: {
    bg: "linear-gradient(145deg,#fde68a 0%,#f59e0b 45%,#92400e 100%)",
    ring: "rgba(252,211,77,1)",
    halo: "0 0 30px rgba(245,158,11,1), 0 0 70px rgba(217,119,6,0.7), inset 0 0 22px rgba(255,255,255,0.25)",
    text: "#fffbeb",
    shine: "linear-gradient(180deg,rgba(255,255,255,0.7),transparent 55%)",
  },
  6: {
    bg: "linear-gradient(145deg,#fecaca 0%,#ef4444 30%,#7f1d1d 70%,#1c0303 100%)",
    ring: "rgba(254,202,202,1)",
    halo:
      "0 0 36px rgba(239,68,68,1), 0 0 80px rgba(220,38,38,0.75), 0 0 120px rgba(127,29,29,0.55), inset 0 0 28px rgba(255,221,153,0.35)",
    text: "#fff7ed",
    shine:
      "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.85), transparent 45%), linear-gradient(180deg,rgba(255,255,255,0.35),transparent 55%)",
  },
};

function BadgeSlot({
  tier,
  unlocked,
  isCurrent,
  compact,
}: {
  tier: RoomLevelTier;
  unlocked: boolean;
  isCurrent: boolean;
  compact?: boolean;
}) {
  const Icon = TIER_ICONS[tier.level] || Sparkles;
  const v = TIER_VISUALS[tier.level];
  const size = compact ? 52 : 64;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative flex items-center justify-center rounded-2xl ${
          isCurrent ? "scale-[1.08]" : ""
        } ${tier.level >= 4 && unlocked ? "animate-pulse-slow" : ""}`}
        style={{
          width: size,
          height: size,
          background: unlocked ? v.bg : "linear-gradient(145deg,#1a1a24,#0a0a12)",
          border: `1.5px solid ${unlocked ? v.ring : "rgba(255,255,255,0.06)"}`,
          boxShadow: unlocked ? v.halo : "inset 0 0 12px rgba(0,0,0,0.6)",
          filter: unlocked ? "none" : "grayscale(1) brightness(0.55)",
        }}
      >
        {/* Inner shine */}
        {unlocked && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: v.shine }}
          />
        )}
        {/* Rotating conic halo for top tiers */}
        {unlocked && tier.level >= 5 && (
          <span
            aria-hidden
            className="absolute -inset-1 rounded-3xl pointer-events-none opacity-60 animate-spin-slow"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${v.ring}, transparent 60%)`,
              maskImage: "radial-gradient(circle, transparent 55%, black 60%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 55%, black 60%)",
            }}
          />
        )}
        {/* Icon */}
        {unlocked ? (
          <Icon
            className="relative z-10"
            size={compact ? 22 : 28}
            color={v.text}
            strokeWidth={2.2}
            style={{ filter: `drop-shadow(0 0 6px ${v.ring})` }}
          />
        ) : (
          <Lock className="relative z-10 opacity-40" size={compact ? 18 : 22} />
        )}
        {/* Current ribbon */}
        {isCurrent && unlocked && (
          <span
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full text-[8px] font-black tracking-wide z-20"
            style={{
              background: v.bg,
              color: v.text,
              border: `1px solid ${v.ring}`,
              boxShadow: v.halo,
            }}
          >
            الحالي
          </span>
        )}
      </div>
      <span
        className="text-[9px] font-black tracking-wide leading-tight text-center"
        style={{ color: unlocked ? v.text : "rgba(255,255,255,0.35)" }}
      >
        LV.{tier.level}
      </span>
    </div>
  );
}

export default function RoomBadgesShowcase({
  unlockedLevels,
  currentLevel,
  compact,
}: Props) {
  const unlockedSet = new Set(unlockedLevels);
  const total = unlockedSet.size;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-amber-500/5 via-white/[0.03] to-fuchsia-500/5 border border-amber-300/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-300" />
          <p className="font-black text-sm bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
            أوسمة الغرفة
          </p>
        </div>
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-300/30">
          {total} / 6
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {ROOM_LEVEL_TIERS.map((tier) => (
          <BadgeSlot
            key={tier.level}
            tier={tier}
            unlocked={unlockedSet.has(tier.level)}
            isCurrent={currentLevel === tier.level}
            compact={compact}
          />
        ))}
      </div>
      {total === 0 && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          ادعم الغرف وارتقِ بها لفتح الأوسمة الأسطورية ✨
        </p>
      )}
    </div>
  );
}
