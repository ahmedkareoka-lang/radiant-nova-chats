import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface BossEntranceProps {
  show: boolean;
  onComplete: () => void;
}

const BossEntrance = ({ show, onComplete }: BossEntranceProps) => {
  useEffect(() => {
    if (show) {
      const t = setTimeout(onComplete, 3000);
      return () => clearTimeout(t);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "rgba(0,0,0,0.95)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Screen shake container */}
          <motion.div
            className="flex flex-col items-center"
            animate={{
              x: [0, 4, -4, 3, -3, 0],
              y: [0, -3, 3, -2, 2, 0],
            }}
            transition={{ duration: 0.15, repeat: 15 }}
          >
            {/* Gold pulse glow */}
            <motion.div
              className="absolute w-64 h-64 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(45 100% 55% / 0.5) 0%, transparent 70%)" }}
              animate={{ scale: [1, 2, 1], opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />

            {/* THE BOSS text */}
            <motion.h1
              className="text-6xl font-black relative z-10"
              style={{
                background: "linear-gradient(180deg, #fbbf24, #d4af37, #fbbf24)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 40px rgba(251,191,36,0.8))",
              }}
              animate={{ scale: [0.8, 1.15, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            >
              THE BOSS
            </motion.h1>

            <motion.p
              className="text-accent text-lg font-bold mt-3 tracking-widest glow-gold-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.7, 1] }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              ⚡ GOD MODE ACTIVATED ⚡
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BossEntrance;
