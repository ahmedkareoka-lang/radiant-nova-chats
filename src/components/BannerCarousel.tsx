import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string | null;
  title?: string;
  description?: string | null;
}

interface BannerCarouselProps {
  banners: Array<Banner>;
  onBannerClick?: (banner: Banner) => void;
}

// Soulmatch-style auto-rotating banner with dot indicators and fullscreen modal preview.
export default function BannerCarousel({ banners, onBannerClick }: BannerCarouselProps) {
  const [index, setIndex] = useState(0);
  const [openBanner, setOpenBanner] = useState<Banner | null>(null);
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

  const handleBannerTap = (b: Banner) => {
    // Always open fullscreen modal; consumer can still react via callback.
    setOpenBanner(b);
    onBannerClick?.(b);
  };

  return (
    <>
      <div className="relative w-full h-32 rounded-2xl overflow-hidden mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => handleBannerTap(current)}
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
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-accent" : "w-1.5 bg-foreground/40"}`}
                aria-label={`go to banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen banner modal */}
      <AnimatePresence>
        {openBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col"
            onClick={() => setOpenBanner(null)}
          >
            <div className="flex justify-end p-3">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenBanner(null); }}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
                aria-label="close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 240, damping: 25 }}
              className="flex-1 flex flex-col items-center justify-center px-4 pb-8 overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={openBanner.image_url}
                alt={openBanner.title || "banner"}
                className="max-w-full max-h-[65vh] rounded-2xl object-contain shadow-[0_0_60px_rgba(168,85,247,0.4)]"
              />
              {(openBanner.title || openBanner.description) && (
                <div className="mt-5 w-full max-w-md rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 text-center">
                  {openBanner.title && (
                    <h3 className="text-lg font-black bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-transparent mb-2">
                      {openBanner.title}
                    </h3>
                  )}
                  {openBanner.description && (
                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                      {openBanner.description}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
