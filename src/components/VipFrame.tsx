import { memo, useMemo, useState, useRef, useEffect } from "react";
import { getVipTier, type VipTier } from "@/lib/vipConfig";
import { getVipFrameAsset } from "@/lib/vipFrameAssets";
import { cn } from "@/lib/utils";

interface VipFrameProps {
  level: number;
  /** Outer frame width in px */
  size?: number;
  children: React.ReactNode;
  /** Disable animations (e.g. in long lists) */
  reducedMotion?: boolean;
  className?: string;
}

/**
 * NOVA Legendary VIP Frame — performance-tuned:
 *  • Lazy-mounts heavy FX (embers/particles/sparkles) only when in viewport.
 *  • Auto-disables FX on small sizes (<56px) and reduced-motion devices.
 *  • Uses CSS transforms only (no layout thrash) + GPU-friendly opacity fade-in.
 *  • Memoized — re-renders only when level/size change.
 */
const VipFrameImpl = ({ level, size = 80, children, reducedMotion = false, className }: VipFrameProps) => {
  const tier = getVipTier(level);
  const asset = getVipFrameAsset(level);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Respect OS-level reduced motion.
  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const compact = size < 64;
  const fxEnabled = !reducedMotion && !prefersReduced && !compact && visible;

  // Mount FX only when frame is on screen.
  useEffect(() => {
    if (!ref.current || compact) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [compact]);

  if (!tier || !asset) return <>{children}</>;

  const frameW = size;
  const frameH = Math.round(frameW / asset.aspect);
  const holeD = Math.round(frameW * asset.holeScale);
  const holeOffsetPx = Math.round(holeD * asset.holeOffsetY);

  return (
    <div
      ref={ref}
      className={cn("relative inline-block", className)}
      style={{
        width: frameW,
        height: frameH,
        ["--vip-glow" as any]: `hsl(${tier.glow})`,
        contain: "layout paint",
      }}
      aria-label={`${tier.titleEn} frame`}
    >
      {/* Soft aura behind the artwork */}
      {fxEnabled && (
        <div
          className="absolute rounded-full pointer-events-none vip-aura-pulse"
          style={{
            left: "50%",
            top: `calc(50% + ${holeOffsetPx}px)`,
            width: holeD * 1.55,
            height: holeD * 1.55,
            transform: "translate(-50%, -50%)",
            background: tier.aura,
            filter: "blur(8px)",
            willChange: "opacity, transform",
          }}
        />
      )}

      {/* Avatar slot */}
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

      {/* Animated flapping wings — only for winged tiers. Sit behind the frame. */}
      {tier.hasWings && !compact && (
        <FlappingWings tier={tier} frameW={frameW} frameH={frameH} animate={fxEnabled} />
      )}

      {/* Frame artwork — STATIONARY. Only wings flap. */}
      <img
        src={asset.image}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10 transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          filter: `drop-shadow(0 0 ${Math.round(holeD * 0.12)}px hsl(${tier.glow} / 0.6))`,
        }}
      />

      {/* Live FX — only when visible & not compact */}
      {fxEnabled && tier.hasFire && (
        <Embers tier={tier} height={frameH} />
      )}
      {fxEnabled && <ParticleField tier={tier} />}
      {fxEnabled && <GoldSparkles size={Math.min(frameW, frameH)} />}
    </div>
  );
};

/* ─────────────── Flapping Wings (SVG, behind frame) ─────────────── */
const FlappingWings = memo(({ tier, frameW, frameH, animate }: { tier: VipTier; frameW: number; frameH: number; animate: boolean }) => {
  // Wings extend ~55% of frame width on each side.
  const wingW = Math.round(frameW * 0.62);
  const wingH = Math.round(frameH * 0.78);
  const topOffset = Math.round(frameH * 0.18);
  const overlap = Math.round(frameW * 0.08); // tuck behind the frame edge

  // Wing shape — layered feather strokes, tier-tinted.
  const Wing = ({ side }: { side: "left" | "right" }) => (
    <svg
      viewBox="0 0 100 120"
      width={wingW}
      height={wingH}
      style={{
        position: "absolute",
        top: topOffset,
        [side]: -wingW + overlap,
        transform: side === "right" ? "scaleX(-1)" : undefined,
        filter: `drop-shadow(0 0 ${Math.round(wingW * 0.08)}px hsl(${tier.glow} / 0.85))`,
        willChange: animate ? "transform, opacity" : "auto",
        pointerEvents: "none",
      } as any}
      className={animate ? (side === "left" ? "vip-wing-left" : "vip-wing-right") : undefined}
      aria-hidden
    >
      <defs>
        <linearGradient id={`wg-${tier.level}-${side}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={`hsl(${tier.glow})`} stopOpacity="1" />
          <stop offset="55%" stopColor={`hsl(${tier.primary})`} stopOpacity="0.9" />
          <stop offset="100%" stopColor={`hsl(${tier.secondary})`} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Main wing fan */}
      <path
        d="M98,60 C70,18 35,8 6,22 C20,30 28,42 30,55 C12,52 4,62 2,76 C18,72 30,78 36,88 C24,92 18,102 18,114 C40,98 70,96 96,78 C92,72 92,66 98,60 Z"
        fill={`url(#wg-${tier.level}-${side})`}
        stroke={`hsl(${tier.glow})`}
        strokeWidth="0.6"
        strokeOpacity="0.7"
      />
      {/* Feather lines */}
      {[0.30, 0.42, 0.54, 0.66, 0.78].map((t, i) => (
        <path
          key={i}
          d={`M96,60 Q ${50 - i * 4},${30 + i * 14} ${10 + i * 3},${30 + i * 16}`}
          stroke={`hsl(${tier.glow})`}
          strokeOpacity={0.55}
          strokeWidth="0.7"
          fill="none"
        />
      ))}
    </svg>
  );

  return (
    <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
      <Wing side="left" />
      <Wing side="right" />
    </div>
  );
});
FlappingWings.displayName = "FlappingWings";

/* ─────────────── Fire embers ─────────────── */
const Embers = memo(({ tier, height }: { tier: VipTier; height: number }) => {
  const embers = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({
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
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
});
Embers.displayName = "Embers";

/* ─────────────── Particle field ─────────────── */
const ParticleField = memo(({ tier }: { tier: VipTier }) => {
  const particles = useMemo(() => {
    const symbol = {
      spark: "✦", snow: "❄", shadow: "·", stardust: "✧",
      flame: "✦", feather: "·", rune: "✺",
    }[tier.particle];
    return Array.from({ length: 5 }, (_, i) => ({
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
            willChange: "opacity, transform",
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
});
ParticleField.displayName = "ParticleField";

/* ─────────────── Gold sparkles ─────────────── */
const GoldSparkles = memo(({ size }: { size: number }) => {
  const radius = Math.round(size * 0.42);
  const sparks = useMemo(
    () => Array.from({ length: 5 }, (_, i) => ({
      delay: -((i * 6) / 5),
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
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
});
GoldSparkles.displayName = "GoldSparkles";

const VipFrame = memo(VipFrameImpl, (prev, next) =>
  prev.level === next.level &&
  prev.size === next.size &&
  prev.reducedMotion === next.reducedMotion &&
  prev.children === next.children
);
export default VipFrame;
