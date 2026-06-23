import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Unified premium badge pill — STATIC (no motion), heavy multi-layer glow,
 * metallic gradient body, inner shine line, rim light, outer halo.
 * All role badges (Agent / Host / Recharge Agent / BD) reuse this look
 * so they feel like a coherent legendary set.
 *
 * Pass `title` (and optional `description`) to attach a tooltip showing
 * the badge's name and short explanation on hover/long-press.
 */

type Size = "sm" | "md" | "lg";

interface Props {
  hue1: string;
  hue2: string;
  glow: string;
  rim?: string;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Tooltip headline (badge full name) */
  title?: string;
  /** Tooltip subtitle (short description) */
  description?: string;
}

const SIZE_CLS: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[10px] gap-1",
  md: "px-2.5 py-1 text-[11px] gap-1.5",
  lg: "px-3 py-1.5 text-[13px] gap-2",
};

const PremiumBadgePill = ({
  hue1, hue2, glow, rim, size = "md", icon, children, className = "", title, description,
}: Props) => {
  const rimColor = rim || glow;
  const chip = (
    <span
      className={`relative inline-flex items-center ${SIZE_CLS[size]} font-black text-white rounded-full
        whitespace-nowrap select-none ${title ? "cursor-help" : ""} ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}) 0%, hsl(${hue2}) 50%, hsl(${hue1}) 100%)`,
        border: `1.5px solid hsl(${rimColor} / 0.9)`,
        boxShadow: [
          `0 0 0 1px hsl(${rimColor} / 0.35)`,
          `0 0 12px hsl(${glow} / 0.85)`,
          `0 0 28px hsl(${glow} / 0.55)`,
          `0 0 52px hsl(${hue2} / 0.4)`,
          `inset 0 1px 0 hsl(0 0% 100% / 0.45)`,
          `inset 0 -1px 0 hsl(0 0% 0% / 0.25)`,
        ].join(", "),
        textShadow: `0 0 6px hsl(${glow} / 0.9), 0 1px 1px hsl(0 0% 0% / 0.5)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-t-full opacity-50"
        style={{ background: "linear-gradient(to bottom, hsl(0 0% 100% / 0.55), transparent)" }}
      />
      {icon && (
        <span className="relative inline-flex items-center justify-center drop-shadow-[0_0_4px_currentColor]">{icon}</span>
      )}
      <span className="relative tracking-wider">{children}</span>
    </span>
  );

  if (!title) return chip;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          <div className="font-bold text-sm">{title}</div>
          {description && <div className="text-[10px] opacity-80 mt-0.5">{description}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PremiumBadgePill;

