import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, X } from "lucide-react";
import bannerImage from "@/assets/agency-payroll-banner.png";

/**
 * Floating icon at the top of the agencies screen that, when tapped,
 * shows the full NOVA payroll & target structure banner image
 * to every host and agent in the system.
 */
const PayrollStructureBanner = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="هيكل الرواتب والأهداف"
        className="relative w-11 h-11 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/30 border border-accent/40 hover:scale-105 transition-transform"
      >
        <DollarSign className="w-5 h-5 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent animate-pulse" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setOpen(false)}
                className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-lg z-10"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={bannerImage}
                alt="هيكل رواتب وأهداف وكالة نوفا"
                className="w-full h-auto rounded-2xl shadow-2xl border border-primary/30"
              />
              <p className="text-center text-[11px] text-muted-foreground mt-3 leading-relaxed">
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
