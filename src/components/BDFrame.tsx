import bdFrameImg from "@/assets/bd-frame.gif";

type Props = {
  size: number;
  children: React.ReactNode;
};

/**
 * BD (Business Developer) frame.
 * Uses a fully transparent animated GIF overlay — the avatar is shown
 * untouched inside the frame's central window (no filter, no tint).
 */
const BDFrame = ({ size, children }: Props) => {
  // Inner avatar window covers ~62% of the frame, slightly above center
  // to match the wreath artwork (BD label sits at the bottom).
  const innerScale = 0.62;
  const innerOffsetY = -0.04; // negative = nudge up
  const innerSize = Math.round(size * innerScale);
  const offsetPx = Math.round(size * innerOffsetY);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Avatar (untouched) sits inside the transparent center of the frame */}
      <div
        className="absolute left-1/2 rounded-full overflow-hidden bg-background"
        style={{
          width: innerSize,
          height: innerSize,
          top: `calc(50% + ${offsetPx}px)`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {children}
      </div>

      {/* Transparent animated frame overlay on top */}
      <img
        src={bdFrameImg}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10"
      />
    </div>
  );
};

export default BDFrame;
