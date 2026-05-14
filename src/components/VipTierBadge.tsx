import { memo } from "react";
import { getVipTier } from "@/lib/vipConfig";

/**
 * Premium per-tier VIP badge — a hand-crafted SVG emblem unique to each level.
 * Designed to look like badges from major social/voice apps:
 * shaped shield with metallic gradient, animated shine sweep, tier-specific
 * iconography (snowflake, dragon scales, nova rays, phoenix wing, royal
 * crown, eternal rune) and big "VIP N" lockup.
 */

interface Props {
  level: number;
  /** Visual size in px (height). Width auto = 2.6× height for shield aspect. */
  size?: number;
  /** Adds a strong floating glow + slow rotate animation, used in entrance overlays. */
  showcase?: boolean;
  className?: string;
}

const TIER_ICONS: Record<number, (color: string) => JSX.Element> = {
  1: (c) => (
    <g stroke={c} strokeWidth="1.4" fill="none" strokeLinecap="round">
      <circle cx="0" cy="0" r="6" fill={c} fillOpacity="0.9" />
      <circle cx="0" cy="0" r="10" opacity="0.7" />
      <circle cx="0" cy="0" r="14" opacity="0.35" />
    </g>
  ),
  2: (c) => (
    <g stroke={c} strokeWidth="1.6" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((r) => (
        <line key={r} x1="-12" y1="0" x2="12" y2="0" transform={`rotate(${r})`} />
      ))}
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <line key={`t-${r}`} x1="8" y1="0" x2="12" y2="-3" transform={`rotate(${r})`} />
      ))}
      <circle cx="0" cy="0" r="2.2" fill={c} />
    </g>
  ),
  3: (c) => (
    <g fill={c}>
      {/* dragon wings */}
      <path d="M 0 0 Q -10 -8 -16 -2 Q -10 2 -4 4 Z" opacity="0.95" />
      <path d="M 0 0 Q 10 -8 16 -2 Q 10 2 4 4 Z" opacity="0.95" />
      <path d="M -2 -4 L 0 -12 L 2 -4 Z" />
      <circle cx="0" cy="2" r="2.4" />
    </g>
  ),
  4: (c) => (
    <g stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round">
      {[0, 45, 90, 135].map((r) => (
        <line key={r} x1="-14" y1="0" x2="14" y2="0" transform={`rotate(${r})`} />
      ))}
      <circle cx="0" cy="0" r="4" fill={c} />
      <circle cx="0" cy="0" r="9" strokeOpacity="0.4" />
    </g>
  ),
  5: (c) => (
    <g fill={c}>
      {/* phoenix silhouette */}
      <path d="M 0 -10 Q 8 -6 12 0 Q 6 -2 0 -2 Q -6 -2 -12 0 Q -8 -6 0 -10 Z" />
      <path d="M 0 -2 Q 10 4 14 10 Q 4 6 0 8 Q -4 6 -14 10 Q -10 4 0 -2 Z" opacity="0.85" />
      <circle cx="0" cy="-6" r="1.6" fill="hsl(0 0% 100%)" />
    </g>
  ),
  6: (c) => (
    <g fill={c} stroke={c} strokeWidth="1.2" strokeLinejoin="round">
      {/* royal crown */}
      <path d="M -14 6 L -10 -8 L -4 2 L 0 -12 L 4 2 L 10 -8 L 14 6 Z" />
      <rect x="-14" y="6" width="28" height="3" rx="1" />
      <circle cx="-10" cy="-8" r="1.6" fill="hsl(0 0% 100%)" />
      <circle cx="0" cy="-12" r="1.8" fill="hsl(0 0% 100%)" />
      <circle cx="10" cy="-8" r="1.6" fill="hsl(0 0% 100%)" />
    </g>
  ),
  7: (c) => (
    <g stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round">
      {/* eternal rune: infinity + star */}
      <path d="M -10 0 C -10 -6 -2 -6 0 0 C 2 6 10 6 10 0 C 10 -6 2 -6 0 0 C -2 6 -10 6 -10 0 Z" />
      {[0, 72, 144, 216, 288].map((r) => (
        <line key={r} x1="0" y1="-13" x2="0" y2="-9" transform={`rotate(${r})`} />
      ))}
      <circle cx="0" cy="0" r="2" fill={c} />
    </g>
  ),
};

