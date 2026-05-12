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

      {/* Frame artwork */}
      <img
        src={asset.image}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-10 transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          fxEnabled && tier.hasWings && "vip-frame-sway",
          fxEnabled && !tier.hasWings && "vip-frame-float"
        )}
        style={{
          filter: `drop-shadow(0 0 ${Math.round(holeD * 0.12)}px hsl(${tier.glow} / 0.6))`,
          willChange: fxEnabled ? "transform" : "auto",
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
