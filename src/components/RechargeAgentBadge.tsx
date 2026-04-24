import { motion } from "framer-motion";
import { Flame } from "lucide-react";

type Props = { size?: "sm" | "md" };

/**
 * Pure-CSS animated badge for "وكيل شحن" (Recharge Agent).
 * Red glow + magic light + fire — no image asset required.
 */
const RechargeAgentBadge = ({ size = "sm" }: Props) => {
  const px = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";
  const iconSize = size === "md" ? 12 : 10;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: [1, 1.06, 1], opacity: 1 }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={`relative overflow-hidden rounded-full ${px} font-black flex items-center gap-1
        bg-gradient-to-r from-red-700/80 via-red-500/80 to-orange-500/80
        border border-red-300/80 text-white
        shadow-[0_0_14px_hsl(0_85%_55%/0.7),0_0_28px_hsl(15_90%_55%/0.4)]`}
    >
      {/* magical sweep */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />
      {/* flickering fire glow */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-0.5 rounded-full"
        animate={{
          boxShadow: [
            "0 0 10px hsl(0 90% 55% / 0.7), 0 0 20px hsl(20 95% 55% / 0.4)",
            "0 0 18px hsl(15 95% 60% / 0.9), 0 0 32px hsl(0 95% 50% / 0.55)",
            "0 0 10px hsl(0 90% 55% / 0.7), 0 0 20px hsl(20 95% 55% / 0.4)",
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <Flame size={iconSize} className="relative drop-shadow-[0_0_4px_hsl(45_100%_60%)]" />
      <span className="relative truncate">وكيل شحن</span>
    </motion.div>
  );
};

export default RechargeAgentBadge;
