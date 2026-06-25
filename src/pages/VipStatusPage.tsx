import { ArrowLeft, Check, Lock, Eye, EyeOff, ShieldCheck, Languages, Coins, Sparkles, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import VipBadge from "@/components/VipBadge";
import { getVipTier } from "@/lib/vipConfig";
import {
  activeVipLevel,
  vipRewardMultiplier,
  vipStoreDiscountPct,
  hasStealthVisits,
  isKickProtected,
  hasAutoTranslate,
} from "@/lib/vipBenefits";

interface PerkRow {
  key: string;
  icon: any;
  title: string;
  /** Live effect description (e.g. "+25% خصم"), not the marketing copy */
  effect: (lvl: number) => string;
  /** Returns true if perk is currently active for this user */
  active: (lvl: number) => boolean;
  /** Minimum VIP level the perk unlocks at */
  unlockLevel: number;
}

const PERKS: PerkRow[] = [
  {
    key: "visitors",
    icon: Eye,
    title: "كشف زوار البروفايل",
    effect: () => "ترى اسم وصورة كل من زار ملفك",
    active: (lvl) => lvl >= 1,
    unlockLevel: 1,
  },
  {
    key: "daily-reward",
    icon: Coins,
    title: "مضاعف المكافآت اليومية",
    effect: (lvl) => `+${Math.round((vipRewardMultiplier(lvl) - 1) * 100)}% على كل مطالبة يومية`,
    active: (lvl) => lvl >= 1,
    unlockLevel: 1,
  },
  {
    key: "stealth",
    icon: EyeOff,
    title: "وضع التخفي عند زيارة الملفات",
    effect: () => "لا تُسجَّل زياراتك عند الآخرين",
    active: (lvl) => hasStealthVisits(lvl),
    unlockLevel: 2,
  },
  {
    key: "store-discount",
    icon: Sparkles,
    title: "خصم متجر NOVA",
    effect: (lvl) => `${vipStoreDiscountPct(lvl)}% على الإطارات وعناصر المتجر`,
    active: (lvl) => vipStoreDiscountPct(lvl) > 0,
    unlockLevel: 5,
  },
  {
    key: "kick-protection",
    icon: ShieldCheck,
    title: "حماية من الطرد",
    effect: () => "لا يستطيع المشرفون طردك من الغرف أو المايك",
    active: (lvl) => isKickProtected(lvl),
    unlockLevel: 5,
  },
  {
    key: "auto-translate",
    icon: Languages,
    title: "ترجمة فورية تلقائية",
    effect: () => "تُفعَّل الترجمة تلقائياً فور دخولك أي غرفة",
    active: (lvl) => hasAutoTranslate(lvl),
    unlockLevel: 6,
  },
];

const VipStatusPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("vip_level, vip_expiry, displayed_vip_level, display_name")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
    </div>;
  }

  const level = activeVipLevel(profile);
  const tier = level > 0 ? getVipTier(level) : null;
  const expiry = profile?.vip_expiry ? new Date(profile.vip_expiry) : null;
  const activeCount = PERKS.filter((p) => p.active(level)).length;

  return (
    <PageTransition>
      <div className="min-h-screen pb-12">
        <header className="sticky top-0 z-10 bg-card/85 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)} aria-label="رجوع">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Crown className="w-5 h-5 text-amber-400" />
            <h1 className="font-black text-base">حالة مزايا VIP</h1>
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
          {/* Status card */}
          <section
            className="rounded-3xl p-5 border border-white/10 backdrop-blur-md"
            style={{
              background: tier
                ? `linear-gradient(135deg, hsl(${tier.primary} / 0.25), hsl(${tier.secondary} / 0.15))`
                : "linear-gradient(135deg, hsl(280 50% 20% / 0.5), hsl(260 40% 14% / 0.5))",
              boxShadow: tier ? tier.shadow : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مستواك الحالي</p>
                <div className="mt-1 flex items-center gap-2">
                  {level > 0 ? (
                    <VipBadge level={level} size="lg" showTitle />
                  ) : (
                    <span className="font-black text-lg text-muted-foreground">بدون VIP</span>
                  )}
                </div>
                {expiry && level > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    ينتهي: {expiry.toLocaleDateString("ar-EG", { dateStyle: "medium" })}
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-amber-300">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground">مميزة فعّالة</p>
              </div>
            </div>

            {level === 0 && (
              <button
                onClick={() => navigate("/vip")}
                className="mt-4 w-full py-2.5 rounded-full font-bold text-sm gradient-neon text-primary-foreground glow-neon"
              >
                ترقية إلى VIP الآن
              </button>
            )}
          </section>

          {/* Perks list */}
          <section className="space-y-2.5">
            {PERKS.map((p) => {
              const active = p.active(level);
              const Icon = p.icon;
              return (
                <div
                  key={p.key}
                  className={`rounded-2xl p-3.5 border flex items-center gap-3 transition-all ${
                    active
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-border/30 bg-secondary/30 opacity-70"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      active ? "bg-emerald-500/25 text-emerald-300" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{p.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold">
                        VIP {p.unlockLevel}+
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${active ? "text-emerald-200" : "text-muted-foreground"}`}>
                      {p.effect(level)}
                    </p>
                  </div>

                  {active ? (
                    <span className="flex items-center gap-1 text-emerald-300 text-[11px] font-black">
                      <Check className="w-4 h-4" /> فعّال
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground text-[11px] font-bold">
                      <Lock className="w-3.5 h-3.5" /> مقفول
                    </span>
                  )}
                </div>
              );
            })}
          </section>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            جميع المزايا مفعّلة على الخادم تلقائياً — لا تحتاج لأي إعداد.
          </p>
        </main>
      </div>
    </PageTransition>
  );
};

export default VipStatusPage;
