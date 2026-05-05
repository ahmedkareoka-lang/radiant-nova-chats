import { memo } from "react";
import { getVipTier } from "@/lib/vipConfig";

/**
 * 👑 VipName — animated, crowned name styled by VIP tier.
 *
 * Tiers 1-2: subtle colored glow + tier crest before the name.
 * Tiers 3-4: gradient text + small crown + gentle glow pulse.
 * Tier 5 (Phoenix): red/orange flaming text with rising heat shimmer.
 * Tier 6 (Celestial Emperor): golden fiery text with shimmering sweep + crown.
 * Tier 7 (Eternal Legend): rainbow holographic text — multi-color animated
 * gradient + halo, dual crowns, sparkle particles. Truly otherworldly.
 *
 * Non-VIP / level 0 → renders plain name (className passes through).
 */
interface Props {
  name: string;
  level?: number | null;
  className?: string;
  /** Optional size hint for crowns/sparkles */
  size?: "sm" | "md" | "lg";
}

const SIZE_PX: Record<NonNullable<Props["size"]>, { crown: string; spark: string }> = {
  sm: { crown: "text-[10px]", spark: "text-[8px]" },
  md: { crown: "text-xs", spark: "text-[9px]" },
  lg: { crown: "text-sm", spark: "text-[10px]" },
};

export const VipName = memo(function VipName({
  name,
  level,
  className = "",
  size = "md",
}: Props) {
  const tier = getVipTier(level);
  const s = SIZE_PX[size];

  // No VIP → plain
  if (!tier) {
    return <span className={className}>{name}</span>;
  }

  // VIP 7 — Eternal Legend (rainbow holographic, dual crown, sparkles)
  if (tier.level === 7) {
    return (
      <span className={`vip-name vip7-name inline-flex items-center gap-1 ${className}`}>
        <span className={`vip7-sparkle ${s.spark}`} aria-hidden>✦</span>
        <span className={`vip7-crown ${s.crown}`} aria-hidden>👑</span>
        <span className="vip7-text">{name}</span>
        <span className={`vip7-crown ${s.crown}`} aria-hidden>👑</span>
        <span className={`vip7-sparkle ${s.spark}`} aria-hidden>✧</span>
      </span>
    );
  }

  // VIP 6 — Celestial Emperor (golden fire + crown sweep)
  if (tier.level === 6) {
    return (
      <span className={`vip-name vip6-name inline-flex items-center gap-1 ${className}`}>
        <span className={`vip6-crown ${s.crown}`} aria-hidden>👑</span>
        <span className="vip6-text">{name}</span>
        <span className={`vip6-flame ${s.spark}`} aria-hidden>🔥</span>
      </span>
    );
  }

  // VIP 5 — Phoenix (red/orange flame text)
  if (tier.level === 5) {
    return (
      <span className={`vip-name vip5-name inline-flex items-center gap-1 ${className}`}>
        <span className={`vip5-flame ${s.spark}`} aria-hidden>🔥</span>
        <span className="vip5-text">{name}</span>
        <span className={`vip5-flame ${s.spark}`} aria-hidden>🔥</span>
      </span>
    );
  }

  // VIP 3-4 — gradient name + tier crest
  if (tier.level >= 3) {
    return (
      <span
        className={`vip-name vip-mid-name inline-flex items-center gap-1 ${className}`}
        style={{
          // expose tier colors as CSS vars for the animated background
          ["--vip-c1" as any]: `hsl(${tier.primary})`,
          ["--vip-c2" as any]: `hsl(${tier.secondary})`,
          ["--vip-glow" as any]: `hsl(${tier.glow})`,
        }}
      >
        <span className={s.crown} aria-hidden style={{ color: `hsl(${tier.glow})` }}>♛</span>
        <span className="vip-mid-text">{name}</span>
      </span>
    );
  }

  // VIP 1-2 — subtle glow + crest
  return (
    <span
      className={`vip-name vip-low-name inline-flex items-center gap-1 ${className}`}
      style={{
        ["--vip-glow" as any]: `hsl(${tier.glow})`,
        color: `hsl(${tier.primary})`,
        textShadow: `0 0 8px hsl(${tier.glow} / 0.55)`,
      }}
    >
      <span className={s.spark} aria-hidden style={{ color: `hsl(${tier.glow})` }}>{tier.crest}</span>
      <span>{name}</span>
    </span>
  );
});

export default VipName;
