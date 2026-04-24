import { motion } from "framer-motion";

type Props = {
  size: number;
  children: React.ReactNode;
};

/**
 * Pure-CSS frame ring for BD (Business Developer) accounts.
 * - Strong fiery orange radiant glow + rotating conic ring
 * - Bottom label "BD" baked into the frame
 */
const BDFrame = ({ size, children }: Props) => {
  const padding = Math.max(4, Math.round(size * 0.05));
  const labelFont = Math.max(9, Math.round(size * 0.1));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Rotating conic radiant ring */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(20 100% 55%), hsl(35 100% 60%), hsl(45 100% 70%), hsl(25 100% 55%), hsl(15 100% 50%), hsl(20 100% 55%))",
          filter: "blur(2px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
      {/* Pulsing fiery aura */}
      <motion.div
        aria-hidden
        className="absolute -inset-1.5 rounded-full pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 18px hsl(25 100% 55% / 0.85), 0 0 36px hsl(35 100% 60% / 0.55), 0 0 60px hsl(20 100% 50% / 0.3)",
            "0 0 28px hsl(20 100% 60% / 1), 0 0 56px hsl(30 100% 55% / 0.8), 0 0 92px hsl(15 100% 50% / 0.5)",
            "0 0 18px hsl(25 100% 55% / 0.85), 0 0 36px hsl(35 100% 60% / 0.55), 0 0 60px hsl(20 100% 50% / 0.3)",
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner mask */}
      <div
        className="absolute rounded-full overflow-hidden bg-background"
        style={{ inset: padding }}
      >
        {children}
      </div>

      {/* Bottom BD label */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-2.5 py-0.5 rounded-full font-black text-white whitespace-nowrap tracking-wider
                   bg-gradient-to-r from-orange-600 via-orange-400 to-amber-400
                   border border-amber-100/90 shadow-[0_0_12px_hsl(25_100%_55%/0.95)]"
        style={{ fontSize: labelFont, lineHeight: 1 }}
      >
        BD
      </div>
    </div>
  );
};

export default BDFrame;
