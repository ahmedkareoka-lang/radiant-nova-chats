import { FRAME_MAP, FRAME_ANIMATION, getFrameFit } from "@/lib/frameConfig";

type Props = {
  avatarUrl: string | null | undefined;
  equippedFrame?: string | null;
  /** Outer box size in pixels (frame + avatar are both sized from this) */
  size: number;
  /** Optional class for the outer wrapper */
  className?: string;
  /** Optional ring around the inner avatar when no frame is set */
  ringClassName?: string;
  /** Optional element rendered behind the avatar (e.g., speaking waves) */
  behind?: React.ReactNode;
  alt?: string;
};

/**
 * Renders an avatar that automatically adapts its size & position to fit
 * inside the equipped frame's transparent center. One source of truth for
 * Profile, UserProfile, VoiceRoom, store previews, etc.
 */
const FramedAvatar = ({
  avatarUrl,
  equippedFrame,
  size,
  className = "",
  ringClassName = "ring-2 ring-border",
  behind,
  alt = "",
}: Props) => {
  const frameKey = equippedFrame || null;
  const mapped = frameKey ? FRAME_MAP[frameKey] : null;
  const direct = !mapped && frameKey && (frameKey.startsWith("http") || frameKey.startsWith("/")) ? frameKey : null;
  const frameImg = mapped || direct;

  const fit = getFrameFit(frameKey);
  const innerSize = Math.round(size * fit.innerScale);
  const offsetPx = Math.round(size * fit.innerOffsetY);

  if (frameImg) {
    const animClass = frameKey ? FRAME_ANIMATION[frameKey] || "" : "";
    return (
      <div
        className={`relative ${className}`}
        style={{ width: size, height: size }}
      >
        {behind}
        {/* Inner avatar: size & vertical offset come from frame fit metadata */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden bg-background"
          style={{
            width: innerSize,
            height: innerSize,
            top: `calc(50% + ${offsetPx}px)`,
            transform: `translate(-50%, -50%)`,
          }}
        >
          <img
            src={avatarUrl || "https://i.pravatar.cc/200"}
            alt={alt}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Frame on top */}
        <img
          src={frameImg}
          alt=""
          className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 ${animClass}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden ${ringClassName} ${className}`}
      style={{ width: size, height: size }}
    >
      {behind}
      <img
        src={avatarUrl || "https://i.pravatar.cc/200"}
        alt={alt}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default FramedAvatar;
