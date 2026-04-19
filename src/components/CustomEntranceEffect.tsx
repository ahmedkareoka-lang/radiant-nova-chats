import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getNovaAsset } from "@/lib/novaAssets";
import { playNovaEntranceSound } from "@/lib/novaEntranceSounds";

interface EntranceEntry {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  novaLevel?: number;
  vipLevel?: number;
}

interface CustomEntranceEffectProps {
  roomId: string | null;
  currentUserId: string | null;
  queue: EntranceEntry[];
  onComplete: (id: string) => void;
  muteEntrance: boolean;
}

const CustomEntranceEffect = ({ roomId, currentUserId, queue, onComplete, muteEntrance }: CustomEntranceEffectProps) => {
  const [current, setCurrent] = useState<EntranceEntry | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // SELF-ONLY entrance: only show the user's OWN entrance to themselves.
  // No broadcasting, no remote display — each user sees only their own join effect.

  const playNext = useCallback((entry: EntranceEntry) => {
    setCurrent(entry);

    // Play tier-based NOVA P entrance sound (P4 fire, P5 rainbow, P6 dragon)
    if (!muteEntrance && entry.novaLevel && entry.novaLevel >= 4) {
      playNovaEntranceSound(entry.novaLevel);
    }

    // Play custom audio
    if (entry.audioUrl && !muteEntrance) {
      try {
        const audio = new Audio(entry.audioUrl);
        audio.volume = 0.6;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch {}
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setCurrent(null);
      onComplete(entry.id);
    }, 4000);
  }, [muteEntrance, onComplete]);

  useEffect(() => {
    if (!current && queue.length > 0) {
      playNext(queue[0]);
    }
  }, [queue, current, playNext]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const activeEntry = current;
  const novaAsset = activeEntry?.novaLevel ? getNovaAsset(activeEntry.novaLevel) : null;

  return (
    <AnimatePresence>
      {activeEntry && (
        <motion.div
          key={activeEntry.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
        >
          <div className={`absolute inset-0 backdrop-blur-sm ${novaAsset ? `bg-gradient-to-br ${novaAsset.gradient}` : 'bg-background/60'}`} />

          <div className="relative z-10 flex flex-col items-center gap-4">
            {activeEntry.videoUrl ? (
              <video
                src={activeEntry.videoUrl}
                autoPlay
                muted={muteEntrance}
                playsInline
                className="w-80 h-80 object-contain rounded-2xl"
                onEnded={() => {}}
              />
            ) : (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: [0, 1.3, 1], rotate: [0, 360] }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="relative"
              >
                <motion.div
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-0 rounded-full ${novaAsset ? 'bg-accent/40' : 'bg-primary/30'} blur-xl`}
                  style={{ width: 160, height: 160, margin: -20 }}
                />
                <motion.div
                  animate={{ scale: [1, 2.2, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
                  className={`absolute inset-0 rounded-full ${novaAsset ? 'bg-primary/30' : 'bg-accent/20'} blur-2xl`}
                  style={{ width: 180, height: 180, margin: -30 }}
                />
                {/* NOVA P frame around avatar */}
                {novaAsset && (
                  <img
                    src={novaAsset.frame}
                    alt="nova-frame"
                    className="absolute -inset-6 w-[calc(100%+48px)] h-[calc(100%+48px)] object-contain z-10 pointer-events-none"
                  />
                )}
                <img
                  src={activeEntry.avatarUrl || "https://i.pravatar.cc/200"}
                  alt=""
                  className={`w-28 h-28 rounded-full object-cover ring-4 ${novaAsset ? 'ring-accent shadow-[0_0_60px_hsl(var(--accent)/0.6)]' : 'ring-primary shadow-[0_0_40px_rgba(var(--primary),0.5)]'}`}
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              {novaAsset && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className={`inline-block px-4 py-1 mb-2 rounded-full bg-gradient-to-r ${novaAsset.gradient} border border-white/30 ${novaAsset.borderGlow} text-xs font-black`}
                >
                  👑 NOVA {novaAsset.label}
                </motion.div>
              )}
              <p className="text-2xl font-black glow-neon-text">{activeEntry.displayName}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-sm text-muted-foreground mt-1"
              >
                ✨ دخل الغرفة ✨
              </motion.p>
            </motion.div>

            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-2 h-2 rounded-full ${novaAsset ? 'bg-accent' : 'bg-accent'}`}
                  initial={{ x: 0, y: 0, opacity: 0 }}
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
