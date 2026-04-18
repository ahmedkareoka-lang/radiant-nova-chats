import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface EquippedBadgeProps {
  badgeName: string | null | undefined;
  size?: "sm" | "md";
}

// Resolves a badge name (stored on profile.equipped_badge) to its image_url from store_items / inventory
// and renders a luxury animated chip suitable to sit next to a display name.
export default function EquippedBadge({ badgeName, size = "sm" }: EquippedBadgeProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!badgeName) { setImageUrl(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("store_items")
        .select("image_url")
        .eq("name", badgeName)
        .eq("type", "badge")
        .maybeSingle();
      if (!cancelled) setImageUrl(data?.image_url || null);
    })();
    return () => { cancelled = true; };
  }, [badgeName]);

  if (!badgeName) return null;

  const px = size === "md" ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]";
  const imgSize = size === "md" ? "w-4 h-4" : "w-3 h-3";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [1, 1.05, 1], opacity: 1 }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      className={`relative overflow-hidden rounded-full ${px} font-black bg-gradient-to-r from-amber-500/40 to-yellow-300/40 border border-amber-200/80 backdrop-blur shadow-[0_0_12px_hsl(45_95%_55%/0.5)] flex items-center gap-1`}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
      {imageUrl ? (
        <img src={imageUrl} alt={badgeName} className={`relative ${imgSize} object-contain`} />
      ) : (
        <span className="relative">🏅</span>
      )}
      <span className="relative truncate max-w-[80px]">{badgeName}</span>
    </motion.div>
  );
}
