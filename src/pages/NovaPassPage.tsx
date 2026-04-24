import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Check, Gift, Sparkles, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";

// 30-level monthly battle pass — free + premium tracks
const PASS_PRICE = 5000;

const REWARDS = Array.from({ length: 30 }, (_, i) => {
  const lvl = i + 1;
  const isMilestone = lvl % 5 === 0;
  const isMega = lvl % 10 === 0;
  return {
    level: lvl,
    free: isMilestone
      ? { type: "coins", amount: 200 * lvl, iconType: "coin", label: `${200 * lvl} عملة` }
      : { type: "coins", amount: 50 * lvl, iconType: "coin", label: `${50 * lvl} عملة` },
    premium: isMega
      ? { type: "frame", amount: 1, icon: "👑", label: "إطار حصري شهري" }
      : isMilestone
        ? { type: "diamonds", amount: 100 * lvl, icon: "💎", label: `${100 * lvl} ماسة` }
        : { type: "coins", amount: 200 * lvl, iconType: "coin", label: `${200 * lvl} عملة` },
  };
});

export default function NovaPassPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [hasPremium, setHasPremium] = useState(false);
  // For now: derive level from charisma_xp / 1000 (placeholder formula)
  const passLevel = Math.min(30, Math.floor((profile?.charisma_xp || 0) / 1500));
  const xpToNext = 1500 - ((profile?.charisma_xp || 0) % 1500);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [p, inv] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("inventory").select("*").eq("user_id", user.id).eq("item_type", "nova_pass_premium"),
    ]);
    setProfile(p.data);
    setHasPremium((inv.data?.length || 0) > 0);
  };

  useEffect(() => { fetchData(); }, []);

  const buyPremium = async () => {
    if (!profile) return;
    if ((profile.coins || 0) < PASS_PRICE) {
      toast.error("رصيد غير كافٍ");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.rpc("deduct_coins", { _user_id: user.id, _amount: PASS_PRICE });
    if (error) { toast.error("فشلت العملية"); return; }
    await supabase.from("inventory").insert({
      user_id: user.id,
      item_type: "nova_pass_premium",
      item_name: `NOVA Pass ${new Date().toISOString().slice(0, 7)}`,
      item_data: { month: new Date().toISOString().slice(0, 7) },
    });
    toast.success("تم تفعيل NOVA Pass Premium 🎉");
    fetchData();
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, hsl(260 35% 8%), hsl(280 30% 10%))" }}>
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/30">
          <div className="px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </button>
            <h1 className="text-base font-black flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-accent" />
              NOVA Pass
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="px-4 pt-4 max-w-lg mx-auto">
          {/* Level + Progress */}
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl p-4 mb-4 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(280 60% 25%), hsl(320 70% 30%))" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-foreground/70">المستوى الحالي</p>
                <p className="text-3xl font-black text-foreground">{passLevel}<span className="text-sm text-foreground/60">/30</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-foreground/70">للمستوى التالي</p>
                <p className="text-base font-bold text-accent">{xpToNext} XP</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-background/40 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((1500 - xpToNext) / 1500) * 100}%` }}
                className="h-full bg-gradient-to-r from-accent to-yellow-300"
              />
            </div>
          </motion.div>

          {/* Premium CTA */}
          {!hasPremium && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={buyPremium}
              className="w-full mb-4 rounded-2xl p-4 text-right relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, hsl(45 90% 30%), hsl(35 100% 45%))" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-foreground flex items-center gap-1.5">
                    <Crown className="w-4 h-4" /> فعّل المسار المميز
                  </p>
                  <p className="text-[10px] text-foreground/80 mt-0.5">احصل على إطارات وماسات حصرية كل شهر</p>
                </div>
                <div className="flex items-center gap-1 bg-background/30 rounded-full px-3 py-1.5">
                  <CurrencyIcon type="gold" size="xs" />
                  <span className="text-sm font-black text-foreground">{PASS_PRICE.toLocaleString()}</span>
                </div>
              </div>
            </motion.button>
          )}

          {/* Tracks header */}
          <div className="grid grid-cols-[60px_1fr_1fr] gap-2 px-2 mb-2">
            <div className="text-[10px] font-bold text-muted-foreground text-center">المستوى</div>
            <div className="text-[10px] font-bold text-muted-foreground text-center">مجاني</div>
            <div className="text-[10px] font-bold text-accent text-center flex items-center justify-center gap-1">
              <Crown className="w-3 h-3" /> مميز
            </div>
          </div>

          {/* Reward rows */}
          <div className="space-y-1.5">
            {REWARDS.map((row) => {
              const claimed = passLevel >= row.level;
              return (
                <motion.div
                  key={row.level}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: row.level * 0.015 }}
                  className={`grid grid-cols-[60px_1fr_1fr] gap-2 items-center rounded-xl p-2 ${
                    claimed ? "bg-accent/10 border border-accent/30" : "bg-secondary/30 border border-border/20"
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                      claimed ? "gradient-gold text-accent-foreground" : "bg-secondary text-muted-foreground"
                    }`}>
                      {row.level}
                    </div>
                  </div>
                  <RewardCell reward={row.free} unlocked={claimed} />
                  <RewardCell reward={row.premium} unlocked={claimed && hasPremium} locked={!hasPremium} premium />
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4 px-4">
            * يعاد تعيين NOVA Pass في بداية كل شهر — أكمل المهام اليومية لكسب XP
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function RewardCell({ reward, unlocked, locked, premium }: { reward: any; unlocked: boolean; locked?: boolean; premium?: boolean }) {
  return (
    <div className={`relative rounded-lg p-2 text-center ${
      unlocked
        ? premium
          ? "bg-gradient-to-br from-accent/20 to-yellow-500/10 border border-accent/40"
          : "bg-primary/10 border border-primary/30"
        : "bg-background/30 border border-border/20"
    }`}>
      <div className="mb-0.5 flex items-center justify-center h-6">
        {reward.iconType === "coin" ? (
          <CurrencyIcon type="gold" size="md" />
        ) : (
          <span className="text-xl">{reward.icon}</span>
        )}
      </div>
      <div className="text-[9px] text-muted-foreground truncate">{reward.label}</div>
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
      {unlocked && !locked && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-accent-foreground" />
        </div>
      )}
    </div>
  );
}
