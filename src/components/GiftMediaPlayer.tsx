import { useEffect, useState } from "react";
import Lottie from "lottie-react";

interface GiftMediaPlayerProps {
  lottieUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  emoji?: string;
  className?: string;
}

/**
 * Smart gift media renderer.
 * Priority: video (transparent WebM/MP4) → Lottie JSON → static image → emoji.
 * Auto-detects best available source for cinematic, BIGO/Yalla-style fullscreen animations.
 */
const GiftMediaPlayer = ({ lottieUrl, videoUrl, imageUrl, emoji = "🎁", className = "" }: GiftMediaPlayerProps) => {
  const [lottieData, setLottieData] = useState<any>(null);
  const [lottieFailed, setLottieFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

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

  // 1) Video (WebM / MP4 with alpha) — most cinematic
  if (videoUrl && !videoFailed) {
    return (
      <video
        src={videoUrl}
        autoPlay
        muted
        playsInline
        loop={false}
        onError={() => setVideoFailed(true)}
        className={`w-full h-full object-contain ${className}`}
        style={{ background: "transparent" }}
      />
    );
  }

  // 2) Lottie JSON — lightweight & high quality
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
