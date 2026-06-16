import { Briefcase } from "lucide-react";
import PremiumBadgePill from "@/components/PremiumBadgePill";

type Props = { size?: "sm" | "md" | "lg" };

/** Static, heavy-glow BD (Business Developer) badge (orange/amber). */
const BDBadge = ({ size = "sm" }: Props) => {
  const iconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  return (
    <PremiumBadgePill
      hue1="25 100% 52%"
      hue2="42 100% 58%"
      glow="38 100% 62%"
      rim="48 100% 70%"
      size={size}
      icon={<Briefcase size={iconSize} />}
    >
      BD
    </PremiumBadgePill>
  );
};

export default BDBadge;
