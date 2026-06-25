import { Flame, Heart } from "lucide-react";
import { getSupporterTier } from "@/lib/supporterTiers";

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

/**
 * Fancy gift-supporter badge. Renders only when the user has crossed at least
 * the 500K coin spending threshold. Designed to look premium next to VIP /
 * Agent / BD pills already used across the app.
 */
const SupporterBadge = ({ coinsSpent, size = "sm", showTitle = false }: SupporterBadgeProps) => {
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
        textShadow: tier.fire ? "0 0 6px rgba(255,180,40,0.8)" : "none",
      }}
      title={`${tier.title} • ${tier.short}`}
    >
      {tier.fire ? (
        <Flame size={s.fire} className="drop-shadow-[0_0_6px_rgba(255,150,0,0.95)]" fill="currentColor" />
      ) : (
        <Heart size={s.icon} fill="currentColor" />
      )}
      <span className="tracking-wide">{tier.short}</span>
      {tier.fire && (
        <span
          className="ml-0.5 px-1 rounded-full text-[9px] font-black"
          style={{
            background: "linear-gradient(135deg, #ff2d00, #ffb800)",
            color: "#1a0500",
            boxShadow: "0 0 8px rgba(255,120,0,0.9)",
          }}
        >
          داعم
        </span>
      )}
      {showTitle && (
        <span className="ml-1 opacity-90 font-bold" style={{ color: tier.text }}>
          {tier.title}
        </span>
      )}
    </span>
  );
};

export default SupporterBadge;
