import { motion } from "framer-motion";
import rechargeAgentFrameImg from "@/assets/recharge-agent-frame.png";

type Props = {
  /** Outer size in px (matches FramedAvatar resolved size). */
  size: number;
  children: React.ReactNode;
};

/**
 * Recharge Agent frame.
 * Uses a custom golden crown PNG overlay with the "وكيل شحن" label baked in.
 * Adds layered animations:
 *  - Gentle scale pulse on the whole frame (heartbeat)
 *  - Rotating golden glow halo behind the frame
 *  - Pulsing fiery drop-shadow on the frame itself
 *  - Subtle shimmer sweep across the avatar window
 */
const RechargeAgentFrame = ({ size, children }: Props) => {
  // Inner avatar window — the transparent oval in the middle of the crown art
  // sits slightly above center because the "وكيل شحن" label takes the bottom.
  const innerScale = 0.55;
  const innerOffsetY = -0.06;
  const innerSize = Math.round(size * innerScale);
  const offsetPx = Math.round(size * innerOffsetY);

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Rotating golden halo behind everything */}
      <motion.div
        aria-hidden
        className="absolute -inset-2 rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(45 100% 60% / 0.55), hsl(30 100% 55% / 0.25), hsl(15 100% 55% / 0.55), hsl(50 100% 65% / 0.25), hsl(45 100% 60% / 0.55))",
          filter: "blur(10px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />

      {/* Pulsing fiery glow ring */}
      <motion.div
        aria-hidden
        className="absolute -inset-1 rounded-full pointer-events-none"
        animate={{
          boxShadow: [
            "0 0 12px hsl(45 100% 60% / 0.7), 0 0 24px hsl(30 100% 55% / 0.45)",
            "0 0 24px hsl(45 100% 65% / 1), 0 0 48px hsl(20 100% 55% / 0.7), 0 0 64px hsl(0 100% 50% / 0.4)",
            "0 0 12px hsl(45 100% 60% / 0.7), 0 0 24px hsl(30 100% 55% / 0.45)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Avatar (untouched) sits inside the transparent center of the frame */}
      <div
        className="absolute left-1/2 rounded-full overflow-hidden bg-background"
        style={{
          width: innerSize,
          height: innerSize,
          top: `calc(50% + ${offsetPx}px)`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {children}
        {/* Shimmer sweep over avatar */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(115deg, transparent 35%, hsl(45 100% 85% / 0.45) 50%, transparent 65%)",
          }}
          animate={{ x: ["-120%", "120%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
        />
      </div>

      {/* Animated golden crown frame on top */}
      <motion.img
        src={rechargeAgentFrameImg}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10"
        animate={{
          filter: [
            "drop-shadow(0 0 4px hsl(45 100% 55% / 0.85)) brightness(1.02) saturate(1.1)",
            "drop-shadow(0 0 10px hsl(45 100% 65% / 1)) drop-shadow(0 0 18px hsl(20 100% 55% / 0.7)) brightness(1.18) saturate(1.3)",
            "drop-shadow(0 0 4px hsl(45 100% 55% / 0.85)) brightness(1.02) saturate(1.1)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
};

export default RechargeAgentFrame;
