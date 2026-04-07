import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import novaLogo from "@/assets/nova-logo.png";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 800);
    const t2 = setTimeout(() => setPhase("exit"), 2400);
    const t3 = setTimeout(onFinish, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase !== "exit" && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Lightning background particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-px bg-gradient-to-b from-transparent via-accent to-transparent"
                style={{
                  left: `${15 + i * 15}%`,
                  height: "100%",
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scaleY: [0, 1, 0],
                }}
                transition={{
                  duration: 0.4,
                  delay: 0.3 + i * 0.1,
                  repeat: 2,
                  repeatDelay: 0.5,
                }}
              />
            ))}
          </div>

          {/* Radial glow */}
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--accent) / 0.3) 0%, transparent 70%)",
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* Logo */}
          <motion.img
            src={novaLogo}
            alt="NOVA"
            className="w-64 h-auto relative z-10 drop-shadow-2xl"
            initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Tagline */}
          <AnimatePresence>
            {phase === "text" && (
              <motion.p
                className="mt-4 text-sm font-bold tracking-[0.3em] uppercase glow-gold-text text-accent relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                Sound Empire
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
