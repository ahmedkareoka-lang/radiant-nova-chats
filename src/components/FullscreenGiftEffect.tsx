import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playTieredGiftSound } from "@/lib/effects";
import GiftMediaPlayer from "@/components/GiftMediaPlayer";

interface GiftPayload {
  id: string;
  emoji: string;
  giftName: string;
  imageUrl: string | null;
  lottieUrl?: string | null;
  videoUrl?: string | null;
  senderName: string;
  recipientName: string;
  amount: number;
  timestamp: number;
  durationMs?: number;
}

interface FullscreenGiftEffectProps {
  gift: GiftPayload | null;
  onComplete: () => void;
  muted?: boolean;
}

/**
 * Duration tiers based on gift gold amount (used as fallback when no explicit durationMs).
 */
const getDuration = (amount: number, explicit?: number) => {
  if (explicit && explicit > 0) return explicit;
  if (amount >= 100000) return 12000; // أسطوري
  if (amount >= 10000) return 8000;   // ملحمي
  if (amount >= 1000) return 5000;    // نادر
  return 3500;                         // عادي
};

const FullscreenGiftEffect = ({ gift, onComplete, muted }: FullscreenGiftEffectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gift) return;
    const duration = getDuration(gift.amount, gift.durationMs);

    if (!muted) {
      // Audio starts at the same instant the animation mounts.
      playTieredGiftSound(gift.amount);
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onComplete, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gift, muted, onComplete]);

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key={gift.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none overflow-hidden bg-transparent"
        >
          {/* MAIN GIFT — only the gift shape, fills screen */}
          <div className="relative z-10 flex flex-col items-center gap-2 px-4 w-full">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.45, type: "spring", damping: 16, stiffness: 140 }}
              className="relative flex items-center justify-center"
              style={{ width: "min(85vw, 520px)", height: "min(85vw, 520px)" }}
            >
              <GiftMediaPlayer
                lottieUrl={gift.lottieUrl}
                videoUrl={gift.videoUrl}
                imageUrl={gift.imageUrl}
                emoji={gift.emoji}
              />
            </motion.div>

            {/* Sender → Receiver (small, no background) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 text-sm sm:text-base"
            >
              <span className="text-primary font-bold drop-shadow-md">{gift.senderName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-accent font-bold drop-shadow-md">{gift.recipientName}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenGiftEffect;
