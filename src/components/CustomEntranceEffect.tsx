import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playNovaEntranceSound } from "@/lib/novaEntranceSounds";
import { logAgora } from "@/lib/agoraDebugLog";

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

// Default duration when no video to time against (used for images & name-only entrances)
const FALLBACK_DURATION_MS = 3500;
// Hard safety cap so a broken/long video can't block the queue forever
const MAX_DURATION_MS = 12000;

const CustomEntranceEffect = ({ roomId, currentUserId, queue, onComplete, muteEntrance }: CustomEntranceEffectProps) => {
  const [current, setCurrent] = useState<EntranceEntry | null>(null);
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number>(0);

  const finish = useCallback((entryId: string, reason: "video-ended" | "fallback-timeout" | "safety-cap" | "video-error") => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const elapsed = Date.now() - startedAtRef.current;
    logAgora("info", "entrance", `finish [${reason}] id=${entryId} elapsed=${elapsed}ms`);
    setVideoDurationMs(null);
    setCurrent(null);
    onComplete(entryId);
  }, [onComplete]);

  const playNext = useCallback((entry: EntranceEntry) => {
    setCurrent(entry);
    setVideoDurationMs(null);
    startedAtRef.current = Date.now();

    // Tier-based NOVA P entrance sound
    if (!muteEntrance && entry.novaLevel && entry.novaLevel >= 4) {
      playNovaEntranceSound(entry.novaLevel);
    }

    // Custom audio
    if (entry.audioUrl && !muteEntrance) {
      try {
        const audio = new Audio(entry.audioUrl);
        audio.volume = 0.6;
        audio.play().catch(() => {});
        audioRef.current = audio;
      } catch {}
    }

    const isVideo =
      !!entry.videoUrl &&
      !/\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(entry.videoUrl);

    logAgora("info", "entrance", `start id=${entry.id} user="${entry.displayName}" type=${isVideo ? "video" : entry.videoUrl ? "image" : "name"} url=${entry.videoUrl || "(none)"}`);

    // For videos, the <video onEnded> handler will call finish().
    // We still set a hard safety cap so a broken video can't freeze the queue.
    const duration = isVideo ? MAX_DURATION_MS : FALLBACK_DURATION_MS;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => finish(entry.id, isVideo ? "safety-cap" : "fallback-timeout"),
      duration
    );
  }, [muteEntrance, finish]);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none bg-transparent"
        >
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
                key={activeEntry.id}
                src={mediaUrl}
                autoPlay
                muted={muteEntrance}
                playsInline
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  const ms = isFinite(v.duration) ? Math.round(v.duration * 1000) : null;
                  if (ms) {
                    setVideoDurationMs(ms);
                    logAgora("info", "entrance", `video metadata id=${activeEntry.id} duration=${ms}ms`);
                  }
                }}
                onEnded={() => finish(activeEntry.id, "video-ended")}
                onError={() => finish(activeEntry.id, "video-error")}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-[85vw] max-h-[85vh] object-contain drop-shadow-2xl"
              />
            )
          ) : (
            // No custom media → animated name banner that LOOKS like an entrance
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 border border-accent/40 backdrop-blur-md shadow-[0_0_40px_hsl(var(--accent)/0.4)]"
            >
              <motion.img
                src={activeEntry.avatarUrl || "https://i.pravatar.cc/200"}
                alt=""
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-accent shadow-lg"
              />
              <div className="flex flex-col">
                <span className="text-base font-black text-foreground glow-neon-text">
                  {activeEntry.displayName}
                </span>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[10px] text-accent font-semibold tracking-wider"
                >
                  ✨ دخل الغرفة
                </motion.span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CustomEntranceEffect;
