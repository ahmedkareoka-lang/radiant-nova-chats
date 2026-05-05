import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Check, Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import VipFrame from "@/components/VipFrame";
import { VIP_TIERS, getVipTier } from "@/lib/vipConfig";

export default function VipPrivilegePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [buying, setBuying] = useState<number | null>(null);

  const reload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("vip_level, vip_expiry, coins, avatar_url, display_name")
      .eq("id", user.id)
      .single();
    setProfile(data);
  };

  useEffect(() => { reload(); }, []);

  const handleBuy = async (level: number, price: number) => {
    if ((profile?.coins || 0) < price) {
      toast.error("رصيدك غير كافٍ — اشحن المزيد من النوفا كوين");
      navigate("/top-up");
      return;
    }
    if ((profile?.vip_level || 0) === level && profile?.vip_expiry && new Date(profile.vip_expiry).getTime() > Date.now()) {
      toast.error("VIP هذا مفعّل لديك — انتظر انتهاء الـ 30 يوماً قبل التجديد");
      return;
    }
    setBuying(level);
    const { error } = await supabase.rpc("purchase_vip" as any, { _level: level });
    setBuying(null);
    if (error) {
      toast.error(error.message || "فشل الشراء");
      return;
    }
    toast.success(`✨ تم تفعيل VIP ${level} لمدة 30 يوماً!`);
    await reload();
  };

  const currentLevel = profile?.vip_level || 0;
  const currentTier = getVipTier(currentLevel);

  return (
    <PageTransition>
      <div
        className="min-h-screen pb-24"
        style={{ background: "linear-gradient(180deg, hsl(260 35% 8%), hsl(280 40% 12%))" }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/30">
          <div className="px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <h1 className="text-base font-black flex items-center gap-1.5">
              <Crown className="w-5 h-5 text-accent" />
              مركز VIP الأسطوري
            </h1>
            <div className="w-9" />
          </div>
        </header>

        {/* Hero */}
        <div className="px-4 pt-6 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative rounded-3xl overflow-hidden p-6 mb-6 flex flex-col items-center"
            style={{
              background: currentTier
                ? currentTier.aura + ", linear-gradient(135deg, hsl(260 40% 12%), hsl(280 50% 18%))"
                : "linear-gradient(135deg, hsl(260 40% 12%), hsl(280 50% 18%))",
            }}
          >
            <div className="my-4">
              <VipFrame level={currentLevel || 1} size={96}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary/60 flex items-center justify-center text-2xl">
                    {currentTier?.crest || "👑"}
                  </div>
                )}
              </VipFrame>
            </div>
            <h2 className="text-xl font-black text-foreground mb-1 mt-4">
              {currentTier ? currentTier.title : "اشترك في VIP"}
            </h2>
            <p className="text-xs text-foreground/80 text-center max-w-xs">
              {currentTier?.tagline ||
                "افتح مزايا أسطورية: إطارات نارية، أجنحة متحركة، وتأثيرات دخول عالمية"}
            </p>
            {currentLevel > 0 && profile?.vip_expiry && (
              <p className="text-[10px] text-muted-foreground mt-2">
                ينتهي في {new Date(profile.vip_expiry).toLocaleDateString("ar-EG")}
              </p>
            )}
            <button
              onClick={() => navigate(`/vip/preview?level=${currentLevel || 1}`)}
              className="mt-4 px-5 py-2 rounded-full text-xs font-black bg-background/40 backdrop-blur border border-foreground/20 hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              معاينة جميع الإطارات
            </button>
          </motion.div>

          {/* Tiers */}
          <div className="space-y-4">
            {VIP_TIERS.map((tier, idx) => {
              const isActive = currentLevel === tier.level;
              const isBuying = buying === tier.level;
              const isExpired = profile?.vip_expiry ? new Date(profile.vip_expiry).getTime() < Date.now() : true;
              const blockedRenew = isActive && !isExpired;

              return (
                <motion.div
                  key={tier.level}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`relative rounded-2xl overflow-hidden border-2 ${
                    isActive ? "border-accent" : "border-border/30"
                  }`}
                  style={{
                    background: "hsl(260 30% 12% / 0.6)",
                    backdropFilter: "blur(12px)",
                    boxShadow: isActive ? tier.shadow : undefined,
                  }}
                >
                  <div className="px-4 py-4 flex items-center justify-between gap-3" style={{ background: tier.gradient }}>
                    <div className="flex items-center gap-3">
                      <VipFrame level={tier.level} size={56}>
                        <div className="w-full h-full bg-background/20 flex items-center justify-center text-xl">
                          {tier.crest}
                        </div>
                      </VipFrame>
                      <div>
                        <p className="text-sm font-black text-foreground leading-tight">
                          VIP {tier.level} — {tier.title}
                        </p>
                        <p className="text-[10px] text-foreground/80 mt-0.5">{tier.tagline}</p>
                        <p className="text-[9px] text-foreground/60 mt-0.5 italic">{tier.titleEn}</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-background/40 text-[9px] font-black flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3" /> نشط
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <ul className="space-y-1.5 mb-3">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: `hsl(${tier.glow})` }} />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isBuying || blockedRenew}
                      onClick={() => navigate(`/vip/preview?level=${tier.level}`)}
                      className="w-full py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-1.5 transition-all text-foreground hover:scale-[1.02] active:scale-95 disabled:opacity-60"
                      style={{ background: tier.gradient, boxShadow: tier.shadow }}
                    >
                      {isBuying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : blockedRenew ? (
                        <>✓ مفعّل — ينتهي {new Date(profile!.vip_expiry).toLocaleDateString("ar-EG")}</>
                      ) : (
                        <>
                          <CurrencyIcon type="gold" size="xs" />
                          {tier.price.toLocaleString()} — معاينة وشراء (30 يوم)
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4 px-4">
            * كل اشتراك VIP يدوم 30 يوماً فقط ولا يمكن تجديده قبل انتهاء صلاحيته. يمكنك ارتداء أي VIP تملكه من صفحة المعاينة.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
