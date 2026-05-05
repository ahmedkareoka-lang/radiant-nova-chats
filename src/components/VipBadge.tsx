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
      className={`inline-flex items-center rounded-full font-bold text-foreground vip-badge-glow ${sizes[size]}`}
      style={{
        background: tier.gradient,
        boxShadow: tier.shadow,
        // CSS var consumed by .vip-badge-glow keyframes
        ["--vip-glow" as any]: `hsl(${tier.glow})`,
      }}
      title={`${tier.titleEn} — ${tier.tagline}`}
    >
      <Crown className={crownSizes[size]} />
      <span>VIP {level}</span>
      {showTitle && <span className="opacity-90">· {tier.title}</span>}
    </div>
  );
};

export default VipBadge;
