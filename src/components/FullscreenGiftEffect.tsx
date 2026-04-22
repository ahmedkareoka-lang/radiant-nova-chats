import { useState, useEffect, useRef } from "react";
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

/** Duration tiers based on gift gold amount */
const getDuration = (amount: number) => {
  if (amount >= 100000) return 20000; // أسطوري
  if (amount >= 10000) return 15000;  // ملحمي
  if (amount >= 1000) return 10000;   // نادر
  return 6000;                         // عادي
};

const PARTICLE_COLORS = ["#FFD700", "#FF6B6B", "#A855F7", "#3B82F6", "#10B981", "#F59E0B", "#EC4899"];

const FullscreenGiftEffect = ({ gift, onComplete, muted }: FullscreenGiftEffectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gift) return;
    const duration = getDuration(gift.amount);

    if (!muted) {
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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
        >
          {/* Dark backdrop with gradient */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"
          />

          {/* Radial glow behind gift */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 1.5], opacity: [0, 0.8, 0.5] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-80 h-80 rounded-full"
            style={{
              background: gift.amount >= 10000
                ? "radial-gradient(circle, rgba(255,215,0,0.5), rgba(168,85,247,0.2), transparent)"
                : "radial-gradient(circle, rgba(168,85,247,0.4), rgba(59,130,246,0.1), transparent)",
            }}
          />

          {/* Spinning ring for legendary gifts */}
          {gift.amount >= 10000 && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute w-72 h-72 rounded-full border-2 border-dashed border-yellow-400/40"
            />
          )}

          {/* Main gift display */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* Gift image or emoji - LARGE fullscreen */}
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: [0, 1.4, 1], rotate: [0, 10, 0] }}
              transition={{ duration: 1, type: "spring", damping: 12 }}
              className="relative"
            >
              {/* Pulsing glow rings */}
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-accent/30 blur-2xl"
                style={{ width: 280, height: 280, margin: -40 }}
              />

              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.giftName}
                  className="w-52 h-52 object-contain drop-shadow-[0_0_40px_rgba(255,200,80,0.8)]"
                  style={{ background: "transparent" }}
                />
              ) : (
                <span className="text-[140px] drop-shadow-[0_0_30px_rgba(255,200,80,0.6)]">{gift.emoji}</span>
              )}
            </motion.div>

            {/* Gift name */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-black text-foreground glow-neon-text"
            >
              {gift.giftName}
            </motion.p>

            {/* Sender → Receiver */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center gap-3 text-lg"
            >
              <span className="text-primary font-bold">{gift.senderName}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-accent font-bold">{gift.recipientName}</span>
            </motion.div>

            {/* Amount badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1, type: "spring" }}
              className="px-6 py-2 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white font-black text-lg shadow-[0_0_30px_rgba(255,200,0,0.5)]"
            >
              💰 {gift.amount.toLocaleString()} Gold
            </motion.div>
          </div>

          {/* Particle explosion */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: gift.amount >= 10000 ? 40 : 20 }).map((_, i) => {
              const angle = (i / (gift.amount >= 10000 ? 40 : 20)) * Math.PI * 2;
              const dist = 150 + Math.random() * 200;
              const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6 + Math.random() * 8,
                    height: 6 + Math.random() * 8,
                    background: color,
                    left: "50%",
                    top: "50%",
                    boxShadow: `0 0 10px ${color}`,
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist,
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{ duration: 1.5, delay: 0.3 + i * 0.04, repeat: 2, repeatDelay: 0.5 }}
                />
              );
            })}
          </div>

          {/* Rising sparkles */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
              style={{
                left: `${10 + Math.random() * 80}%`,
                bottom: 0,
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -window.innerHeight, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 2, repeat: Infinity }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FullscreenGiftEffect;
