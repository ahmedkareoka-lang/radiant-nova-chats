import { memo, useMemo } from "react";
import { getVipTier, type VipTier } from "@/lib/vipConfig";
import { getVipFrameAsset } from "@/lib/vipFrameAssets";
import { cn } from "@/lib/utils";

interface VipFrameProps {
  level: number;
  /** Pixel size of the inner avatar slot (frame extends beyond) */
  size?: number;
  /** Children = the avatar to wrap (img / FramedAvatar / etc) */
  children: React.ReactNode;
  /** Disable animations (e.g. in lists) */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * NOVA Legendary VIP Frame — uses high-fidelity AI-generated PNG art per tier
 * with layered live animation (aura pulse, gentle wing sway, fire embers,
 * tier-specific particles, and orbiting gold sparks).
 */
const VipFrameImpl = ({ level, size = 80, children, reducedMotion = false, className }: VipFrameProps) => {
  const tier = getVipTier(level);
  const asset = getVipFrameAsset(level);
  if (!tier || !asset) return <>{children}</>;

  // Outer container width — sized so wings & ornaments fit. Height follows the asset's aspect.
  const frameW = Math.round(size * asset.widthMultiplier);
  const frameH = Math.round(frameW / asset.aspect);

  // Inner avatar slot — its diameter is a fraction of the frame width, matching the artwork's hole.
  const holeD = Math.round(frameW * asset.holeScale);
  const holeOffsetPx = Math.round(frameH * asset.holeOffsetY);

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        width: frameW,
        height: frameH,
        ["--vip-glow" as any]: `hsl(${tier.glow})`,
      }}
      aria-label={`${tier.titleEn} frame`}
    >
      {/* ─── Soft aura behind the artwork ─── */}
      <div
        className={cn(
          "absolute rounded-full pointer-events-none",
          !reducedMotion && "vip-aura-pulse"
        )}
        style={{
          left: "50%",
          top: `calc(50% + ${holeOffsetPx}px)`,
          width: holeD * 1.6,
          height: holeD * 1.6,
          transform: "translate(-50%, -50%)",
          background: tier.aura,
          filter: "blur(8px)",
        }}
      />

      {/* ─── Avatar slot ─── */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          left: "50%",
          top: `calc(50% + ${holeOffsetPx}px)`,
          width: holeD,
          height: holeD,
          transform: "translate(-50%, -50%)",
          boxShadow: `inset 0 0 0 2px hsl(${tier.primary} / 0.55), 0 0 ${Math.round(holeD * 0.15)}px hsl(${tier.glow} / 0.55)`,
          background: "hsl(var(--background))",
        }}
      >
        {children}
      </div>

      {/* ─── Frame artwork on top ─── */}
      <img
        src={asset.image}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10",
          !reducedMotion && tier.hasWings && "vip-frame-sway",
          !reducedMotion && !tier.hasWings && "vip-frame-float"
        )}
        style={{ filter: `drop-shadow(0 0 ${Math.round(holeD * 0.12)}px hsl(${tier.glow} / 0.6))` }}
      />

      {/* ─── Live fire embers (level >= 5) ─── */}
      {tier.hasFire && !reducedMotion && (
        <Embers tier={tier} width={frameW} height={frameH} />
      )}

      {/* ─── Tier-specific particle field ─── */}
      {!reducedMotion && <ParticleField tier={tier} />}

      {/* ─── Orbiting gold sparkles (every VIP gets these) ─── */}
      {!reducedMotion && <GoldSparkles size={Math.min(frameW, frameH)} />}
    </div>
  );
};

/* ─────────────── Fire embers ─────────────── */
const Embers = ({ tier, width, height }: { tier: VipTier; width: number; height: number }) => {
  const embers = useMemo(
    () => Array.from({ length: 10 }, (_, i) => ({
      left: 20 + (i * 9) % 60,
      delay: (i * 0.27) % 2.4,
      size: 4 + (i % 3) * 2,
    })),
    []
  );
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ left: "10%", right: "10%", bottom: 0, height: height * 0.4 }}
    >
      {embers.map((e, i) => (
        <span
          key={i}
          className="vip-ember absolute bottom-0 rounded-full"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            background: `radial-gradient(circle, hsl(${tier.glow}), hsl(${tier.primary}) 60%, transparent)`,
            animationDelay: `${e.delay}s`,
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
};

/* ─────────────── Particle field ─────────────── */
const ParticleField = ({ tier }: { tier: VipTier }) => {
  const particles = useMemo(() => {
    const symbol = {
      spark: "✦",
      snow: "❄",
      shadow: "·",
      stardust: "✧",
      flame: "✦",
      feather: "·",
      rune: "✺",
    }[tier.particle];
    return Array.from({ length: 6 }, (_, i) => ({
      symbol,
      left: (i * 17 + 10) % 90,
      top: (i * 29 + 5) % 80,
      delay: (i * 0.31) % 1.6,
    }));
  }, [tier.particle]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {particles.map((p, i) => (
        <span
          key={i}
          className="vip-twinkle absolute text-[10px] font-bold"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            color: `hsl(${tier.glow})`,
            textShadow: `0 0 6px hsl(${tier.glow})`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
};

/* ─────────────── Gold sparkles ─────────────── */
const GoldSparkles = ({ size }: { size: number }) => {
  const radius = Math.round(size * 0.42);
  const sparks = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      delay: -((i * 6) / 6),
      duration: 5 + (i % 3),
    })),
    []
  );
  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden>
      {sparks.map((s, i) => (
        <span
          key={i}
          className="vip-gold-spark"
          style={{
            ["--vip-gold-r" as any]: `${radius}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

const VipFrame = memo(VipFrameImpl);
export default VipFrame;
