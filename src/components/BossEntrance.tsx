import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface BossEntranceProps {
  show: boolean;
  onComplete: () => void;
}

const BossEntrance = ({ show, onComplete }: BossEntranceProps) => {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onComplete, 4000);
      return () => clearTimeout(t);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "rgba(0,0,0,0.97)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Lightning bolts background */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: 2,
                height: "40%",
                background: "linear-gradient(to bottom, transparent, hsl(45 100% 55%), transparent)",
                top: "10%",
                left: `${15 + i * 14}%`,
                transformOrigin: "top",
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{
                opacity: [0, 1, 0.3, 1, 0],
                scaleY: [0, 1, 0.8, 1, 0],
                rotate: [(i % 2 === 0 ? -5 : 5), 0],
              }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1, repeat: 3 }}
            />
          ))}

          {/* Screen shake container */}
          <motion.div
            className="flex flex-col items-center"
            animate={{
              x: [0, 6, -6, 4, -4, 0],
              y: [0, -4, 4, -3, 3, 0],
            }}
            transition={{ duration: 0.15, repeat: 20 }}
          >
            {/* Gold pulse rings */}
            {[1, 2, 3].map((ring) => (
              <motion.div
                key={ring}
                className="absolute rounded-full border-2"
                style={{ borderColor: "hsl(45 100% 55% / 0.4)" }}
                initial={{ width: 50, height: 50, opacity: 0 }}
                animate={{
                  width: [50, 300 + ring * 40],
                  height: [50, 300 + ring * 40],
                  opacity: [0.8, 0],
                }}
                transition={{ duration: 1.5, delay: ring * 0.3, repeat: 2 }}
              />
            ))}

            {/* Gold pulse glow */}
            <motion.div
              className="absolute w-72 h-72 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(45 100% 55% / 0.6) 0%, hsl(45 100% 40% / 0.2) 40%, transparent 70%)" }}
              animate={{ scale: [1, 2.5, 1], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />

            {/* Crown emoji */}
            <motion.div
              className="text-5xl mb-4 z-10"
              initial={{ y: -60, opacity: 0, rotate: -20 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 8, delay: 0.3 }}
            >
              👑
            </motion.div>

            {/* THE BOSS text */}
            <motion.h1
              className="text-7xl font-black relative z-10 tracking-wider"
              style={{
                background: "linear-gradient(180deg, #ffd700, #d4af37, #ffd700, #b8860b)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 60px rgba(255,215,0,0.9)) drop-shadow(0 0 120px rgba(255,215,0,0.4))",
                textShadow: "0 0 80px rgba(255,215,0,0.8)",
              }}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: [0, 1.3, 1], rotate: [10, -5, 0] }}
              transition={{ type: "spring", damping: 6, delay: 0.5 }}
            >
              THE BOSS
            </motion.h1>

            {/* Has entered subtitle */}
            <motion.p
              className="text-lg font-bold mt-4 tracking-[0.3em] uppercase z-10"
              style={{ color: "hsl(45 100% 70%)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 0.8, 1] }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              دخل الغرفة
            </motion.p>

            <motion.p
              className="text-sm font-bold mt-2 tracking-widest z-10"
              style={{ color: "hsl(45 100% 55%)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.6, 1] }}
              transition={{ delay: 1.5, duration: 1 }}
            >
              ⚡ GOD MODE ACTIVATED ⚡
            </motion.p>

            {/* Particle sparkles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`spark-${i}`}
                className="absolute w-1.5 h-1.5 rounded-full z-10"
                style={{ background: "hsl(45 100% 70%)" }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: [0, (Math.random() - 0.5) * 300],
                  y: [0, (Math.random() - 0.5) * 300],
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: 0.5 + i * 0.1,
                  repeat: 2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BossEntrance;
