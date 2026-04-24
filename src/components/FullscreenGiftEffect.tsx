import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playTieredGiftSound } from "@/lib/effects";

interface GiftPayload {
  id: string;
  emoji: string;
  giftName: string;
  imageUrl: string | null;
  senderName: string;
  recipientName: string;
  amount: number;
  timestamp: number;
}

interface FullscreenGiftEffectProps {
  gift: GiftPayload | null;
  onComplete: () => void;
  muted?: boolean;
}

/**
 * Duration tiers based on gift gold amount.
 * Tuned shorter than before so normal gifts feel snappy (Yalla / BIGO style)
 * while big / legendary gifts still get a long cinematic moment.
 */
const getDuration = (amount: number) => {
  if (amount >= 100000) return 12000; // أسطوري
  if (amount >= 10000) return 8000;   // ملحمي
  if (amount >= 1000) return 5000;    // نادر
  return 3500;                         // عادي — يختفي بسرعة ويعود الغرفة طبيعية
};

const PARTICLE_COLORS = ["#FFD700", "#FF6B6B", "#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];

const FullscreenGiftEffect = ({ gift, onComplete, muted }: FullscreenGiftEffectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gift) return;
    const duration = getDuration(gift.amount);

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

  const isLegendary = (gift?.amount ?? 0) >= 10000;
  const isMega = (gift?.amount ?? 0) >= 100000;

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key={gift.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none overflow-hidden"
        >
          {/* Dark backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-radial from-black/60 via-black/75 to-black/90"
            style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.95) 100%)" }}
          />

          {/* Massive radial glow behind gift */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1.2], opacity: [0, 0.9, 0.6] }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute rounded-full"
            style={{
              width: "120vw",
              height: "120vw",
              maxWidth: "1200px",
              maxHeight: "1200px",
              background: isLegendary
                ? "radial-gradient(circle, rgba(255,215,0,0.55), rgba(255,107,107,0.25), rgba(168,85,247,0.15), transparent 70%)"
                : "radial-gradient(circle, rgba(168,85,247,0.45), rgba(59,130,246,0.2), transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          {/* Spinning ring for legendary */}
          {isLegendary && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute rounded-full border-2 border-dashed border-yellow-400/40"
              style={{ width: "85vw", height: "85vw", maxWidth: "600px", maxHeight: "600px" }}
            />
          )}

          {/* MAIN GIFT — truly fills the screen */}
          <div className="relative z-10 flex flex-col items-center gap-3 px-4 w-full">
            <motion.div
              initial={{ scale: 0.2, rotate: -15, opacity: 0 }}
              animate={{ scale: [0.2, 1.15, 1], rotate: [0, 5, 0], opacity: 1 }}
              transition={{ duration: 0.8, type: "spring", damping: 14, stiffness: 100 }}
              className="relative flex items-center justify-center"
              style={{ width: "min(85vw, 480px)", height: "min(85vw, 480px)" }}
            >
              {/* Pulsing aura behind */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(255,200,80,0.5), transparent 65%)",
                  filter: "blur(40px)",
                }}
              />

              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.giftName}
                  className="relative w-full h-full object-contain drop-shadow-[0_0_60px_rgba(255,200,80,0.9)]"
                  style={{ background: "transparent" }}
                />
              ) : (
                <span
                  className="relative drop-shadow-[0_0_50px_rgba(255,200,80,0.8)]"
                  style={{ fontSize: "min(60vw, 360px)", lineHeight: 1 }}
                >
                  {gift.emoji}
                </span>
              )}
            </motion.div>

            {/* Gift name */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl sm:text-3xl font-black text-foreground glow-neon-text text-center"
            >
              {gift.giftName}
            </motion.p>

            {/* Sender → Receiver */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex items-center gap-3 text-base sm:text-lg"
            >
              <span className="text-primary font-bold drop-shadow-md">{gift.senderName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-accent font-bold drop-shadow-md">{gift.recipientName}</span>
            </motion.div>

            {/* Amount badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7, type: "spring" }}
              className="px-5 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-black text-base sm:text-lg shadow-[0_0_30px_rgba(255,200,0,0.6)]"
            >
              💰 {gift.amount.toLocaleString()} Gold
            </motion.div>
          </div>

          {/* Particle explosion */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: isLegendary ? 50 : 25 }).map((_, i) => {
              const total = isLegendary ? 50 : 25;
              const angle = (i / total) * Math.PI * 2;
              const dist = 180 + Math.random() * 250;
              const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6 + Math.random() * 10,
                    height: 6 + Math.random() * 10,
                    background: color,
                    left: "50%",
                    top: "50%",
                    boxShadow: `0 0 12px ${color}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    opacity: [0, 1, 0],
                    scale: [0, 1.6, 0],
                  }}
                  transition={{ duration: 1.4, delay: 0.2 + i * 0.02, repeat: isMega ? 2 : 1, repeatDelay: 0.4 }}
                />
              );
            })}
          </div>

          {/* Rising sparkles */}
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
              style={{
                left: `${5 + Math.random() * 90}%`,
                bottom: 0,
                boxShadow: "0 0 8px rgba(255,220,100,0.9)",
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -window.innerHeight, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.5 + Math.random() * 2, delay: Math.random() * 1.5, repeat: Infinity }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenGiftEffect;
