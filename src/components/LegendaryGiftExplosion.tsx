import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface MegaGift {
  id: string;
  senderName: string;
  receiverName: string;
  giftName: string;
  giftEmoji: string;
  imageUrl?: string | null;
  amount: number;
}

// Listens to LEGENDARY gifts (>= 100K gold) and renders a full-screen cinematic explosion.
// This sits above everything and is visible app-wide.
export default function LegendaryGiftExplosion() {
  const [active, setActive] = useState<MegaGift | null>(null);

  useEffect(() => {
    const channel = supabase.channel("legendary-gifts");
    channel
      .on("broadcast", { event: "legendary-gift" }, ({ payload }) => {
        setActive({
          id: `${Date.now()}`,
          senderName: payload.senderName || "مستخدم",
          receiverName: payload.receiverName || "مستخدم",
          giftName: payload.giftName || "هدية",
          giftEmoji: payload.giftEmoji || "🎁",
          imageUrl: payload.imageUrl || null,
          amount: payload.amount || 0,
        });
        setTimeout(() => setActive(null), 7500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-accent/30 via-primary/20 to-transparent"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 2, 1.5] }}
            transition={{ duration: 1.2 }}
          />

          {/* Sparkle particles */}
          {[...Array(40)].map((_, i) => (
            <motion.span
              key={i}
              className="absolute text-2xl"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: (Math.random() - 0.5) * 600,
                y: (Math.random() - 0.5) * 600,
                opacity: [0, 1, 0],
                scale: [0, 1.3, 0],
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 2.5, delay: Math.random() * 1, ease: "easeOut" }}
            >
              {["✨", "💫", "⭐", "💎", "👑"][i % 5]}
            </motion.span>
          ))}

          {/* Center gift */}
          <div className="relative flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: [0, 1.5, 1.2, 1.4], rotate: [180, 0, -10, 10, 0] }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="relative"
            >
              {active.imageUrl ? (
                <img
                  src={active.imageUrl}
                  alt={active.giftName}
                  className="w-48 h-48 object-contain drop-shadow-[0_0_60px_hsl(45_100%_55%/0.9)]"
                />
              ) : (
                <span className="text-[10rem] drop-shadow-[0_0_60px_hsl(45_100%_55%/0.9)]">
                  {active.giftEmoji}
                </span>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center px-6 py-3 rounded-2xl bg-background/70 backdrop-blur-xl border border-accent/60 shadow-[0_0_40px_hsl(45_100%_55%/0.6)]"
            >
              <p className="text-xs text-foreground/70 mb-1">🌟 هدية أسطورية 🌟</p>
              <p className="text-base font-black text-foreground">
                <span className="text-accent">{active.senderName}</span>
                <span className="text-foreground/60 mx-1">أهدى</span>
                <span className="text-primary">{active.receiverName}</span>
              </p>
              <p className="text-2xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent mt-1">
                {active.giftName} × {active.amount.toLocaleString()}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
