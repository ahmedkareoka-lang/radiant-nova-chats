import { Crown, Sparkles, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { NOVA_ASSETS, getNovaAsset, getNovaProgress } from "@/lib/novaAssets";
import CurrencyIcon from "./CurrencyIcon";

interface NovaDashboardProps {
  totalGold: number;
  level: number;
  expiry: string | null;
}

export default function NovaDashboard({ totalGold, level, expiry }: NovaDashboardProps) {
  const progress = getNovaProgress(totalGold);
  const current = getNovaAsset(level);
  const daysLeft = expiry
    ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-card/40 backdrop-blur-xl p-5 space-y-5">
      {/* Glow background */}
      {current && (
        <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient} opacity-50 pointer-events-none`} />
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-accent" />
          <h3 className="font-black text-base">👑 NOVA P SYSTEM</h3>
        </div>
        {level > 0 && (
          <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${current?.gradient} border border-white/20 text-xs font-bold`}>
            {current?.label} نشط
          </div>
        )}
      </div>

      {/* Levels grid */}
      <div className="relative grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((lvl) => {
          const asset = NOVA_ASSETS.byLevel[lvl];
          const isCurrent = level === lvl;
          const isUnlocked = level >= lvl;
          const threshold = NOVA_ASSETS.thresholds[lvl - 1];
          return (
            <motion.div
              key={lvl}
              whileHover={{ scale: 1.05 }}
              className={`p-2 rounded-2xl border text-center transition-all ${
                isCurrent
                  ? `bg-gradient-to-br ${asset.gradient} border-white/40 ${asset.borderGlow}`
                  : isUnlocked
                  ? "bg-secondary/40 border-border/40"
                  : "bg-secondary/20 border-border/20 opacity-50"
              }`}
            >
              <div className="aspect-square w-full mb-1 flex items-center justify-center">
                <img src={asset.frame} alt={asset.label} className="w-full h-full object-contain" />
              </div>
              <p className={`text-[10px] font-black ${isCurrent ? "text-white" : "text-muted-foreground"}`}>
                P{lvl}
              </p>
              <p className="text-[8px] text-muted-foreground">
                {(threshold / 1000).toFixed(0)}K
              </p>
              {isCurrent && (
                <span className="text-[7px] font-bold text-accent block mt-0.5">CURRENT</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress to next */}
      {progress.nextLevel && progress.nextThreshold && (
        <div className="relative space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">التقدّم نحو P{progress.nextLevel}</span>
            <span className="font-bold text-accent">
              {totalGold.toLocaleString()} / {progress.nextThreshold.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-accent via-primary to-accent rounded-full"
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="relative grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-3 bg-background/40 border border-white/10 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Sparkles className="w-3 h-3" />
            الذهب الكلي
          </div>
          <div className="flex items-center gap-1.5">
            <CurrencyIcon type="gold" size="sm" />
            <span className="font-black text-sm">{totalGold.toLocaleString()}</span>
          </div>
        </div>
        <div className="rounded-2xl p-3 bg-background/40 border border-white/10 backdrop-blur">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
            <Clock className="w-3 h-3" />
            تاريخ الانتهاء
          </div>
          <div className="font-black text-sm">
            {expiry ? (
              <span className={daysLeft <= 7 ? "text-destructive" : "text-foreground"}>
                {daysLeft} يوم
              </span>
            ) : (
              <span className="text-muted-foreground">غير نشط</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
