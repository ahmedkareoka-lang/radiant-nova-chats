import { motion } from "framer-motion";
import { getNovaAsset } from "@/lib/novaAssets";

interface DualBadgeProps {
  novaLevel: number;
  vipLevel: number;
  size?: "sm" | "md" | "lg";
  luxury?: boolean; // luxury mode adds extra glow + animated shimmer for premium look
}

export default function DualBadge({ novaLevel, vipLevel, size = "sm", luxury = false }: DualBadgeProps) {
  const nova = getNovaAsset(novaLevel);
  const isHighNova = novaLevel >= 4;
  const isHighVip = vipLevel >= 5;
  const auto = luxury || isHighNova || isHighVip;

  const px =
    size === "lg"
      ? "px-3 py-1.5 text-xs"
      : size === "md"
      ? "px-2.5 py-1 text-[11px]"
      : "px-2 py-0.5 text-[9px]";

  if (novaLevel <= 0 && vipLevel <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {novaLevel > 0 && nova && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={
            auto
              ? { scale: [1, 1.05, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            auto
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.3 }
          }
          className={`relative overflow-hidden rounded-full ${px} font-black bg-gradient-to-r ${nova.gradient} border ${
            auto ? "border-white/60" : "border-white/30"
          } backdrop-blur ${nova.borderGlow} flex items-center gap-1`}
        >
          {auto && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
          )}
          <span className="relative text-[10px]">👑</span>
          <span className="relative">NOVA {nova.label}</span>
        </motion.div>
      )}
      {vipLevel > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={
            auto
              ? { scale: [1, 1.05, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            auto
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
              : { duration: 0.3 }
          }
          className={`relative overflow-hidden rounded-full ${px} font-black bg-gradient-to-r from-amber-500/40 to-yellow-300/40 border ${
            auto ? "border-amber-200/80" : "border-amber-300/40"
          } backdrop-blur shadow-[0_0_15px_hsl(45_95%_55%/0.5)] flex items-center gap-1`}
        >
          {auto && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear", delay: 0.6 }}
            />
          )}
          <span className="relative text-[10px]">💎</span>
          <span className="relative">VIP {vipLevel}</span>
        </motion.div>
      )}
    </div>
  );
}
