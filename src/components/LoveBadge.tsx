import { motion } from "framer-motion";
import { Crown } from "lucide-react";

interface Props {
  user1Avatar?: string | null;
  user2Avatar?: string | null;
  level: number;
  points: number;
  size?: "sm" | "md" | "lg";
}

/**
 * Romantic LoveBadge — two avatars side by side with a winged crystal heart
 * between them. Visual richness escalates with `level`.
 */
const LoveBadge = ({ user1Avatar, user2Avatar, level, points, size = "md" }: Props) => {
  const dims = {
    sm: { avatar: "w-10 h-10", heart: "w-9 h-9", wings: "w-16", text: "text-[9px]", points: "text-[10px]" },
    md: { avatar: "w-14 h-14", heart: "w-12 h-12", wings: "w-24", text: "text-[11px]", points: "text-xs" },
    lg: { avatar: "w-20 h-20", heart: "w-16 h-16", wings: "w-32", text: "text-sm", points: "text-base" },
  }[size];

  // Tier-based visuals
  const heartGradient = level >= 10
    ? "linear-gradient(135deg, #fff 0%, #ffd700 30%, #ff1493 60%, #ff4d8d 100%)"
    : level >= 7
    ? "linear-gradient(135deg, #ffd700 0%, #ff69b4 50%, #ff1493 100%)"
    : level >= 4
    ? "linear-gradient(135deg, #ffb6e1 0%, #ff69b4 50%, #d6336c 100%)"
    : "linear-gradient(135deg, #ffc0cb 0%, #ff69b4 100%)";

  const showFloatingHearts = level >= 2;
  const showCrystal = level >= 4;
  const showSparkles = level >= 6;
  const showCrown = level >= 10;

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {/* Main row: avatar — heart — avatar */}
      <div className="relative flex items-center gap-1">
        {/* Avatar 1 */}
        <div className={`${dims.avatar} rounded-full overflow-hidden ring-2 ring-pink-400/70 shadow-[0_0_12px_hsl(330_90%_60%/0.5)]`}>
          <img loading="lazy" decoding="async" src={user1Avatar || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Heart with wings */}
        <div className="relative flex items-center justify-center mx-1">
          {/* Wings */}
          <div className={`absolute inset-0 flex items-center justify-between ${dims.wings} -mx-2 pointer-events-none`}>
            <motion.svg
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              viewBox="0 0 40 30" className="w-1/2 h-auto opacity-90"
              style={{ filter: "drop-shadow(0 0 6px hsl(330 90% 70%))" }}
            >
              <path d="M40 15 Q20 0 5 8 Q0 15 5 22 Q20 30 40 15 Z" fill="url(#wingL)" />
              <defs>
                <linearGradient id="wingL" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(330 90% 75%)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(330 90% 90%)" stopOpacity="0.95" />
                </linearGradient>
              </defs>
            </motion.svg>
            <motion.svg
              animate={{ rotate: [8, -8, 8] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              viewBox="0 0 40 30" className="w-1/2 h-auto opacity-90"
              style={{ filter: "drop-shadow(0 0 6px hsl(330 90% 70%))" }}
            >
              <path d="M0 15 Q20 0 35 8 Q40 15 35 22 Q20 30 0 15 Z" fill="url(#wingR)" />
              <defs>
                <linearGradient id="wingR" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(330 90% 90%)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="hsl(330 90% 75%)" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </motion.svg>
          </div>

          {/* Heart */}
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className={`relative ${dims.heart} z-10`}
            style={{ filter: `drop-shadow(0 0 8px hsl(330 95% 65% / 0.8))${level >= 6 ? " drop-shadow(0 0 14px hsl(45 100% 60% / 0.5))" : ""}` }}
          >
            <svg viewBox="0 0 32 32" className="w-full h-full">
              <defs>
                <linearGradient id={`heart-${level}`} x1="0" y1="0" x2="1" y2="1">
                  {heartGradient.match(/#[a-f0-9]+/gi)?.map((c, i, arr) => (
                    <stop key={i} offset={`${(i / (arr.length - 1)) * 100}%`} stopColor={c} />
                  ))}
                </linearGradient>
              </defs>
              <path
                d="M16 28 C8 22, 2 16, 2 10 C2 6, 6 2, 10 2 C13 2, 15 4, 16 6 C17 4, 19 2, 22 2 C26 2, 30 6, 30 10 C30 16, 24 22, 16 28 Z"
                fill={`url(#heart-${level})`}
                stroke="hsl(330 90% 50%)"
                strokeWidth="0.5"
              />
              {/* Inner crystal shine (Lv 4+) */}
              {showCrystal && (
                <>
                  <path d="M11 8 L16 12 L13 18 Z" fill="rgba(255,255,255,0.55)" />
                  <path d="M19 9 L22 14 L18 13 Z" fill="rgba(255,255,255,0.35)" />
                </>
              )}
            </svg>
          </motion.div>

          {/* Floating hearts (Lv 2+) */}
          {showFloatingHearts && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute text-pink-400 pointer-events-none"
                  style={{ fontSize: "10px" }}
                  initial={{ y: 0, x: 0, opacity: 0 }}
                  animate={{ y: -25 - i * 4, x: i % 2 === 0 ? 8 : -8, opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }}
                >
                  💕
                </motion.div>
              ))}
            </>
          )}

          {/* Sparkles (Lv 6+) */}
          {showSparkles && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={`s-${i}`}
                  className="absolute pointer-events-none text-yellow-200"
                  style={{ fontSize: "8px" }}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * Math.PI) / 2) * 18,
                    y: Math.sin((i * Math.PI) / 2) * 18,
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                >
                  ✦
                </motion.div>
              ))}
            </>
          )}

          {/* Crown (Lv 10) */}
          {showCrown && (
            <motion.div
              animate={{ y: [-1, 1, -1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
            >
              <Crown className="w-4 h-4 text-yellow-400" style={{ filter: "drop-shadow(0 0 6px gold)" }} />
            </motion.div>
          )}
        </div>

        {/* Avatar 2 */}
        <div className={`${dims.avatar} rounded-full overflow-hidden ring-2 ring-pink-400/70 shadow-[0_0_12px_hsl(330_90%_60%/0.5)]`}>
          <img loading="lazy" decoding="async" src={user2Avatar || "https://i.pravatar.cc/100?img=5"} alt="" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Points */}
      <p className={`${dims.points} font-black text-pink-400`} style={{ textShadow: "0 0 6px hsl(330 90% 60%)" }}>
        {points.toLocaleString()} 💖
      </p>

      {/* Label */}
      <p className={`${dims.text} font-bold text-pink-300`}>
        حبيبين · Lv.{level}
      </p>
    </div>
  );
};

export default LoveBadge;
