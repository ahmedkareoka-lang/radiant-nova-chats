import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import TierBadge from "./TierBadge";

interface LevelUpEventProps {
  show: boolean;
  type: "wealth" | "charm";
  newLevel: number;
  onClose: () => void;
}

export default function LevelUpEvent({ show, type, newLevel, onClose }: LevelUpEventProps) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [show, onClose]);

  const title = type === "wealth" ? "ارتقت ثروتك! 💰" : "ارتقت كاريزماك! ✨";
  const gradient =
    type === "wealth"
      ? "from-amber-500/40 via-orange-500/30 to-yellow-400/40"
      : "from-fuchsia-500/40 via-purple-500/30 to-pink-500/40";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-auto"
          onClick={onClose}
        >
          <div className={`absolute inset-0 backdrop-blur-md bg-gradient-to-br ${gradient}`} />
          {/* Radiating rays */}
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: 2,
                height: "60vh",
                background: type === "wealth"
                  ? "linear-gradient(to top, transparent, hsl(45 95% 60% / 0.7))"
                  : "linear-gradient(to top, transparent, hsl(300 90% 65% / 0.7))",
                transform: `translate(-50%, -100%) rotate(${(i / 16) * 360}deg)`,
              }}
              animate={{ scaleY: [0, 1, 0.6, 1], opacity: [0, 1, 0.5, 0] }}
              transition={{ duration: 4.5, ease: "easeOut" }}
            />
          ))}

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.3, 1], rotate: [0, 5, -3, 0] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative z-10 flex flex-col items-center gap-5 text-center px-6"
          >
            <motion.h1
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-4xl font-black glow-gold-text"
            >
              LEVEL UP!
            </motion.h1>
            <p className="text-xl font-black text-foreground">{title}</p>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ delay: 0.6, duration: 0.8, ease: "backOut" }}
            >
              <TierBadge level={newLevel} type={type} size="lg" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="text-base text-muted-foreground"
            >
              مستواك الجديد: <span className="font-black text-accent">{newLevel}</span>
            </motion.p>

            {/* Particles */}
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: type === "wealth" ? "hsl(45 95% 60%)" : "hsl(300 90% 65%)",
                  left: "50%",
                  top: "50%",
                }}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                  x: Math.cos((i / 24) * Math.PI * 2) * 200,
                  y: Math.sin((i / 24) * Math.PI * 2) * 200,
                  opacity: [0, 1, 0],
                }}
                transition={{ duration: 2, delay: 0.8 + i * 0.04, repeat: 1 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
