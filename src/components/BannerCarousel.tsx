import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BannerCarouselProps {
  banners: Array<{ id: string; image_url: string; link_url?: string | null; title?: string }>;
  onBannerClick?: (banner: { id: string; link_url?: string | null }) => void;
}

// Soulmatch-style auto-rotating banner with dot indicators and swipe support.
export default function BannerCarousel({ banners, onBannerClick }: BannerCarouselProps) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 4500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;
  const current = banners[index];

  return (
    <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => onBannerClick?.(current)}
        >
          <img loading="lazy" decoding="async" src={current.image_url} alt={current.title || "banner"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-accent" : "w-1.5 bg-foreground/40"}`}
              aria-label={`go to banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
