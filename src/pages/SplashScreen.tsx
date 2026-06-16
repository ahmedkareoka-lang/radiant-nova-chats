import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import novaLogo from "@/assets/nova-logo.png";

interface SplashScreenProps {
  onFinish: () => void;
}

/**
 * Cinematic splash:
 *  - Phase 0 (0-300ms): black void + radial flash + spinning orbital rings forming.
 *  - Phase 1 (300-1100ms): logo "supernova" reveal (scale+rotate from 0, bright flash, shockwave ring).
 *  - Phase 2 (1100-2600ms): logo settles, tagline lightning-strikes in, looping flares + sparks orbit.
 *  - Phase 3 (>2600ms): white flash transition, then unmount.
 */
const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 280),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(onFinish, 3100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(260 60% 12%) 0%, hsl(260 80% 6%) 50%, hsl(0 0% 0%) 100%)",
          }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* === Starfield === */}
          <div className="absolute inset-0">
            {[...Array(60)].map((_, i) => {
              const seed = (i * 9301 + 49297) % 233280;
              const x = (seed % 100);
              const y = ((seed * 1.7) % 100);
              const size = 1 + ((i * 13) % 3);
              const delay = (i % 10) * 0.12;
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    filter: "blur(0.4px)",
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0.4, 1],
                    scale: [0, 1.2, 1, 1.3],
                  }}
                  transition={{
                    duration: 2.4,
                    delay,
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              );
            })}
          </div>

          {/* === Shockwave rings (phase 1) === */}
          <AnimatePresence>
            {phase >= 1 &&
              [0, 0.18, 0.36].map((d, i) => (
                <motion.div
                  key={`shock-${i}`}
                  className="absolute rounded-full border-2"
                  style={{
                    borderColor: "hsl(280 100% 70%)",
                    boxShadow:
                      "0 0 60px hsl(280 100% 70% / 0.7), inset 0 0 40px hsl(200 100% 70% / 0.4)",
                  }}
                  initial={{ width: 40, height: 40, opacity: 0.9 }}
                  animate={{
                    width: ["40px", "1600px"],
                    height: ["40px", "1600px"],
                    opacity: [0.9, 0],
                    borderWidth: ["3px", "0px"],
                  }}
                  transition={{ duration: 1.4, delay: d, ease: "easeOut" }}
                />
              ))}
          </AnimatePresence>

          {/* === Orbital rings around logo === */}
          <AnimatePresence>
            {phase >= 1 && (
              <>
                {[140, 200, 280].map((r, i) => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute rounded-full border"
                    style={{
                      width: r * 2,
                      height: r * 2,
                      borderColor:
                        i === 0
                          ? "hsl(280 100% 70% / 0.6)"
                          : i === 1
                          ? "hsl(200 100% 70% / 0.45)"
                          : "hsl(45 100% 70% / 0.35)",
                      borderStyle: i === 2 ? "dashed" : "solid",
                    }}
                    initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      rotate: i % 2 === 0 ? 360 : -360,
                    }}
                    transition={{
                      opacity: { duration: 0.6 },
                      scale: { duration: 0.8, ease: "easeOut" },
                      rotate: {
                        duration: 18 + i * 6,
                        repeat: Infinity,
                        ease: "linear",
                      },
                    }}
                  >
                    {/* orbital spark */}
                    <span
                      className="absolute rounded-full"
                      style={{
                        left: "50%",
                        top: -4,
                        width: 8,
                        height: 8,
                        background:
                          i === 0
                            ? "hsl(280 100% 80%)"
                            : i === 1
                            ? "hsl(200 100% 80%)"
                            : "hsl(45 100% 70%)",
                        boxShadow: "0 0 16px currentColor",
                        transform: "translateX(-50%)",
                      }}
                    />
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* === Radial flash burst === */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 600,
              height: 600,
              background:
                "radial-gradient(circle, hsl(280 100% 75% / 0.85) 0%, hsl(200 100% 60% / 0.4) 35%, transparent 65%)",
              filter: "blur(8px)",
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: phase >= 1 ? [0, 2.4, 1.1] : 0,
              opacity: phase >= 1 ? [0, 1, 0.55] : 0,
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />

          {/* === Lightning streaks === */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`bolt-${i}`}
                className="absolute w-px"
                style={{
                  left: `${10 + i * 11}%`,
                  height: "100%",
                  background:
                    "linear-gradient(to bottom, transparent, hsl(45 100% 75%) 45%, hsl(280 100% 80%) 55%, transparent)",
                  boxShadow:
                    "0 0 14px hsl(45 100% 70%), 0 0 28px hsl(280 100% 70%)",
                }}
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{
                  opacity: phase >= 1 ? [0, 1, 0] : 0,
                  scaleY: phase >= 1 ? [0, 1, 0] : 0,
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.25 + i * 0.07,
                  repeat: phase >= 2 ? 1 : 0,
                  repeatDelay: 1.4,
                }}
              />
            ))}
          </div>

          {/* === Logo === */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{
              scale: phase >= 1 ? 1 : 0,
              opacity: phase >= 1 ? 1 : 0,
              rotate: phase >= 1 ? 0 : -180,
            }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 12,
              mass: 0.9,
            }}
          >
            {/* logo aura */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, hsl(280 100% 80% / 0.6), transparent 70%)",
                filter: "blur(20px)",
              }}
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={novaLogo}
              alt="NOVA"
              className="relative w-64 h-auto"
              style={{
                filter:
                  "drop-shadow(0 0 24px hsl(280 100% 70%)) drop-shadow(0 0 48px hsl(200 100% 60% / 0.7))",
              }}
              animate={{
                filter: [
                  "drop-shadow(0 0 24px hsl(280 100% 70%)) drop-shadow(0 0 48px hsl(200 100% 60% / 0.7))",
                  "drop-shadow(0 0 36px hsl(45 100% 70%)) drop-shadow(0 0 64px hsl(280 100% 70% / 0.9))",
                  "drop-shadow(0 0 24px hsl(280 100% 70%)) drop-shadow(0 0 48px hsl(200 100% 60% / 0.7))",
                ],
              }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* === Tagline === */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div
                className="mt-6 relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, y: 20, letterSpacing: "0.05em" }}
                animate={{ opacity: 1, y: 0, letterSpacing: "0.4em" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <motion.p
                  className="text-sm font-black tracking-[0.4em] uppercase"
                  style={{
                    background:
                      "linear-gradient(90deg, hsl(45 100% 70%), hsl(280 100% 80%), hsl(200 100% 75%), hsl(45 100% 70%))",
                    backgroundSize: "300% 100%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    filter: "drop-shadow(0 0 8px hsl(280 100% 70% / 0.7))",
                  }}
                  animate={{ backgroundPosition: ["0% 50%", "300% 50%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  Sound Empire
                </motion.p>
                <motion.div
                  className="mt-3 h-px w-32"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(280 100% 70%), transparent)",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* === Final white flash (phase 3 transition) === */}
          <AnimatePresence>
            {phase === 3 && (
              <motion.div
                className="absolute inset-0 bg-white pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
