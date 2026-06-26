import { Crown, Gem, Flame, Star, Shield, Sparkles } from "lucide-react";
import { getRoomTierByLevel, type RoomLevelTier } from "@/lib/roomLevels";

interface Props {
  level: number;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  /** show only when current user is room/agency owner */
  visible?: boolean;
}

const ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Star,
  2: Shield,
  3: Gem,
  4: Crown,
  5: Sparkles,
  6: Flame,
};

const SIZE_MAP = {
  xs: { wrap: "px-1.5 py-0.5 text-[9px] gap-1",  icon: "w-2.5 h-2.5" },
  sm: { wrap: "px-2 py-0.5 text-[10px] gap-1",   icon: "w-3 h-3"     },
  md: { wrap: "px-2.5 py-1 text-xs gap-1.5",     icon: "w-3.5 h-3.5" },
  lg: { wrap: "px-3 py-1.5 text-sm gap-1.5",     icon: "w-4 h-4"     },
};

/**
 * Premium room-owner badge. Rendered only when a room reaches LV.3+,
 * and only displayed to the room owner / agency owner per product spec.
 */
export const RoomLevelBadge = ({ level, size = "sm", showLabel = true, visible = true }: Props) => {
  if (!visible) return null;
  const tier: RoomLevelTier = getRoomTierByLevel(level);
  const Icon = ICONS[tier.level] || Star;
  const s = SIZE_MAP[size];

  // Tier-specific visual treatment, becoming richer each level.
  const styles: Record<number, string> = {
    1: "bg-slate-700/60 border border-slate-400/40 text-slate-100",
    2: "bg-gradient-to-r from-slate-500/30 to-slate-300/20 border border-slate-200/50 text-slate-50",
    3: "bg-gradient-to-r from-sky-600/40 to-cyan-400/30 border border-sky-300/60 text-sky-50 shadow-[0_0_10px_rgba(56,189,248,0.55)]",
    4: "bg-gradient-to-r from-purple-700/50 to-fuchsia-500/40 border border-fuchsia-300/70 text-fuchsia-50 shadow-[0_0_12px_rgba(217,70,239,0.65)] ring-1 ring-fuchsia-200/40",
    5: "bg-gradient-to-r from-amber-600/60 via-orange-500/60 to-rose-500/50 border border-amber-200/80 text-amber-50 shadow-[0_0_14px_rgba(245,158,11,0.85)] ring-1 ring-amber-200/60",
    6: "bg-[conic-gradient(at_top_left,#ef4444,#f59e0b,#ef4444,#7f1d1d,#ef4444)] border border-red-200 text-white shadow-[0_0_18px_rgba(239,68,68,0.95)] ring-2 ring-red-300/70 animate-pulse",
  };

  return (
    <span
      className={`inline-flex items-center font-black rounded-full whitespace-nowrap ${s.wrap} ${styles[tier.level] || styles[1]}`}
      title={tier.label}
    >
      <Icon className={`${s.icon} drop-shadow`} />
      {showLabel && <span className="tracking-wide">{tier.badgeName}</span>}
    </span>
  );
};

export default RoomLevelBadge;
