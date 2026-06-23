import { Mic } from "lucide-react";
import PremiumBadgePill from "@/components/PremiumBadgePill";

type Props = { size?: "sm" | "md" | "lg" };

const HostBadge = ({ size = "sm" }: Props) => {
  const iconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  return (
    <PremiumBadgePill
      hue1="270 80% 55%" hue2="290 90% 65%" glow="280 100% 70%" rim="290 100% 80%"
      size={size} icon={<Mic size={iconSize} />}
      title="مضيف غرفة"
      description="منشئ ومدير غرفة صوتية رسمية"
    >مضيف</PremiumBadgePill>
  );
};

export default HostBadge;
