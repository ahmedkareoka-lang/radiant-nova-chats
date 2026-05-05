import { memo, useMemo } from "react";
import { getVipTier, type VipTier } from "@/lib/vipConfig";
import { cn } from "@/lib/utils";

interface VipFrameProps {
  level: number;
  /** Pixel size of the inner avatar slot (frame extends ~30% beyond) */
  size?: number;
  /** Children = the avatar to wrap (img / FramedAvatar / etc) */
  children: React.ReactNode;
  /** Disable animations (e.g. in lists) */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * NOVA Legendary VIP Frame
 * - Layered radial aura with counter-rotating rings
 * - Animated wings (level >= 3) drawn as pure CSS/SVG — flap continuously
 * - Live fire embers (level >= 5) rising from the base
 * - Tier-specific particle field (snow / stardust / runes)
 * 
 * Pure presentation. No deps beyond Tailwind + the keyframes in index.css.
 */
const VipFrameImpl = ({ level, size = 80, children, reducedMotion = false, className }: VipFrameProps) => {
  const tier = getVipTier(level);
  if (!tier) return <>{children}</>;

  const frameSize = Math.round(size * 1.45);
  const wingSpan = Math.round(size * 1.2);

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: frameSize, height: frameSize, ["--vip-glow" as any]: `hsl(${tier.glow})` }}
      aria-label={`${tier.titleEn} frame`}
    >
      {/* ─── Outer rotating aura ─── */}
      <div
        className={cn("absolute inset-0 rounded-full pointer-events-none", !reducedMotion && "vip-aura-spin")}
        style={{ background: tier.aura, filter: "blur(2px)" }}
      />

      {/* ─── Inner counter-rotating ring (gradient stroke) ─── */}
      <div
        className={cn("absolute rounded-full pointer-events-none", !reducedMotion && "vip-aura-spin-reverse")}
        style={{
          inset: "8%",
          background: tier.gradient,
          padding: "3px",
          WebkitMask: "radial-gradient(circle, transparent 62%, black 64%)",
          mask: "radial-gradient(circle, transparent 62%, black 64%)",
          boxShadow: tier.shadow,
        }}
      />

      {/* ─── Wings (level >= 3) ─── */}
      {tier.hasWings && !reducedMotion && (
        <Wings tier={tier} span={wingSpan} />
      )}

      {/* ─── Fire embers (level >= 5) ─── */}
      {tier.hasFire && !reducedMotion && (
        <Embers tier={tier} />
      )}

      {/* ─── Tier-specific particle field ─── */}
      {!reducedMotion && <ParticleField tier={tier} />}

      {/* ─── Avatar slot (centered) ─── */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          inset: "16%",
          boxShadow: `inset 0 0 0 2px hsl(${tier.primary} / 0.6)`,
        }}
      >
        {children}
      </div>

      {/* ─── Tier crest (bottom-center badge) ─── */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1"
        style={{
          background: tier.gradient,
          boxShadow: tier.shadow,
          color: "hsl(0 0% 100%)",
        }}
      >
        <span>{tier.crest}</span>
        <span>VIP {tier.level}</span>
      </div>
    </div>
  );
};

/* ─────────────── Wings ─────────────── */
const Wings = ({ tier, span }: { tier: VipTier; span: number }) => {
  const wingFill = `hsl(${tier.primary} / 0.85)`;
  const wingStroke = `hsl(${tier.glow})`;

  return (
    <>
      <svg
        viewBox="0 0 100 60"
        className="vip-wing-left absolute pointer-events-none"
        style={{
          width: span * 0.7,
          height: span * 0.45,
          left: -span * 0.55,
          top: "30%",
          filter: `drop-shadow(0 0 8px ${wingStroke})`,
        }}
        aria-hidden
      >
        <path
          d="M 95 30 Q 60 5 10 15 Q 30 30 10 45 Q 60 55 95 30 Z"
          fill={wingFill}
          stroke={wingStroke}
          strokeWidth="1.5"
        />
        <path d="M 80 30 Q 50 18 25 22" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M 80 30 Q 50 30 25 30" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M 80 30 Q 50 42 25 38" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
      </svg>
      <svg
        viewBox="0 0 100 60"
        className="vip-wing-right absolute pointer-events-none"
        style={{
          width: span * 0.7,
          height: span * 0.45,
          right: -span * 0.55,
          top: "30%",
          filter: `drop-shadow(0 0 8px ${wingStroke})`,
          transform: "scaleX(-1)",
        }}
        aria-hidden
      >
        <path
          d="M 95 30 Q 60 5 10 15 Q 30 30 10 45 Q 60 55 95 30 Z"
          fill={wingFill}
          stroke={wingStroke}
          strokeWidth="1.5"
        />
        <path d="M 80 30 Q 50 18 25 22" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M 80 30 Q 50 30 25 30" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
        <path d="M 80 30 Q 50 42 25 38" stroke={wingStroke} strokeWidth="0.8" fill="none" opacity="0.7" />
      </svg>
    </>
  );
};

/* ─────────────── Fire embers ─────────────── */
const Embers = ({ tier }: { tier: VipTier }) => {
  const embers = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    left: 15 + (i * 11) % 70,
    delay: (i * 0.27) % 2.2,
    size: 4 + (i % 3) * 2,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
      {embers.map((e, i) => (
        <span
          key={i}
          className="vip-ember absolute bottom-2 rounded-full"
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
    <div className="absolute inset-0 pointer-events-none">
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

const VipFrame = memo(VipFrameImpl);
export default VipFrame;
