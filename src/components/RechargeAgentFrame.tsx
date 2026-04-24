import { motion } from "framer-motion";

type Props = {
  /** Outer size in px (matches FramedAvatar resolved size). */
  size: number;
  children: React.ReactNode;
};

/**
 * Pure-CSS frame ring for recharge agents.
 * - Pulsing red/orange glow + rotating conic ring (magical light + flame)
 * - Bottom label "وكيل شحن" baked into the frame
 * The avatar (passed as children) sits naturally inside the ring.
 */
const RechargeAgentFrame = ({ size, children }: Props) => {
  const padding = Math.max(4, Math.round(size * 0.05));
  const labelFont = Math.max(8, Math.round(size * 0.085));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Rotating conic magical ring */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(0 95% 55%), hsl(30 100% 60%), hsl(45 100% 65%), hsl(15 95% 55%), hsl(0 95% 55%))",
          filter: "blur(2px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      {/* Pulsing outer flame glow */}
      <motion.div
        aria-hidden
        className="absolute -inset-1 rounded-full pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 14px hsl(0 95% 55% / 0.7), 0 0 28px hsl(20 95% 55% / 0.5)",
            "0 0 22px hsl(15 100% 60% / 0.95), 0 0 42px hsl(0 95% 50% / 0.65)",
            "0 0 14px hsl(0 95% 55% / 0.7), 0 0 28px hsl(20 95% 55% / 0.5)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner mask so the avatar shows cleanly */}
      <div
        className="absolute rounded-full overflow-hidden bg-background"
        style={{ inset: padding }}
      >
        {children}
      </div>

      {/* Bottom label "وكيل شحن" */}
      <div
        className="absolute left-1/2 -translate-x-1/2 -bottom-1 px-2 py-0.5 rounded-full font-black text-white whitespace-nowrap
                   bg-gradient-to-r from-red-700 via-red-500 to-orange-500
                   border border-yellow-200/80 shadow-[0_0_10px_hsl(0_95%_55%/0.8)]"
        style={{ fontSize: labelFont, lineHeight: 1 }}
      >
        وكيل شحن
      </div>
    </div>
  );
};

export default RechargeAgentFrame;
