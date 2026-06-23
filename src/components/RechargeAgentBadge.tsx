import { Flame } from "lucide-react";
import PremiumBadgePill from "@/components/PremiumBadgePill";

type Props = { size?: "sm" | "md" | "lg" };

const RechargeAgentBadge = ({ size = "sm" }: Props) => {
  const iconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  return (
    <PremiumBadgePill
      hue1="0 85% 50%" hue2="25 100% 55%" glow="20 100% 60%" rim="40 100% 65%"
      size={size} icon={<Flame size={iconSize} />}
      title="وكيل شحن معتمد"
      description="يمكنه شحن العملات للمستخدمين مباشرة عبر واتساب"
    >وكيل شحن</PremiumBadgePill>
  );
};

export default RechargeAgentBadge;
