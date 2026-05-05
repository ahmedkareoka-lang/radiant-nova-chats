import { FRAME_MAP, FRAME_ANIMATION, getFrameFit } from "@/lib/frameConfig";
import RechargeAgentFrame from "@/components/RechargeAgentFrame";
import BDFrame from "@/components/BDFrame";
import VipFrame from "@/components/VipFrame";
import { getVipTier } from "@/lib/vipConfig";
import { getVipFrameAsset } from "@/lib/vipFrameAssets";

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
  /** When true, wraps the avatar in the special Recharge Agent frame.
   *  Takes precedence over `equippedFrame` so agents always show their badge frame. */
  isRechargeAgent?: boolean;
  /** When true, wraps the avatar in the BD (Business Developer) frame.
   *  Takes precedence over both `isRechargeAgent` and `equippedFrame`. */
  isBD?: boolean;
  /** VIP level (1-7). When > 0 and no other special frame is set, wraps in VipFrame. */
  vipLevel?: number | null;
  /** Disable VIP animations (e.g., in long lists for perf) */
  reducedMotion?: boolean;
};

const resolveSize = (s: FramedAvatarSize | number): number =>
  typeof s === "number" ? s : FRAMED_AVATAR_SIZES[s];

/** Global boost so frames feel "premium" — they overhang the avatar by ~15%. */
const FRAME_BOOST = 1.15;

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
  isRechargeAgent = false,
  isBD = false,
  vipLevel = 0,
  reducedMotion = false,
}: Props) => {
  const px = resolveSize(size);
  const equipped = equippedFrame || null;
  const vipTier = getVipTier(vipLevel || 0);

  // Equipped VIP frame override: "vip-frame-N" key means user equipped a tier frame from inventory.
  const equippedVipMatch = equipped && equipped.startsWith("vip-frame-")
    ? Number(equipped.replace("vip-frame-", ""))
    : 0;
  const equippedVipTier = getVipTier(equippedVipMatch);

  // Special keys: explicitly equipped BD / Recharge Agent frame from inventory.
  // If user has NOT equipped anything else, fall back to their role frame
  // (BD takes priority over Recharge Agent).
  const wantsBDFrame = equipped === "frame-bd" || (!equipped && isBD);
  const wantsAgentFrame = equipped === "frame-recharge-agent" || (!equipped && !wantsBDFrame && isRechargeAgent);

  if (wantsBDFrame) {
    return (
      <div className={`relative ${className}`} style={{ width: px, height: px }}>
        {behind}
        <BDFrame size={px}>
          <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
            alt={alt}
            className="w-full h-full object-cover" />
        </BDFrame>
      </div>
    );
  }

  if (wantsAgentFrame) {
    return (
      <div className={`relative ${className}`} style={{ width: px, height: px }}>
        {behind}
        <RechargeAgentFrame size={px}>
          <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
            alt={alt}
            className="w-full h-full object-cover" />
        </RechargeAgentFrame>
      </div>
    );
  }

  // Equipped VIP tier frame from inventory takes precedence over generic frame.
  if (equippedVipTier) {
    const a = getVipFrameAsset(equippedVipTier.level);
    // +15% boost so the frame visually overhangs the avatar without breaking layout.
    const outerW = a ? Math.round((px / a.holeScale) * FRAME_BOOST) : px;
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: px, height: px, overflow: "visible" }}
      >
        {behind}
        <VipFrame level={equippedVipTier.level} size={outerW} reducedMotion={reducedMotion}>
          <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
            alt={alt}
            className="w-full h-full object-cover" />
        </VipFrame>
      </div>
    );
  }

  const frameKey = equippedFrame || null;
  const mapped = frameKey ? FRAME_MAP[frameKey] : null;
  const direct = !mapped && frameKey && (frameKey.startsWith("http") || frameKey.startsWith("/")) ? frameKey : null;
  const frameImg = mapped || direct;

  const fit = getFrameFit(frameKey);

  if (frameImg) {
    const animClass = frameKey ? FRAME_ANIMATION[frameKey] || "" : "";
    // Treat `px` as the AVATAR display size; the frame grows around it
    // (frame "wears" the avatar instead of shrinking it inside).
    const outerSize = Math.round((px / fit.innerScale) * FRAME_BOOST);
    const offsetPx = Math.round(outerSize * fit.innerOffsetY);
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: px, height: px, overflow: "visible" }}
      >
        {behind}
        <div className="relative" style={{ width: outerSize, height: outerSize }}>
          {/* Inner avatar — exactly `px` so the frame appears to wrap it */}
          <div
            className="absolute left-1/2 rounded-full overflow-hidden bg-background"
            style={{
              width: px,
              height: px,
              top: `calc(50% + ${offsetPx}px)`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
              alt={alt}
              className="w-full h-full object-cover" />
          </div>
          {/* Frame on top */}
          <img loading="lazy" decoding="async" src={frameImg}
            alt=""
            className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 ${animClass}`} />
        </div>
      </div>
    );
  }

  // No equipped frame, no role frame — but if user has VIP, show legendary VipFrame.
  if (vipTier) {
    const a = getVipFrameAsset(vipTier.level);
    const outerW = a ? Math.round((px / a.holeScale) * FRAME_BOOST) : px;
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: px, height: px, overflow: "visible" }}
      >
        {behind}
        <VipFrame level={vipTier.level} size={outerW} reducedMotion={reducedMotion}>
          <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
            alt={alt}
            className="w-full h-full object-cover" />
        </VipFrame>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden ${ringClassName} ${className}`}
      style={{ width: px, height: px }}
    >
      {behind}
      <img loading="lazy" decoding="async" src={avatarUrl || "https://i.pravatar.cc/200"}
        alt={alt}
        className="w-full h-full object-cover" />
    </div>
  );
};

export default FramedAvatar;
