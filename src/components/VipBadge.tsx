import { getVipTier } from "@/lib/vipConfig";
import VipTierBadge from "@/components/VipTierBadge";

interface VipBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
  /** Show the tier title alongside the badge */
  showTitle?: boolean;
}

const SIZE_PX = { sm: 20, md: 28, lg: 38 } as const;

const VipBadge = ({ level, size = "sm", showTitle = false }: VipBadgeProps) => {
  const tier = getVipTier(level);
  if (!tier) return null;

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <VipTierBadge level={level} size={SIZE_PX[size]} />
      {showTitle && (
        <span
          className="text-xs font-bold"
          style={{ color: `hsl(${tier.glow})`, textShadow: `0 0 6px hsl(${tier.glow} / 0.6)` }}
        >
          {tier.title}
        </span>
      )}
    </span>
  );
};

export default VipBadge;
