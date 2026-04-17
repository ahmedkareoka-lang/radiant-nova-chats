import { motion } from "framer-motion";
import { getNovaAsset } from "@/lib/novaAssets";

interface DualBadgeProps {
  novaLevel: number;
  vipLevel: number;
  size?: "sm" | "md";
}

export default function DualBadge({ novaLevel, vipLevel, size = "sm" }: DualBadgeProps) {
  const nova = getNovaAsset(novaLevel);
  const px = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[9px]";

  if (novaLevel <= 0 && vipLevel <= 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {novaLevel > 0 && nova && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative rounded-full ${px} font-black bg-gradient-to-r ${nova.gradient} border border-white/30 backdrop-blur ${nova.borderGlow} flex items-center gap-1`}
        >
          <span className="text-[10px]">👑</span>
          <span>NOVA {nova.label}</span>
        </motion.div>
      )}
      {vipLevel > 0 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`rounded-full ${px} font-black bg-gradient-to-r from-amber-500/40 to-yellow-300/40 border border-amber-300/40 backdrop-blur shadow-[0_0_15px_hsl(45_95%_55%/0.5)] flex items-center gap-1`}
        >
          <span className="text-[10px]">💎</span>
          <span>VIP {vipLevel}</span>
        </motion.div>
      )}
    </div>
  );
}
