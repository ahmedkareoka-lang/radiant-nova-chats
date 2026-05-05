import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  /** Disable lazy loading for above-the-fold avatars (profile hero, etc.) */
  eager?: boolean;
};

const FALLBACK = "https://i.pravatar.cc/200";

/**
 * Avatar image with built-in skeleton + automatic aspect-ratio balancing.
 *
 * - While loading: shows a soft shimmer placeholder (no empty frame flash).
 * - On error: falls back to a generic avatar.
 * - After load: picks `object-position` based on the image's natural ratio
 *   so portrait shots keep the face centered and landscape shots stay
 *   visually balanced — the avatar never appears stretched or off-center.
 */
const AvatarImg = ({ src, alt = "", className = "", eager = false }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [pos, setPos] = useState<string>("50% 50%");
  const imgRef = useRef<HTMLImageElement>(null);
  const finalSrc = errored || !src ? FALLBACK : src;

  // Reset state when source changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  // If the cached image is already complete on mount, mark it loaded.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      computePosition(el);
      setLoaded(true);
    }
  }, [finalSrc]);

  const computePosition = (el: HTMLImageElement) => {
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    if (!w || !h) return;
    const r = w / h;
    // Portrait → faces are usually in the upper third → bias upward.
    if (r < 0.85) setPos("50% 25%");
    // Landscape → keep horizontal center, slight upward bias.
    else if (r > 1.2) setPos("50% 40%");
    // Square-ish → dead center.
    else setPos("50% 50%");
  };

  return (
    <div className={cn("absolute inset-0 w-full h-full overflow-hidden rounded-full bg-muted", className)}>
      {/* Skeleton shimmer — visible until image is decoded */}
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              "linear-gradient(110deg, hsl(var(--muted)) 8%, hsl(var(--muted-foreground) / 0.12) 18%, hsl(var(--muted)) 33%)",
            backgroundSize: "200% 100%",
          }}
          aria-hidden
        />
      )}
      <img
        ref={imgRef}
        src={finalSrc}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => {
          computePosition(e.currentTarget);
          setLoaded(true);
        }}
        onError={() => {
          setErrored(true);
          setLoaded(false);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        style={{ objectPosition: pos }}
      />
    </div>
  );
};

export default AvatarImg;
