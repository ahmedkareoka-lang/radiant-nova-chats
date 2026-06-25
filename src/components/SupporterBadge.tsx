import { Flame, Heart } from "lucide-react";
import { getSupporterTier, type SupporterTier } from "@/lib/supporterTiers";

interface SupporterBadgeProps {
  /** Total NOVA coins this user has spent on gifts (profiles.total_spend_gold). */
  coinsSpent: number | null | undefined;
  size?: "sm" | "md" | "lg";
  /** Show the Arabic tier title alongside the pill. */
  showTitle?: boolean;
}

const SIZE = {
  sm: { h: "h-5", px: "px-1.5", text: "text-[10px]", icon: 10, fire: 11 },
  md: { h: "h-6", px: "px-2",   text: "text-[11px]", icon: 12, fire: 13 },
  lg: { h: "h-8", px: "px-3",   text: "text-sm",     icon: 14, fire: 16 },
} as const;

/** Tier pill only (e.g. "500K"). Always shown when a tier is unlocked. */
export const SupporterAchievementBadge = ({ coinsSpent, size = "sm", showTitle = false }: SupporterBadgeProps) => {
  const tier = getSupporterTier(coinsSpent);
  if (!tier) return null;
  const s = SIZE[size];
  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full font-black ${s.h} ${s.px} ${s.text} align-middle whitespace-nowrap`}
      style={{
        background: tier.gradient,
        color: tier.text,
        boxShadow: `0 0 14px ${tier.glow}, inset 0 0 0 1px ${tier.ring}`,
      }}
      title={`${tier.title} • ${tier.short}`}
    >
      <Heart size={s.icon} fill="currentColor" />
      <span className="tracking-wide">{tier.short}</span>
      {showTitle && (
        <span className="ml-1 opacity-90 font-bold" style={{ color: tier.text }}>
          {tier.title}
        </span>
      )}
    </span>
  );
};

/** Fiery "داعم" pill — shown independently when the user crosses 5M coins spent. */
export const SupporterFireBadge = ({ coinsSpent, size = "sm" }: SupporterBadgeProps) => {
  const tier = getSupporterTier(coinsSpent);
  if (!tier?.fire) return null;
  const s = SIZE[size];
  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full font-black ${s.h} ${s.px} ${s.text} align-middle whitespace-nowrap`}
      style={{
        background: "linear-gradient(135deg, #ff2d00, #ffb800 60%, #ff6a00)",
        color: "#1a0500",
        boxShadow: "0 0 16px hsl(28 100% 55% / 0.95), inset 0 0 0 1px #fff5b0",
        textShadow: "0 0 6px rgba(255,180,40,0.8)",
      }}
      title="داعم ناري"
    >
      <Flame size={s.fire} className="drop-shadow-[0_0_6px_rgba(255,150,0,0.95)]" fill="currentColor" />
      <span className="tracking-wide">داعم</span>
    </span>
  );
};

/** Convenience: renders BOTH badges side-by-side (tier + fire). */
const SupporterBadge = (props: SupporterBadgeProps) => {
  const tier = getSupporterTier(props.coinsSpent);
  if (!tier) return null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <SupporterAchievementBadge {...props} />
      <SupporterFireBadge {...props} />
    </span>
  );
};

export default SupporterBadge;
