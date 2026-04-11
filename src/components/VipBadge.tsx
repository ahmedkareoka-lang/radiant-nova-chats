import { Crown, Star, Gem, Sparkles } from "lucide-react";

interface VipBadgeProps {
  level: number;
  size?: "sm" | "md" | "lg";
}

const VIP_CONFIG: Record<number, { icon: React.ReactNode; gradient: string; label: string }> = {
  1: { icon: <Star />, gradient: "from-blue-500 to-blue-700", label: "VIP" },
  2: { icon: <Star />, gradient: "from-purple-500 to-purple-700", label: "VIP" },
  3: { icon: <Crown />, gradient: "from-amber-500 to-amber-700", label: "VIP" },
  4: { icon: <Crown />, gradient: "from-amber-400 to-orange-600", label: "VIP" },
  5: { icon: <Gem />, gradient: "from-rose-500 to-pink-700", label: "VIP" },
  6: { icon: <Gem />, gradient: "from-red-500 to-rose-700", label: "VIP" },
  7: { icon: <Sparkles />, gradient: "from-yellow-400 to-amber-600", label: "SVIP" },
  8: { icon: <Sparkles />, gradient: "from-yellow-300 to-yellow-600", label: "SVIP" },
  9: { icon: <Sparkles />, gradient: "from-yellow-200 via-amber-400 to-red-500", label: "SVIP" },
  10: { icon: <Sparkles />, gradient: "from-yellow-200 via-red-500 to-purple-600", label: "KING" },
};

const VipBadge = ({ level, size = "sm" }: VipBadgeProps) => {
  if (level <= 0) return null;

  const config = VIP_CONFIG[Math.min(level, 10)] || VIP_CONFIG[1];

  const sizes = {
    sm: { container: "text-[10px] px-2 py-0.5 gap-0.5", icon: "w-3 h-3" },
    md: { container: "text-xs px-3 py-1 gap-1", icon: "w-4 h-4" },
    lg: { container: "text-sm px-4 py-1.5 gap-1.5", icon: "w-5 h-5" },
  };

  const s = sizes[size];

  return (
    <div className={`inline-flex items-center rounded-full bg-gradient-to-r ${config.gradient} font-bold text-white shadow-lg ${s.container}`}>
      <span className={s.icon}>{config.icon}</span>
      <span>{config.label} {level}</span>
    </div>
  );
};

/** Inline VIP badge for chat messages - returns a small emoji-like indicator */
export const VipInlineBadge = ({ level }: { level: number }) => {
  if (level <= 0) return null;
  const config = VIP_CONFIG[Math.min(level, 10)] || VIP_CONFIG[1];
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold bg-gradient-to-r ${config.gradient} text-white rounded px-1 py-px ml-1`}>
      {config.label}{level}
    </span>
  );
};

export default VipBadge;
