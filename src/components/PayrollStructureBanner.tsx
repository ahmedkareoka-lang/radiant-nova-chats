import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, X, Maximize2 } from "lucide-react";
import bannerImage from "@/assets/agency-payroll-banner.png";

/**
 * Inline payroll-structure banner that sits INSIDE the agency system.
 * Renders a thumbnail card; tapping it opens a clean fullscreen viewer
 * with pinch / wheel zoom-friendly sizing so hosts and agents can read
 * the policy easily.
 */
const PayrollStructureBanner = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Inline thumbnail card inside agency UI */}
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl overflow-hidden border border-accent/40 bg-gradient-to-br from-accent/10 to-primary/10 hover:border-accent transition-all group relative"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center flex-shrink-0 shadow-lg">
            <DollarSign className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-sm text-foreground">📜 سياسة الرواتب والأهداف</p>
            <p className="text-[10px] text-muted-foreground">اضغط لعرض الهيكل الكامل بحجم واضح</p>
          </div>
          <Maximize2 className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
        </div>
        <div className="relative w-full h-24 overflow-hidden border-t border-border/40">
          <img
            src={bannerImage}
            alt="معاينة هيكل الرواتب"
            loading="lazy"
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-3 overflow-auto"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg z-10 hover:bg-destructive/20 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <img loading="lazy" decoding="async" src={bannerImage}
                alt="هيكل رواتب وأهداف وكالة نوفا"
                className="w-full h-auto rounded-2xl shadow-2xl border border-primary/30 bg-card" />
              <p className="text-center text-[11px] text-muted-foreground mt-3 leading-relaxed px-2">
                💡 يتم احتساب التارجت كل 15 يوم (دورتان شهريًا: 1-15 و 16-نهاية الشهر).
                الالتزام لكل دورة: 8 أيام نشطة + 20 ساعة بث.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PayrollStructureBanner;
