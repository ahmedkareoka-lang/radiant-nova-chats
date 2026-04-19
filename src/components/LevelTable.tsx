import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Crown, Sparkles } from "lucide-react";
import TierBadge from "./TierBadge";

const wealthThreshold = (lvl: number) => {
  if (lvl < 10) return 100_000;
  if (lvl < 20) return 250_000;
  if (lvl < 30) return 600_000;
  if (lvl < 40) return 1_500_000;
  if (lvl < 50) return 3_500_000;
  if (lvl < 60) return 7_000_000;
  if (lvl < 70) return 14_000_000;
  if (lvl < 80) return 28_000_000;
  if (lvl < 90) return 55_000_000;
  return 120_000_000;
};
const charmThreshold = (lvl: number) => {
  if (lvl < 10) return 60_000;
  if (lvl < 20) return 160_000;
  if (lvl < 30) return 400_000;
  if (lvl < 40) return 1_000_000;
  if (lvl < 50) return 2_500_000;
  if (lvl < 60) return 5_000_000;
  if (lvl < 70) return 10_000_000;
  if (lvl < 80) return 20_000_000;
  if (lvl < 90) return 40_000_000;
  return 90_000_000;
};

const fmt = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
};

export default function LevelTable({ currentWealth = 1, currentCharm = 1 }: { currentWealth?: number; currentCharm?: number }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"wealth" | "charm">("wealth");

  const thresholdFn = type === "wealth" ? wealthThreshold : charmThreshold;
  const currentLvl = type === "wealth" ? currentWealth : currentCharm;
  const Icon = type === "wealth" ? Crown : Sparkles;

  return (
    <div className="mt-4 rounded-2xl border border-border/30 bg-secondary/30 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="font-bold text-sm">جدول المستويات (1-100)</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {/* Type switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-background/40">
                <button
                  onClick={() => setType("wealth")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition ${type === "wealth" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                >
                  💰 الثروة
                </button>
                <button
                  onClick={() => setType("charm")}
                  className={`py-1.5 rounded-lg text-[11px] font-bold transition ${type === "charm" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  ✨ الكاريزما
                </button>
              </div>

              {/* Levels grid */}
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border/20 divide-y divide-border/10">
                {Array.from({ length: 100 }, (_, i) => i + 1).map(lvl => {
                  const need = thresholdFn(lvl);
                  const isCurrent = lvl === currentLvl;
                  const reached = lvl <= currentLvl;
                  return (
                    <div
                      key={lvl}
                      className={`flex items-center justify-between px-3 py-2 ${isCurrent ? "bg-primary/15" : reached ? "bg-secondary/10" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[11px] font-bold w-8 ${isCurrent ? "text-primary" : reached ? "text-foreground" : "text-muted-foreground/60"}`}>
                          Lv {lvl}
                        </span>
                        <TierBadge level={lvl} type={type} size="sm" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {fmt(need)} XP
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                XP المطلوبة لكل مستوى — مستواك الحالي مُمَيَّز
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
