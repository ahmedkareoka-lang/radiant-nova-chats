import { motion } from "framer-motion";
import { LOVE_AURA_GRADIENTS } from "@/lib/loveLevels";

interface Props {
  level: number;
  size?: number; // px
}

const LoveAura = ({ level, size = 320 }: Props) => {
  const gradient = LOVE_AURA_GRADIENTS[level] ?? LOVE_AURA_GRADIENTS[1];
  const isLegendary = level >= 10;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size }}
    >
      {/* Main breathing aura */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: gradient, filter: "blur(20px)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Rotating conic ring for legendary */}
      {isLegendary && (
        <motion.div
          className="absolute inset-4 rounded-full opacity-80"
          style={{
            background: "conic-gradient(from 0deg, transparent, hsl(45 100% 60% / 0.8), transparent, hsl(330 100% 65% / 0.8), transparent)",
            filter: "blur(8px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      )}
      {/* Secondary fast pulse */}
      {level >= 6 && (
        <motion.div
          className="absolute inset-8 rounded-full"
          style={{ background: gradient, filter: "blur(30px)", opacity: 0.5 }}
          animate={{ scale: [0.9, 1.2, 0.9] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      )}
    </div>
  );
};

export default LoveAura;
