import { motion } from "framer-motion";
import { Gift, Heart, Cake } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Props {
  level: number;
  weeklyClaimedAt: string | null;
  monthlyClaimedAt: string | null;
  dailyHeartsCount: number;
  dailyHeartsDate: string | null;
  onChanged: () => void;
}

const LoveRewardsPanel = ({ level, weeklyClaimedAt, monthlyClaimedAt, dailyHeartsCount, dailyHeartsDate, onChanged }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const heartsUsedToday = dailyHeartsDate === today ? dailyHeartsCount : 0;
  const heartsLeft = Math.max(0, 3 - heartsUsedToday);

  const weeklyReady = level >= 4 && (!weeklyClaimedAt || (Date.now() - new Date(weeklyClaimedAt).getTime()) > 7 * 86400000);
  const monthlyReady = level >= 8 && (!monthlyClaimedAt || (Date.now() - new Date(monthlyClaimedAt).getTime()) > 30 * 86400000);

  const callRpc = async (name: string, label: string, key: string) => {
    setBusy(key);
    const { data, error } = await supabase.rpc(name as any);
    setBusy(null);
    if (error || (data as any)?.ok === false) {
      const r = (data as any)?.reason;
      toast.error(r === "level_too_low" ? "المستوى غير كافي" :
                  r === "already_claimed" ? "تم الاستلام مسبقاً" :
                  r === "limit" ? "وصلت الحد اليومي" : "فشل");
      return;
    }
    toast.success(`✨ ${label} تم!`);
    onChanged();
  };

  return (
    <div
      className="rounded-3xl p-4 border-2 border-pink-400/30 backdrop-blur-md"
      style={{ background: "linear-gradient(135deg, hsl(330 70% 18% / 0.45), hsl(45 60% 18% / 0.4))" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-pink-300" />
        <h3 className="font-black text-foreground">مكافآت الحب</h3>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {/* Daily hearts — Lv3+ */}
        <RewardRow
          icon={<Heart className="w-5 h-5 text-pink-400 fill-pink-400" />}
          title="رسالة قلب يومية"
          subtitle={level < 3 ? "تفتح في المستوى 3" : `${heartsLeft}/3 قلوب متبقية اليوم · +500 نقطة لكل قلب`}
          available={level >= 3 && heartsLeft > 0}
          locked={level < 3}
          busy={busy === "heart"}
          cta="أرسل قلب 💌"
          onClick={() => callRpc("send_love_heart", "وصل القلب لحبيبك", "heart")}
        />
        {/* Weekly — Lv4+ */}
        <RewardRow
          icon={<Gift className="w-5 h-5 text-yellow-300" />}
          title="ذكرى أسبوعية"
          subtitle={
            level < 4 ? "تفتح في المستوى 4" :
            weeklyReady ? "2000 كوينز لكل واحد + 1500 نقطة حب" :
            `متاحة ${formatDistanceToNow(new Date(new Date(weeklyClaimedAt!).getTime() + 7 * 86400000), { addSuffix: true, locale: ar })}`
          }
          available={weeklyReady}
          locked={level < 4}
          busy={busy === "weekly"}
          cta="استلم 🎁"
          onClick={() => callRpc("claim_weekly_couple_gift", "ذكرى الأسبوع", "weekly")}
        />
        {/* Monthly — Lv8+ */}
        <RewardRow
          icon={<Cake className="w-5 h-5 text-yellow-400" />}
          title="ذكرى ارتباط شهرية"
          subtitle={
            level < 8 ? "تفتح في المستوى 8" :
            monthlyReady ? "5000 كوينز لكل واحد + 5000 نقطة حب" :
            `متاحة ${formatDistanceToNow(new Date(new Date(monthlyClaimedAt!).getTime() + 30 * 86400000), { addSuffix: true, locale: ar })}`
          }
          available={monthlyReady}
          locked={level < 8}
          busy={busy === "monthly"}
          cta="احتفل 🎂"
          onClick={() => callRpc("claim_monthly_anniversary", "ذكرى الشهر", "monthly")}
        />
      </div>
    </div>
  );
};

interface RowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  available: boolean;
  locked: boolean;
  busy: boolean;
  cta: string;
  onClick: () => void;
}

const RewardRow = ({ icon, title, subtitle, available, locked, busy, cta, onClick }: RowProps) => (
  <motion.div
    layout
    className={`flex items-center gap-3 p-3 rounded-2xl border ${
      available
        ? "border-pink-400/50 bg-gradient-to-r from-pink-500/15 to-yellow-500/10"
        : "border-border/20 bg-background/25"
    } ${locked ? "opacity-60" : ""}`}
  >
    <div className="w-10 h-10 rounded-full bg-background/40 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-black text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground leading-snug">{subtitle}</p>
    </div>
    <button
      disabled={!available || busy}
      onClick={onClick}
      className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full font-black ${
        available
          ? "text-white"
          : "bg-secondary text-muted-foreground"
      }`}
      style={available ? { background: "linear-gradient(135deg, hsl(330 95% 60%), hsl(280 95% 60%))" } : undefined}
    >
      {busy ? "..." : available ? cta : locked ? "🔒" : "غير متاح"}
    </button>
  </motion.div>
);

export default LoveRewardsPanel;
