import { Briefcase } from "lucide-react";
import PremiumBadgePill from "@/components/PremiumBadgePill";

type Props = { size?: "sm" | "md" | "lg" };

const BDBadge = ({ size = "sm" }: Props) => {
  const iconSize = size === "lg" ? 14 : size === "md" ? 12 : 10;
  return (
    <PremiumBadgePill
      hue1="25 100% 52%" hue2="42 100% 58%" glow="38 100% 62%" rim="48 100% 70%"
      size={size} icon={<Briefcase size={iconSize} />}
      title="وكيل تطوير الأعمال (BD)"
      description="مسؤول عن متابعة الوكالات وتنميتها داخل NOVA"
    >BD</PremiumBadgePill>
  );
};

export default BDBadge;
