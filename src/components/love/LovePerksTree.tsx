import { motion } from "framer-motion";
import { Lock, Check, Sparkles } from "lucide-react";
import { LOVE_PERKS_DETAILED, LOVE_THRESHOLDS } from "@/lib/loveLevels";

interface Props {
  currentLevel: number;
  currentPoints: number;
}

const LovePerksTree = ({ currentLevel, currentPoints }: Props) => {
  return (
    <div className="rounded-3xl p-4 border-2 border-pink-400/30 backdrop-blur-md"
      style={{ background: "linear-gradient(180deg, hsl(330 70% 18% / 0.4), hsl(280 60% 12% / 0.4))" }}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-yellow-300" />
        <h3 className="font-black text-foreground">شجرة المميزات</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 font-bold">10 مستويات</span>
      </div>

      <div className="space-y-2">
        {LOVE_PERKS_DETAILED.map((perk) => {
          const threshold = LOVE_THRESHOLDS[perk.level - 1];
          const unlocked = currentLevel >= perk.level;
          const next = !unlocked && currentLevel + 1 === perk.level;
          return (
            <motion.div
              key={perk.level}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: perk.level * 0.03 }}
              className={`relative flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                unlocked
                  ? "border-pink-400/60 bg-gradient-to-r from-pink-500/15 to-purple-500/10"
                  : next
                  ? "border-yellow-400/50 bg-yellow-500/5 ring-1 ring-yellow-400/30"
                  : "border-border/20 bg-background/20"
              } ${perk.big ? "shadow-[0_0_18px_hsl(330_90%_60%/0.25)]" : ""}`}
            >
              {/* Level circle */}
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm ${
                    unlocked
                      ? "bg-gradient-to-br from-pink-400 to-purple-600 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                  style={unlocked ? { boxShadow: "0 0 12px hsl(330 90% 60% / 0.7)" } : undefined}
                >
                  {unlocked ? perk.emoji : <Lock className="w-4 h-4" />}
                </div>
                <div className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-background border border-border/40">
                  Lv{perk.level}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className={`text-sm font-black ${unlocked ? "text-pink-100" : "text-foreground"}`}>
                    {perk.title}
                  </p>
                  {perk.big && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/30 text-yellow-200 font-black">
                      LEGENDARY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  {perk.description}
                </p>
                <p className="text-[10px] mt-1 font-bold">
                  {unlocked ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> مفتوحة
                    </span>
                  ) : (
                    <span className="text-pink-200">
                      يتطلب {threshold.toLocaleString()} نقطة حب
                      {next && currentPoints > 0 && (
                        <span className="text-yellow-300 ml-1">
                          (متبقي {(threshold - currentPoints).toLocaleString()})
                        </span>
                      )}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LovePerksTree;
