import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface BigGift {
  id: string;
  senderName: string;
  receiverName: string;
  giftName: string;
  giftEmoji: string;
  imageUrl?: string | null;
  amount: number;
}

// Listens to global big-gift broadcast (gifts >= 10K gold sent anywhere) and shows
// a floating ticker banner across the top of the app — Yalla Ludo / Soulmatch style.
export default function GlobalGiftTicker() {
  const [queue, setQueue] = useState<BigGift[]>([]);

  useEffect(() => {
    const channel = supabase.channel("global-big-gifts");
    channel
      .on("broadcast", { event: "global-big-gift" }, ({ payload }) => {
        const gift: BigGift = {
          id: `${Date.now()}-${Math.random()}`,
          senderName: payload.senderName || "مستخدم",
          receiverName: payload.receiverName || "مستخدم",
          giftName: payload.giftName || "هدية",
          giftEmoji: payload.giftEmoji || "🎁",
          imageUrl: payload.imageUrl || null,
          amount: payload.amount || 0,
        };
        setQueue((q) => [...q, gift]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-dismiss the front of the queue after 6s
  useEffect(() => {
    if (queue.length === 0) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [queue]);

  const current = queue[0];

  return (
    <div className="fixed top-2 left-0 right-0 z-[80] flex justify-center pointer-events-none px-2">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-full overflow-hidden border border-accent/60 bg-gradient-to-r from-amber-500/30 via-yellow-300/30 to-amber-500/30 backdrop-blur-xl shadow-[0_0_24px_hsl(45_100%_55%/0.6)] max-w-[95vw]"
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/40 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative text-xs">👑</span>
            <span className="relative text-[11px] font-black text-foreground truncate max-w-[80px]">{current.senderName}</span>
            <span className="relative text-[10px] text-foreground/70">أهدى</span>
            {current.imageUrl ? (
              <img loading="lazy" decoding="async" src={current.imageUrl} alt="" className="relative w-5 h-5 object-contain" />
            ) : (
              <span className="relative text-base">{current.giftEmoji}</span>
            )}
            <span className="relative text-[11px] font-black text-foreground truncate max-w-[80px]">{current.receiverName}</span>
            <span className="relative text-[10px] font-black text-accent">×{current.amount.toLocaleString()}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