const VipTierBadge = memo(({ level, size = 36, showcase = false, className = "" }: Props) => {
  const tier = getVipTier(level);
  if (!tier) return null;

  const h = size;
  const w = Math.round(size * 2.6);
  const id = `vip-${level}`;
  const primary = `hsl(${tier.primary})`;
  const secondary = `hsl(${tier.secondary})`;
  const glow = `hsl(${tier.glow})`;
  const Icon = TIER_ICONS[level] || TIER_ICONS[1];

  return (
    <div
      className={`relative inline-block ${showcase ? "vip-tier-badge-showcase" : ""} ${className}`}
      style={{
        width: w,
        height: h,
        filter: showcase
          ? `drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 40px ${primary})`
          : `drop-shadow(0 2px 6px ${glow})`,
      }}
      title={`${tier.titleEn} — VIP ${level}`}
    >
      <svg
        viewBox="0 0 260 100"
        width={w}
        height={h}
        className="overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary} />
            <stop offset="55%" stopColor={secondary} />
            <stop offset="100%" stopColor={primary} />
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glow} stopOpacity="0.95" />
            <stop offset="50%" stopColor="hsl(0 0% 100% / 0.55)" />
            <stop offset="100%" stopColor={glow} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={`${id}-text`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(0 0% 100%)" />
            <stop offset="55%" stopColor="hsl(0 0% 96%)" />
            <stop offset="100%" stopColor={glow} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(0 0% 100%)" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(0 0% 100%)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(0 0% 100%)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${id}-medal`} cx="0.5" cy="0.45" r="0.6">
            <stop offset="0%" stopColor="hsl(0 0% 100% / 0.35)" />
            <stop offset="60%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </radialGradient>
          <clipPath id={`${id}-clip`}>
            <path d="M 8 18 Q 8 6 22 6 L 238 6 Q 252 6 252 18 L 252 70 Q 252 82 238 84 L 70 84 L 50 96 L 50 84 L 22 84 Q 8 82 8 70 Z" />
          </clipPath>
        </defs>

        {/* Outer glow halo (showcase only) */}
        {showcase && (
          <ellipse cx="130" cy="50" rx="140" ry="55" fill={glow} opacity="0.18">
            <animate attributeName="opacity" values="0.12;0.28;0.12" dur="2.4s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Shield body */}
        <path
          d="M 8 18 Q 8 6 22 6 L 238 6 Q 252 6 252 18 L 252 70 Q 252 82 238 84 L 70 84 L 50 96 L 50 84 L 22 84 Q 8 82 8 70 Z"
          fill={`url(#${id}-body)`}
        />

        {/* Inner highlight */}
        <path
          d="M 14 20 Q 14 12 24 12 L 236 12 Q 246 12 246 20 L 246 38 Q 130 56 14 38 Z"
          fill="hsl(0 0% 100%)"
          opacity="0.18"
        />

        {/* Animated shine sweep, clipped to shield */}
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="-80" y="0" width="60" height="100" fill={`url(#${id}-shine)`} transform="skewX(-20)">
            <animate attributeName="x" from="-80" to="320" dur="3.2s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* Rim stroke */}
        <path
          d="M 8 18 Q 8 6 22 6 L 238 6 Q 252 6 252 18 L 252 70 Q 252 82 238 84 L 70 84 L 50 96 L 50 84 L 22 84 Q 8 82 8 70 Z"
          fill="none"
          stroke={`url(#${id}-rim)`}
          strokeWidth="2.5"
        />

        {/* Left medallion with tier-specific icon */}
        <g transform="translate(46, 44)">
          <circle r="26" fill={`url(#${id}-medal)`} stroke={glow} strokeWidth="2" />
          <circle r="22" fill="none" stroke="hsl(0 0% 100% / 0.35)" strokeWidth="0.8" strokeDasharray="2 3" />
          <g>{Icon("hsl(0 0% 100%)")}</g>
          {showcase && (
            <circle r="26" fill="none" stroke={glow} strokeWidth="1.2" opacity="0.7">
              <animate attributeName="r" values="26;30;26" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </g>

        {/* "VIP" word */}
        <text
          x="92"
          y="46"
          fontFamily="'Cairo', system-ui, sans-serif"
          fontSize="26"
          fontWeight="900"
          fill={`url(#${id}-text)`}
          letterSpacing="2"
        >
          VIP
        </text>
        {/* Tier number — large dramatic */}
        <text
          x="160"
          y="58"
          fontFamily="'Cairo', system-ui, sans-serif"
          fontSize="52"
          fontWeight="900"
          fill={`url(#${id}-text)`}
          stroke={glow}
          strokeWidth="0.6"
        >
          {level}
        </text>
        {/* Tier title */}
        <text
          x="92"
          y="74"
          fontFamily="'Cairo', system-ui, sans-serif"
          fontSize="10"
          fontWeight="700"
          fill="hsl(0 0% 100%)"
          opacity="0.92"
          letterSpacing="1"
        >
          {tier.titleEn.toUpperCase()}
        </text>
      </svg>
    </div>
  );
});

VipTierBadge.displayName = "VipTierBadge";
export default VipTierBadge;
