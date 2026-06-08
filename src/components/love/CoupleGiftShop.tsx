import { motion } from "framer-motion";
import { Sparkles, Lock } from "lucide-react";
import { COUPLE_GIFTS } from "@/lib/coupleGifts";
import CurrencyIcon from "@/components/CurrencyIcon";

interface Props {
  unlocked: boolean;
  onSend?: (giftKey: string) => void;
}

const CoupleGiftShop = ({ unlocked, onSend }: Props) => {
  return (
    <div
      className="rounded-3xl p-4 border-2 border-pink-400/30 backdrop-blur-md"
      style={{ background: "linear-gradient(135deg, hsl(330 70% 18% / 0.45), hsl(280 60% 12% / 0.45))" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-pink-300" />
        <h3 className="font-black text-foreground">متجر الحبيبين الحصري</h3>
        {!unlocked && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-bold flex items-center gap-1 ml-auto">
            <Lock className="w-3 h-3" /> Lv6+
          </span>
        )}
      </div>
      <p className="text-[10px] text-pink-200 mb-3">
        هدايا أسطورية ما تظهرش إلا للحبيبين فقط — كل هدية = نقاط حب ضخمة
      </p>

      <div className="grid grid-cols-2 gap-2">
        {COUPLE_GIFTS.map((g) => (
          <motion.button
            key={g.key}
            whileHover={unlocked ? { scale: 1.04 } : undefined}
            whileTap={unlocked ? { scale: 0.96 } : undefined}
            disabled={!unlocked}
            onClick={() => unlocked && onSend?.(g.key)}
            className={`relative rounded-2xl p-3 border text-center ${
              unlocked
                ? "border-pink-400/50 bg-gradient-to-br from-pink-500/15 to-purple-500/10"
                : "border-border/20 bg-background/30 opacity-60"
            }`}
          >
            {!unlocked && (
              <div className="absolute inset-0 rounded-2xl bg-background/40 backdrop-blur-[2px] flex items-center justify-center">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="relative h-16 mb-2 flex items-center justify-center">
              <img src={g.asset} alt={g.name} className="max-h-full max-w-full object-contain drop-shadow-[0_0_8px_hsl(330_95%_65%/0.5)]" />
            </div>
            <p className="text-xs font-black text-foreground">{g.emoji} {g.name}</p>
            <p className="text-[10px] text-pink-200 leading-snug min-h-[28px]">{g.tagline}</p>
            <div className="mt-1.5 flex items-center justify-center gap-1 text-[11px] font-black text-yellow-300">
              {g.price.toLocaleString()} <CurrencyIcon type="gold" size="xs" />
            </div>
            <p className="text-[9px] text-pink-300 font-bold">+{g.lovePoints.toLocaleString()} 💖</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default CoupleGiftShop;
