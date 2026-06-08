import { motion } from "framer-motion";
import { Target, Check } from "lucide-react";
import { useLoveQuests } from "@/hooks/useLoveQuests";
import { toast } from "sonner";

interface Props {
  coupleId: string;
}

const LoveQuestsCard = ({ coupleId }: Props) => {
  const { quests, loading, claim, meta } = useLoveQuests(coupleId);

  const metaByKey = Object.fromEntries(meta.map((m) => [m.key, m]));

  const handleClaim = async (qid: string) => {
    const { data, error } = await claim(qid);
    if (error || (data as any)?.ok === false) {
      toast.error("لم نتمكن من استلام المكافأة");
      return;
    }
    toast.success(`✨ +${(data as any)?.reward ?? 0} نقطة حب!`);
  };

  return (
    <div
      className="rounded-3xl p-4 border-2 border-purple-400/30 backdrop-blur-md"
      style={{ background: "linear-gradient(135deg, hsl(280 70% 20% / 0.5), hsl(330 60% 15% / 0.5))" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-yellow-300" />
        <h3 className="font-black text-foreground">مهام اليوم المشتركة</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-200 font-bold ml-auto">
          نقاط حب مضاعفة
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-6">جاري التحميل…</p>
      ) : (
        <div className="space-y-2">
          {quests.map((q) => {
            const m = metaByKey[q.quest_key];
            const pct = Math.min(100, (q.progress / q.target) * 100);
            const ready = q.progress >= q.target && !q.claimed;
            return (
              <motion.div
                key={q.id}
                layout
                className="rounded-2xl p-3 border border-purple-400/20 bg-background/30"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-base">{m?.emoji ?? "✨"}</span>
                    {m?.label ?? q.quest_key}
                  </p>
                  <span className="text-[10px] font-black text-yellow-300">
                    +{q.reward_points.toLocaleString()} 💖
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-background/40 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, hsl(280 90% 60%), hsl(330 95% 65%))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    {q.progress} / {q.target}
                  </span>
                  {q.claimed ? (
                    <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> تم
                    </span>
                  ) : ready ? (
                    <button
                      onClick={() => handleClaim(q.id)}
                      className="text-[10px] px-3 py-1 rounded-full font-black text-white"
                      style={{ background: "linear-gradient(135deg, hsl(330 95% 60%), hsl(280 95% 60%))" }}
                    >
                      استلم 🎁
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">قيد التقدم…</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-center text-purple-200 mt-3">
        💡 المهام تتجدد كل يوم — أكملوها معاً للحصول على نقاط ضخمة
      </p>
    </div>
  );
};

export default LoveQuestsCard;
