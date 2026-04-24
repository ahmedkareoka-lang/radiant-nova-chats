import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";

type Props = { size?: "sm" | "md" };

/**
 * BD (Business Developer) badge — fiery orange with strong radiant glow.
 * Visible on profiles so everyone knows the user is a BD.
 */
const BDBadge = ({ size = "sm" }: Props) => {
  const px = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";
  const iconSize = size === "md" ? 12 : 10;

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: [1, 1.07, 1], opacity: 1 }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={`relative overflow-hidden rounded-full ${px} font-black flex items-center gap-1
        bg-gradient-to-r from-orange-600 via-orange-400 to-amber-400
        border border-amber-200/90 text-white
        shadow-[0_0_16px_hsl(25_100%_55%/0.85),0_0_32px_hsl(35_100%_60%/0.55),0_0_48px_hsl(20_100%_50%/0.35)]`}
    >
      {/* radiant sweep */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-yellow-100/70 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
      {/* Fiery pulsing aura */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full"
        animate={{
          boxShadow: [
            "0 0 12px hsl(25 100% 55% / 0.8), 0 0 24px hsl(35 100% 60% / 0.5)",
            "0 0 24px hsl(20 100% 60% / 1), 0 0 48px hsl(30 100% 55% / 0.75)",
            "0 0 12px hsl(25 100% 55% / 0.8), 0 0 24px hsl(35 100% 60% / 0.5)",
          ],
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <Briefcase size={iconSize} className="relative drop-shadow-[0_0_4px_hsl(45_100%_70%)]" />
      <span className="relative tracking-wider">BD</span>
    </motion.div>
  );
};

export default BDBadge;
