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
  const mediaUrl = activeEntry?.videoUrl || null;
  const isImageMedia = !!mediaUrl && /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(mediaUrl);

  return (
    <AnimatePresence>
      {activeEntry && (
        <motion.div
          key={activeEntry.id}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none bg-transparent"
        >
          {/* Only the entrance media itself — no backdrop, no halos, no extra effects */}
          {mediaUrl ? (
            isImageMedia ? (
              <motion.img
                src={mediaUrl}
                alt="entrance-effect"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-[80vw] max-h-[80vh] object-contain drop-shadow-2xl"
              />
            ) : (
              <motion.video
                src={mediaUrl}
                autoPlay
                muted={muteEntrance}
                playsInline
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-[80vw] max-h-[80vh] object-contain drop-shadow-2xl"
              />
            )
          ) : (
            // Fallback when user has no custom entrance media: just an animated avatar pop, no halos
            <motion.img
              src={activeEntry.avatarUrl || "https://i.pravatar.cc/200"}
              alt=""
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: [0, 1.15, 1], rotate: [-90, 0], opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="w-32 h-32 rounded-full object-cover drop-shadow-2xl"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomEntranceEffect;
