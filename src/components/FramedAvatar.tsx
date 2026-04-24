import { FRAME_MAP, FRAME_ANIMATION, getFrameFit } from "@/lib/frameConfig";

/** Named size presets so pages don't need to hardcode pixel values everywhere. */
export const FRAMED_AVATAR_SIZES = {
  xs: 36,
  sm: 56,
  md: 84,
  lg: 120,
  xl: 160,
  "2xl": 200,
} as const;

export type FramedAvatarSize = keyof typeof FRAMED_AVATAR_SIZES;

type Props = {
  avatarUrl: string | null | undefined;
  equippedFrame?: string | null;
  /**
   * Outer box size. Either a preset key (`sm`, `md`, `lg` …) OR a raw pixel number.
   * Pages should prefer presets so the frame system stays consistent.
   */
  size: FramedAvatarSize | number;
  /** Optional class for the outer wrapper */
  className?: string;
  /** Optional ring around the inner avatar when no frame is set */
  ringClassName?: string;
  /** Optional element rendered behind the avatar (e.g., speaking waves) */
  behind?: React.ReactNode;
  alt?: string;
};

const resolveSize = (s: FramedAvatarSize | number): number =>
  typeof s === "number" ? s : FRAMED_AVATAR_SIZES[s];

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
  const px = resolveSize(size);
  const frameKey = equippedFrame || null;
  const mapped = frameKey ? FRAME_MAP[frameKey] : null;
  const direct = !mapped && frameKey && (frameKey.startsWith("http") || frameKey.startsWith("/")) ? frameKey : null;
  const frameImg = mapped || direct;

  const fit = getFrameFit(frameKey);
  const innerSize = Math.round(px * fit.innerScale);
  const offsetPx = Math.round(px * fit.innerOffsetY);

  if (frameImg) {
    const animClass = frameKey ? FRAME_ANIMATION[frameKey] || "" : "";
    return (
      <div
        className={`relative ${className}`}
        style={{ width: px, height: px }}
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
      style={{ width: px, height: px }}
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
