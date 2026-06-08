import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
import LoveAura from "./LoveAura";

interface Props {
  user1Avatar?: string | null;
  user1Name?: string;
  user2Avatar?: string | null;
  user2Name?: string;
  level: number;
  points: number;
  customTitle?: string | null;
}

/**
 * Legendary cinematic love badge — Lv 7+ unlocks the full hero presentation.
 * For lower levels it renders a softer scaled-down version.
 */
const LegendaryLoveBadge = ({ user1Avatar, user1Name, user2Avatar, user2Name, level, points, customTitle }: Props) => {
  const showCrown = level >= 10;
  const showCustomTitle = level >= 9 && customTitle;
  const heartGradient = level >= 10
    ? "conic-gradient(from 0deg, hsl(45 100% 60%), hsl(330 100% 65%), hsl(280 95% 65%), hsl(45 100% 60%))"
    : level >= 7
    ? "linear-gradient(135deg, hsl(45 100% 60%), hsl(330 95% 60%), hsl(280 95% 60%))"
    : "linear-gradient(135deg, hsl(330 95% 60%), hsl(280 90% 60%))";

  return (
    <div className="relative flex flex-col items-center pt-4 pb-2">
      {/* Aura layer */}
      <div className="relative w-full flex items-center justify-center" style={{ minHeight: 220 }}>
        <LoveAura level={level} size={280} />

        {/* Floating sparkles for Lv6+ */}
        {level >= 6 && [...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none text-yellow-200"
            style={{ fontSize: 12 }}
            initial={{
              x: Math.cos((i * Math.PI) / 4) * 110,
              y: Math.sin((i * Math.PI) / 4) * 110,
              opacity: 0,
            }}
            animate={{
              x: Math.cos((i * Math.PI) / 4 + Math.PI) * 110,
              y: Math.sin((i * Math.PI) / 4 + Math.PI) * 110,
              opacity: [0, 1, 0],
              rotate: 360,
            }}
            transition={{ duration: 6 + i * 0.4, repeat: Infinity, ease: "linear" }}
          >
            ✦
          </motion.div>
        ))}

        {/* Avatars row */}
        <div className="relative z-10 flex items-center gap-3">
          {/* User 1 */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-20 h-20 rounded-full overflow-hidden ring-4"
              style={{
                borderColor: "hsl(330 95% 65%)",
                boxShadow: `0 0 22px hsl(330 95% 65% / 0.7)`,
              }}
            >
              <img loading="lazy" src={user1Avatar || "https://i.pravatar.cc/120"} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-[11px] font-bold text-pink-100 mt-1 max-w-[80px] truncate">{user1Name ?? ""}</p>
          </motion.div>

          {/* Center heart */}
          <motion.div
            animate={{ scale: [1, 1.12, 1], rotate: level >= 10 ? [0, 5, -5, 0] : 0 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-20"
            style={{ filter: "drop-shadow(0 0 16px hsl(330 100% 65% / 0.9))" }}
          >
            <div
              className="w-16 h-16 flex items-center justify-center"
              style={{
                background: heartGradient,
                clipPath: "path('M32 56 C16 44, 4 32, 4 20 C4 12, 12 4, 20 4 C26 4, 30 8, 32 12 C34 8, 38 4, 44 4 C52 4, 60 12, 60 20 C60 32, 48 44, 32 56 Z')",
              }}
            />
            {showCrown && (
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-5 left-1/2 -translate-x-1/2"
              >
                <Crown className="w-6 h-6 text-yellow-400" style={{ filter: "drop-shadow(0 0 8px gold)" }} />
              </motion.div>
            )}
          </motion.div>

          {/* User 2 */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-20 h-20 rounded-full overflow-hidden ring-4"
              style={{
                borderColor: "hsl(280 95% 65%)",
                boxShadow: `0 0 22px hsl(280 95% 65% / 0.7)`,
              }}
            >
              <img loading="lazy" src={user2Avatar || "https://i.pravatar.cc/120?img=5"} alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-[11px] font-bold text-purple-100 mt-1 max-w-[80px] truncate">{user2Name ?? ""}</p>
          </motion.div>
        </div>
      </div>

      {/* Points & title */}
      <motion.p
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mt-1 text-2xl font-black tracking-tight"
        style={{
          background: "linear-gradient(135deg, hsl(45 100% 65%), hsl(330 100% 70%))",
          WebkitBackgroundClip: "text",
          color: "transparent",
          textShadow: "0 0 18px hsl(330 95% 60% / 0.5)",
        }}
      >
        {points.toLocaleString()} 💖
      </motion.p>

      <div className="flex items-center gap-1.5 mt-1">
        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
        <p className="text-xs font-black text-pink-200">
          {showCustomTitle ? customTitle : level >= 10 ? "Soulmates أسطوريان" : level >= 7 ? "Soulmates" : "حبيبين"} · Lv.{level}
        </p>
        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
      </div>
    </div>
  );
};

export default LegendaryLoveBadge;
