import VipStaticBadge from "./VipStaticBadge";

interface DualBadgeProps {
  /** @deprecated kept for backwards compatibility — NOVA P removed */
  novaLevel?: number;
  vipLevel: number;
  size?: "sm" | "md" | "lg";
  luxury?: boolean;
}

/**
 * Backwards-compatible badge wrapper. NOVA P has been removed from the system;
 * this now only renders the new static VIP badge.
 */
export default function DualBadge({ vipLevel, size = "sm" }: DualBadgeProps) {
  if (!vipLevel || vipLevel <= 0) return null;
  return <VipStaticBadge level={vipLevel} size={size} />;
}
