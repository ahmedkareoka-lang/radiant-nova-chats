import { Crown } from "lucide-react";
import { getVipTier } from "@/lib/vipConfig";

interface VipBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  /** Show the tier title alongside the level (default: false, just shows "VIP N") */
  showTitle?: boolean;
}

const VipBadge = ({ level, size = "sm", showTitle = false }: VipBadgeProps) => {
  const tier = getVipTier(level);
  if (!tier) return null;

  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-0.5",
    md: "text-xs px-3 py-1 gap-1",
    lg: "text-sm px-4 py-1.5 gap-1.5",
  };
  const crownSizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };

  return (
    <div
      className={`relative inline-flex items-center rounded-full font-black text-foreground vip-badge-glow vip-badge-shine ${sizes[size]}`}
      style={{
        background: tier.gradient,
        boxShadow: tier.shadow,
        border: `1px solid hsl(${tier.glow} / 0.7)`,
        ["--vip-glow" as any]: `hsl(${tier.glow})`,
        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
      title={`${tier.titleEn} — ${tier.tagline}`}
    >
      <Crown className={crownSizes[size]} style={{ filter: `drop-shadow(0 0 4px hsl(${tier.glow}))` }} />
      <span>VIP {level}</span>
      {showTitle && <span className="opacity-90">· {tier.title}</span>}
    </div>
  );
};

export default VipBadge;
