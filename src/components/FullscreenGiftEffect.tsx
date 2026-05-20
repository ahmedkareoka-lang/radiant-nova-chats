import { useEffect, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GiftMediaPlayer from "@/components/GiftMediaPlayer";
import { recordGiftEvent } from "@/lib/perfMetrics";
import { shouldRenderHeavyEffect } from "@/lib/perfPriority";
import { playTieredGiftSound } from "@/lib/effects";

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
 * Fallback duration tiers based on gift gold amount — used ONLY if the gift
 * has no media file (pure emoji/image) and no explicit durationMs.
 */
const getFallbackDuration = (amount: number, explicit?: number) => {
  if (explicit && explicit > 0) return explicit;
  if (amount >= 100000) return 9000;
  if (amount >= 10000) return 6000;
  if (amount >= 1000) return 4500;
  return 3500;
};

const MIN_VISIBLE_MS = 2200;  // never disappear too fast
const MAX_VISIBLE_MS = 60000; // hard cap (60s) — only as runaway safety

/**
 * Dynamic exit buffer per media type — guarantees the asset reaches its
 * natural end (last frame fully painted, audio tail fully heard) before the
 * overlay starts its fade-out animation.
 */
const EXIT_BUFFER_MS = {
  video: 350,   // small buffer; the `ended` event also short-circuits the timer
  lottie: 450,  // last frame paint + fade
  image: 600,   // static asset has no intrinsic end → keep it on screen longer
  emoji: 600,
} as const;

/**
 * Lazy fetch + tiny in-memory cache for Lottie JSON metadata.
 * We only need (op - ip) / fr to compute the animation's true duration,
 * so we don't keep the whole JSON around — just the resolved ms.
 */
const lottieDurationCache = new Map<string, number>();

const readLottieDurationMs = async (url: string): Promise<number | null> => {
  if (lottieDurationCache.has(url)) return lottieDurationCache.get(url)!;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    const json: any = await res.json();
    const fr = Number(json?.fr) || 0;
    const ip = Number(json?.ip) || 0;
    const op = Number(json?.op) || 0;
    if (fr > 0 && op > ip) {
      const ms = ((op - ip) / fr) * 1000;
      lottieDurationCache.set(url, ms);
      return ms;
    }
  } catch {
    /* ignore — fallback path will handle it */
  }
  return null;
};

const FullscreenGiftEffectInner = ({ gift, onComplete, muted }: FullscreenGiftEffectProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mediaReady, setMediaReady] = useState(false);

  // Reset on every new gift + record gift event for rate tracking
  useEffect(() => {
    setMediaReady(false);
    if (!gift) return;
    recordGiftEvent();

    // 🚀 Under heavy load (>8 gifts/sec), skip the heavy fullscreen effect —
    // the global ticker/banner still shows the gift, but Agora keeps priority.
    if (!shouldRenderHeavyEffect()) {
      onComplete();
      return;
    }

    // 🔊 Epic tiered sound on every gift open
    playTieredGiftSound(gift.amount);



    if (timerRef.current) clearTimeout(timerRef.current);

    // Determine media type to pick the right exit buffer.
    const mediaType: keyof typeof EXIT_BUFFER_MS = gift.videoUrl
      ? "video"
      : gift.lottieUrl
        ? "lottie"
        : gift.imageUrl
          ? "image"
          : "emoji";
    const buffer = EXIT_BUFFER_MS[mediaType];

    // Initial safety fallback timer (used until real media duration is known).
    const fallback = getFallbackDuration(gift.amount, gift.durationMs);
    const safetyMs = Math.min(MAX_VISIBLE_MS, Math.max(MIN_VISIBLE_MS, fallback + buffer));
    timerRef.current = setTimeout(onComplete, safetyMs);

    // 🎬 Lottie: if no explicit durationMs, read it from the JSON (in/out frames).
    let cancelled = false;
    if (mediaType === "lottie" && gift.lottieUrl && !gift.durationMs) {
      readLottieDurationMs(gift.lottieUrl).then((ms) => {
        if (cancelled || !ms) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        const total = Math.max(MIN_VISIBLE_MS, Math.min(MAX_VISIBLE_MS, ms + buffer));
        timerRef.current = setTimeout(onComplete, total);
      });
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gift, onComplete]);

  /**
   * Once the media element mounts, sync the close timer with the media's
   * actual duration so the fullscreen overlay disappears exactly when the
   * animation/video finishes — not before, not after.
   */
  useEffect(() => {
    if (!gift) return;
    const root = containerRef.current;
    if (!root) return;

    const buffer = EXIT_BUFFER_MS.video;

    const scheduleClose = (ms: number, respectActualMedia = false) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // For real media duration, only enforce the minimum — let it play in full.
      // For fallback timers, also enforce the safety maximum.
      const clamped = respectActualMedia
        ? Math.max(MIN_VISIBLE_MS, ms)
        : Math.min(MAX_VISIBLE_MS, Math.max(MIN_VISIBLE_MS, ms));
      timerRef.current = setTimeout(onComplete, clamped);
    };

    // VIDEO: read actual duration once metadata is loaded; close on `ended`.
    const video = root.querySelector("video") as HTMLVideoElement | null;
    const onLoadedMeta = () => {
      if (video && isFinite(video.duration) && video.duration > 0) {
        scheduleClose(video.duration * 1000 + buffer, true); // play full + buffer
      }
    };
    const onEnded = () => {
      // Give the last frame + audio tail a brief buffer before unmounting.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onComplete, buffer);
    };
    if (video) {
      if (video.readyState >= 1) onLoadedMeta();
      video.addEventListener("loadedmetadata", onLoadedMeta);
      video.addEventListener("ended", onEnded);
    }

    return () => {
      if (video) {
        video.removeEventListener("loadedmetadata", onLoadedMeta);
        video.removeEventListener("ended", onEnded);
      }
    };
  }, [gift, mediaReady, onComplete]);

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key={gift.id}
          ref={containerRef}
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
              onAnimationComplete={() => setMediaReady(true)}
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

// 🚀 React.memo with custom comparator: re-render only when the gift identity
// changes (id) — protects audio thread from UI re-render pressure.
const FullscreenGiftEffect = memo(
  FullscreenGiftEffectInner,
  (prev, next) =>
    prev.gift?.id === next.gift?.id &&
    prev.muted === next.muted &&
    prev.onComplete === next.onComplete,
);

export default FullscreenGiftEffect;
