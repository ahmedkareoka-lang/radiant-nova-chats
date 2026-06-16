import { Award } from "lucide-react";
import PremiumBadgePill from "@/components/PremiumBadgePill";

type Props = { size?: "sm" | "md" | "lg" };

/** Static premium "وكيل" (Agency Agent) badge — gold/amber. */
const AgentBadge = ({ size = "sm" }: Props) => {
  const iconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  return (
    <PremiumBadgePill
      hue1="42 95% 50%"
      hue2="50 100% 60%"
      glow="48 100% 65%"
      rim="55 100% 75%"
      size={size}
      icon={<Award size={iconSize} />}
    >
      وكيل
    </PremiumBadgePill>
  );
};

export default AgentBadge;
