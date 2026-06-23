import { memo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getVipTier } from "@/lib/vipConfig";

/**
 * 🏅 VipStaticBadge — fixed, no-motion VIP badge.
 *
 * Always renders "VIP1" → "VIP7" text with a tier-specific gradient and
 * multi-layer halo. Tooltip exposes title + tagline on hover/long-press.
 */
type Size = "xs" | "sm" | "md" | "lg";

interface Props {
  level: number | null | undefined;
  size?: Size;
  /** Show only the colored chip (no tooltip), useful inside other tooltipped wrappers */
  noTooltip?: boolean;
}

// Per-tier color recipe → keeps each VIP visually distinct & escalating in luxury.
// All values are HSL fragments (no `hsl()` wrap) for use in inline gradients.
const TIER: Record<number, {
  bg: string;           // base gradient (135deg)
  rim: string;          // outer rim color
  glow: string;         // halo color
  text: string;         // text/icon color
  shimmer: string;      // optional 2nd gradient stop for top-tier sheen
  ring: string;         // small inner ring/inset color
  emoji: string;        // small leading glyph
}> = {
  1: { bg: "linear-gradient(135deg, hsl(190 95% 55%), hsl(200 90% 45%))",                                              rim: "190 100% 75%", glow: "190 100% 60%", text: "190 100% 96%", shimmer: "190 100% 80%", ring: "190 100% 70%", emoji: "✦" },
  2: { bg: "linear-gradient(135deg, hsl(265 85% 60%), hsl(285 80% 50%))",                                              rim: "275 100% 80%", glow: "275 100% 65%", text: "280 100% 97%", shimmer: "285 100% 80%", ring: "280 100% 75%", emoji: "✧" },
  3: { bg: "linear-gradient(135deg, hsl(40 100% 55%), hsl(30 100% 48%))",                                              rim: "40 100% 75%",  glow: "40 100% 60%",  text: "45 100% 97%",  shimmer: "50 100% 80%",  ring: "45 100% 70%",  emoji: "★" },
  4: { bg: "linear-gradient(135deg, hsl(0 90% 55%), hsl(15 95% 50%))",                                                 rim: "10 100% 75%",  glow: "10 100% 60%",  text: "15 100% 97%",  shimmer: "20 100% 80%",  ring: "15 100% 70%",  emoji: "♛" },
  5: { bg: "linear-gradient(135deg, hsl(325 90% 60%), hsl(345 85% 55%))",                                              rim: "335 100% 80%", glow: "335 100% 65%", text: "340 100% 97%", shimmer: "345 100% 80%", ring: "335 100% 75%", emoji: "♕" },
  6: { bg: "linear-gradient(135deg, hsl(48 100% 60%), hsl(40 100% 50%), hsl(50 100% 65%))",                            rim: "50 100% 80%",  glow: "48 100% 65%",  text: "45 80% 18%",   shimmer: "55 100% 90%",  ring: "50 100% 75%",  emoji: "👑" },
  7: { bg: "linear-gradient(135deg, hsl(50 100% 70%), hsl(0 100% 65%), hsl(320 100% 65%), hsl(260 100% 70%), hsl(190 100% 65%))", rim: "0 0% 100%",     glow: "320 100% 70%", text: "0 0% 100%",   shimmer: "60 100% 95%",  ring: "0 0% 100%",     emoji: "🜲" },
};

const SIZES: Record<Size, { pad: string; font: string; gap: string; emoji: string }> = {
  xs: { pad: "px-1.5 py-[1px]", font: "text-[8px]",  gap: "gap-0.5", emoji: "text-[7px]" },
  sm: { pad: "px-2 py-0.5",     font: "text-[10px]", gap: "gap-1",   emoji: "text-[9px]" },
  md: { pad: "px-2.5 py-1",     font: "text-[11px]", gap: "gap-1",   emoji: "text-[10px]" },
  lg: { pad: "px-3 py-1.5",     font: "text-xs",     gap: "gap-1.5", emoji: "text-xs" },
};

const VipStaticBadgeInner = ({ level, size = "sm" }: Pick<Props, "level" | "size">) => {
  if (!level || level < 1 || level > 7) return null;
  const t = TIER[level];
  const s = SIZES[size];

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.pad} ${s.font} font-black rounded-full select-none whitespace-nowrap`}
      style={{
        background: t.bg,
        color: `hsl(${t.text})`,
        border: `1px solid hsl(${t.rim} / 0.85)`,
        boxShadow: [
          `0 0 0 1px hsl(${t.ring} / 0.35)`,
          `0 0 10px hsl(${t.glow} / 0.55)`,
          `0 0 22px hsl(${t.glow} / 0.35)`,
          `inset 0 1px 0 hsl(${t.shimmer} / 0.45)`,
          `inset 0 -1px 0 hsl(0 0% 0% / 0.25)`,
        ].join(", "),
        textShadow: level >= 6 ? "none" : `0 0 6px hsl(${t.glow} / 0.7)`,
      }}
    >
      <span className={s.emoji} aria-hidden>{t.emoji}</span>
      <span className="tracking-wide">VIP{level}</span>
    </span>
  );
};

export const VipStaticBadge = memo(function VipStaticBadge({ level, size = "sm", noTooltip = false }: Props) {
  const tier = getVipTier(level ?? 0);
  if (!tier) return null;
  const chip = <VipStaticBadgeInner level={tier.level} size={size} />;
  if (noTooltip) return chip;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{chip}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <div className="font-bold text-sm">VIP {tier.level} · {tier.title}</div>
          <div className="text-[10px] opacity-80 mt-0.5">{tier.tagline}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

export default VipStaticBadge;
