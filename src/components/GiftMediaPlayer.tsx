import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { registerGiftAudio, stopGiftAudio } from "@/lib/giftAudioManager";

interface GiftMediaPlayerProps {
  lottieUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  emoji?: string;
  className?: string;
  /** When true, the video element is muted (used for thumbnails / silent previews). */
  muted?: boolean;
}

/**
 * Smart gift media renderer.
 * Priority: video (transparent WebM/MP4) → Lottie JSON → static image → emoji.
 * Plays the video's own audio so the gift's native sound is heard — no synthetic effects.
 * A global audio manager guarantees that only one gift sound can play at a time.
 */
const GiftMediaPlayer = ({ lottieUrl, videoUrl, imageUrl, emoji = "🎁", className = "", muted = false }: GiftMediaPlayerProps) => {
  const [lottieData, setLottieData] = useState<any>(null);
  const [lottieFailed, setLottieFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Lazy-load lottie JSON
  useEffect(() => {
    if (!lottieUrl || videoUrl) return;
    let cancelled = false;
    fetch(lottieUrl)
      .then((r) => r.json())
      .then((json) => { if (!cancelled) setLottieData(json); })
      .catch(() => { if (!cancelled) setLottieFailed(true); });
    return () => { cancelled = true; };
  }, [lottieUrl, videoUrl]);

  // Register / unregister with the global audio manager so only ONE gift plays at a time.
  useEffect(() => {
    if (muted) return;
    const el = videoRef.current;
    if (!el || !videoUrl) return;
    registerGiftAudio(el);
    return () => { stopGiftAudio(el); };
  }, [videoUrl, muted]);

  // 1) Video (WebM / MP4 with alpha) — most cinematic, plays its own native sound.
  if (videoUrl && !videoFailed) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        muted={muted}
        playsInline
        loop={false}
        onError={() => setVideoFailed(true)}
        className={`w-full h-full object-contain ${className}`}
        style={{ background: "transparent" }}
      />
    );
  }

  // 2) Lottie JSON — lightweight & high quality (visual only, no audio track).
  if (lottieUrl && !lottieFailed && lottieData) {
    return (
      <Lottie
        animationData={lottieData}
        loop={false}
        autoplay
        className={`w-full h-full ${className}`}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    );
  }

  // 3) Static image
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="gift"
        className={`w-full h-full object-contain ${className}`}
        style={{ background: "transparent" }}
      />
    );
  }

  // 4) Emoji fallback
  return (
    <span
      className={`flex items-center justify-center ${className}`}
      style={{ fontSize: "min(60vw, 360px)", lineHeight: 1 }}
    >
      {emoji}
    </span>
  );
};

export default GiftMediaPlayer;
