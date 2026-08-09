import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Banner {
  id: string;
  image_url: string;
  link_url?: string | null;
  title?: string;
  description?: string | null;
  featured?: boolean;
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

  const isFeatured = !!current.featured;

  return (
    <>
      <div
        className={`relative w-full mb-4 rounded-2xl overflow-hidden transition-all duration-500 ${
          isFeatured ? "h-36 p-[2px]" : "h-32"
        }`}
        style={
          isFeatured
            ? {
                background: "linear-gradient(135deg, hsl(20 100% 55%), hsl(40 100% 60%), hsl(12 95% 45%))",
                boxShadow: "0 0 28px hsl(24 100% 55% / 0.55), 0 0 70px hsl(14 100% 50% / 0.35)",
              }
            : undefined
        }
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden">
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
            {isFeatured ? (
              <>
                {/* Fiery orange wash */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-overlay"
                  style={{ background: "linear-gradient(120deg, hsl(18 100% 50% / 0.55), transparent 55%, hsl(38 100% 55% / 0.45))" }}
                />
                {/* Sweeping light beam */}
                <motion.div
                  className="absolute inset-y-0 w-1/3 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(40 100% 75% / 0.55), transparent)" }}
                  animate={{ x: ["-120%", "420%"] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Pulsing inner fire glow */}
                <motion.div
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  animate={{ opacity: [0.35, 0.8, 0.35] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  style={{ boxShadow: "inset 0 0 40px hsl(22 100% 55% / 0.8)" }}
                />
                <span className="absolute top-2 right-2 z-10 text-[10px] font-black px-2 py-1 rounded-full text-white"
                  style={{ background: "linear-gradient(135deg, hsl(14 95% 48%), hsl(38 100% 55%))", boxShadow: "0 0 14px hsl(24 100% 55% / 0.8)" }}>
                  🔥 مميز
                </span>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />
            )}
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
