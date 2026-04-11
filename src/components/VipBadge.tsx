import { Crown } from "lucide-react";

interface VipBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
}

const VipBadge = ({ level, size = "sm" }: VipBadgeProps) => {
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-0.5",
    md: "text-xs px-3 py-1 gap-1",
    lg: "text-sm px-4 py-1.5 gap-1.5",
  };

  const crownSizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };

  return (
    <div className={`inline-flex items-center rounded-full gradient-vip font-bold text-accent-foreground ${sizes[size]}`}>
      <Crown className={crownSizes[size]} />
      <span>VIP {level}</span>
    </div>
  );
};

export default VipBadge;
