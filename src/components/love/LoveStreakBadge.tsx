import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Props {
  streakDays: number;
}

const LoveStreakBadge = ({ streakDays }: Props) => {
  const tier = streakDays >= 30 ? "gold" : streakDays >= 14 ? "purple" : streakDays >= 7 ? "pink" : "rose";
  const colors = {
    gold:   { from: "hsl(45 100% 55%)",  to: "hsl(30 100% 50%)",  glow: "hsl(45 100% 60%)" },
    purple: { from: "hsl(280 90% 55%)",  to: "hsl(320 90% 55%)",  glow: "hsl(290 95% 65%)" },
    pink:   { from: "hsl(330 95% 60%)",  to: "hsl(0 90% 60%)",    glow: "hsl(330 95% 65%)" },
    rose:   { from: "hsl(350 90% 60%)",  to: "hsl(20 90% 55%)",   glow: "hsl(0 90% 65%)" },
  }[tier];

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2"
      style={{
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        borderColor: colors.glow,
        boxShadow: `0 0 14px ${colors.glow}80`,
      }}
    >
      <motion.div animate={{ scale: [1, 1.18, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
        <Flame className="w-4 h-4 text-white drop-shadow" />
      </motion.div>
      <span className="text-xs font-black text-white">
        🔥 {streakDays} يوم متتالي
      </span>
    </motion.div>
  );
};

export default LoveStreakBadge;
