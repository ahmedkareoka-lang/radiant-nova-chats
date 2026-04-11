import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EntranceEntry {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
}

interface CustomEntranceEffectProps {
  queue: EntranceEntry[];
  onComplete: (id: string) => void;
  muteEntrance: boolean;
}

const CustomEntranceEffect = ({ queue, onComplete, muteEntrance }: CustomEntranceEffectProps) => {
  const [current, setCurrent] = useState<EntranceEntry | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const playNext = useCallback(() => {
    if (queue.length === 0) {
      setCurrent(null);
      return;
    }
    const next = queue[0];
    setCurrent(next);

    // Play audio
    if (next.audioUrl && !muteEntrance) {
      try {
        const audio = new Audio(next.audioUrl);
        audio.volume = 0.6;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch {}
    }

    // Auto-dismiss after 4 seconds
    timerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      onComplete(next.id);
    }, 4000);
  }, [queue, muteEntrance, onComplete]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      playNext();
    }
  }, [queue, current, playNext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

          {/* Video or fallback animation */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {current.videoUrl ? (
              <video
                src={current.videoUrl}
                autoPlay
                muted={muteEntrance}
                playsInline
                className="w-80 h-80 object-contain rounded-2xl"
                onEnded={() => {}}
              />
            ) : (
              /* Fallback: animated avatar entrance */
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.3, 1], rotate: [0, 360] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative"
              >
                {/* Glow rings */}
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-primary/30 blur-xl"
                  style={{ width: 160, height: 160, margin: -20 }}
                />
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                  className="absolute inset-0 rounded-full bg-accent/20 blur-2xl"
                  style={{ width: 180, height: 180, margin: -30 }}
                />
                <img
                  src={current.avatarUrl || "https://i.pravatar.cc/200"}
                  alt=""
                  className="w-28 h-28 rounded-full object-cover ring-4 ring-primary shadow-[0_0_40px_rgba(var(--primary),0.5)]"
                />
              </motion.div>
            )}

            {/* Name */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-2xl font-black glow-neon-text">{current.displayName}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground mt-1"
              >
                ✨ دخل الغرفة ✨
              </motion.p>
            </motion.div>

            {/* Sparkle particles */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-accent"
                  initial={{
                    x: 0, y: 0, opacity: 0,
                  }}
                  animate={{
                    x: Math.cos((i / 12) * Math.PI * 2) * 120,
                    y: Math.sin((i / 12) * Math.PI * 2) * 120,
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 1.5, delay: 0.3 + i * 0.08, repeat: 1 }}
                  style={{ left: "50%", top: "40%", marginLeft: -4, marginTop: -4 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomEntranceEffect;
