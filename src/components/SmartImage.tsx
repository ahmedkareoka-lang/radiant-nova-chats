/**
 * 🚀 SmartImage — adaptive avatars / room covers
 *
 * - Adds Supabase storage `?width=` transform for srcset (multiple sizes)
 * - Lazy loads + async decoding by default
 * - Tiny blurred placeholder shown until the image decodes
 * - Falls back to a CSS gradient on error so the layout never breaks
 *
 * Works with Supabase storage public URLs; for non-Supabase URLs it just
 * renders a normal lazy <img>.
 */
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "srcSet" | "sizes"> {
  src: string | null | undefined;
  /** Display widths in CSS pixels — generates 1x/2x/3x srcset. */
  width?: number;
  /** Optional sizes attribute (defaults to fixed width). */
  sizes?: string;
  /** Fallback placeholder color (CSS) when no src. */
  placeholderClassName?: string;
  /** Image type hint for content-aware optimization. */
  variant?: "avatar" | "cover" | "thumb";
}

const isSupabaseStorage = (url: string) =>
  /\/storage\/v1\/object\/(public|sign)\//.test(url);

const buildSupabaseSrc = (url: string, width: number, quality = 70) => {
  // Supabase image transformations require the `render/image` path.
  // If URL already uses `object/`, swap to `render/image/` for transforms.
  if (!isSupabaseStorage(url)) return url;
  const transformed = url.replace("/object/public/", "/render/image/public/")
                          .replace("/object/sign/", "/render/image/sign/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=${quality}&resize=cover`;
};

const buildSrcSet = (url: string, base: number) => {
  if (!isSupabaseStorage(url)) return undefined;
  const widths = [base, base * 2, base * 3];
  return widths
    .map((w) => `${buildSupabaseSrc(url, w)} ${w}w`)
    .join(", ");
};

const SmartImage = ({
  src,
  width = 64,
  sizes,
  placeholderClassName = "bg-gradient-to-br from-primary/30 to-accent/30",
  variant = "avatar",
  className = "",
  alt = "",
  loading = "lazy",
  decoding = "async",
  onLoad,
  onError,
  ...rest
}: SmartImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  if (!src || errored) {
    return <div className={`${placeholderClassName} ${className}`} aria-label={alt} />;
  }

  const resolvedSrc = isSupabaseStorage(src) ? buildSupabaseSrc(src, width) : src;
  const srcSet = buildSrcSet(src, width);
  const sizesAttr = sizes ?? `${width}px`;

  return (
    <span className={`relative inline-block overflow-hidden ${className}`} style={{ contain: "layout paint" }}>
      {/* Tiny placeholder — fades out once the real image decodes */}
      {!loaded && (
        <span
          aria-hidden
          className={`absolute inset-0 ${placeholderClassName} animate-pulse`}
        />
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizesAttr}
        loading={loading}
        decoding={decoding}
        fetchPriority={variant === "cover" ? "auto" : "low"}
        alt={alt}
        onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
        onError={(e) => { setErrored(true); onError?.(e); }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        {...rest}
      />
    </span>
  );
};

export default SmartImage;
