import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Crown, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import VipFrame from "@/components/VipFrame";
import { VIP_TIERS, getVipTier } from "@/lib/vipConfig";

export default function VipPreviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = Math.min(7, Math.max(1, Number(params.get("level")) || 1));
  const [level, setLevel] = useState(initial);
  const [profile, setProfile] = useState<any>(null);
  const [buying, setBuying] = useState(false);

  const tier = getVipTier(level)!;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("vip_level, coins, avatar_url, display_name")
        .eq("id", user.id)
        .single();
      setProfile(data);
    })();
  }, []);

  const next = () => setLevel((l) => (l >= 7 ? 1 : l + 1));
  const prev = () => setLevel((l) => (l <= 1 ? 7 : l - 1));

  const handleBuy = async () => {
    if ((profile?.coins || 0) < tier.price) {
      toast.error("رصيدك غير كافٍ");
      navigate("/top-up");
      return;
    }
    setBuying(true);
    const { error } = await supabase.rpc("purchase_vip" as any, { _level: tier.level });
    setBuying(false);
    if (error) return toast.error(error.message || "فشل الشراء");
    toast.success(`✨ تم تفعيل VIP ${tier.level}!`);
    navigate("/vip");
  };

  const isActive = profile?.vip_level === tier.level;

  return (
    <PageTransition>
      <div
        className="min-h-screen pb-24"
        style={{
          background: tier.aura + ", linear-gradient(180deg, hsl(260 35% 6%), hsl(280 40% 10%))",
          transition: "background 0.6s ease",
        }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/40 border-b border-border/20">
          <div className="px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center"
              aria-label="رجوع"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <h1 className="text-base font-black flex items-center gap-1.5">
              <Crown className="w-5 h-5" style={{ color: `hsl(${tier.glow})` }} />
              معاينة الإطارات
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <div className="px-4 pt-8 max-w-lg mx-auto">
          {/* Tier selector chips */}
          <div className="flex items-center justify-center gap-1.5 mb-6 flex-wrap">
            {VIP_TIERS.map((t) => (
              <button
                key={t.level}
                onClick={() => setLevel(t.level)}
                className={`px-3 py-1 rounded-full text-[11px] font-black border transition-all ${
                  level === t.level
                    ? "border-transparent text-foreground scale-105"
                    : "border-border/40 text-muted-foreground hover:border-border"
                }`}
                style={
                  level === t.level
                    ? { background: t.gradient, boxShadow: t.shadow }
                    : undefined
                }
              >
                VIP {t.level}
              </button>
            ))}
          </div>

          {/* Preview stage with prev/next */}
          <div className="relative flex items-center justify-center mb-6 select-none">
            <button
              onClick={prev}
              className="absolute right-0 z-10 w-11 h-11 rounded-full bg-background/60 backdrop-blur flex items-center justify-center border border-border/40 hover:scale-110 transition-transform active:scale-95"
              aria-label="السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={level}
                initial={{ opacity: 0, scale: 0.85, rotateY: -15 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.85, rotateY: 15 }}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-center"
                style={{ minHeight: 280 }}
              >
                <VipFrame level={tier.level} size={140}>
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/60 flex items-center justify-center text-3xl">
                      {tier.crest}
                    </div>
                  )}
                </VipFrame>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={next}
              className="absolute left-0 z-10 w-11 h-11 rounded-full bg-background/60 backdrop-blur flex items-center justify-center border border-border/40 hover:scale-110 transition-transform active:scale-95"
              aria-label="التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Tier info */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`info-${level}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-6"
            >
              <p className="text-[11px] font-bold tracking-widest text-foreground/60 mb-1">
                VIP {tier.level} · {tier.titleEn}
              </p>
              <h2
                className="text-2xl font-black mb-1"
                style={{
                  background: tier.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {tier.title}
              </h2>
              <p className="text-xs text-foreground/80">{tier.tagline}</p>
            </motion.div>
          </AnimatePresence>

          {/* Perks compact */}
          <div
            className="rounded-2xl p-4 mb-5 border"
            style={{
              background: "hsl(260 30% 12% / 0.55)",
              backdropFilter: "blur(10px)",
              borderColor: `hsl(${tier.primary} / 0.35)`,
            }}
          >
            <p className="text-[11px] font-black mb-2 flex items-center gap-1.5" style={{ color: `hsl(${tier.glow})` }}>
              <Sparkles className="w-3.5 h-3.5" /> أبرز المزايا
            </p>
            <ul className="space-y-1.5">
              {tier.perks.slice(0, 4).map((p, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span style={{ color: `hsl(${tier.glow})` }}>◆</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={handleBuy}
            disabled={buying || isActive}
            className="w-full py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2 text-foreground hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-60"
            style={{ background: tier.gradient, boxShadow: tier.shadow }}
          >
            {buying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isActive ? (
              <>✓ مفعّل حالياً</>
            ) : (
              <>
                <CurrencyIcon type="gold" size="xs" />
                {tier.price.toLocaleString()} — اشترِ {tier.title}
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground mt-3">
            تنقّل بين المستويات لمعاينة الإطار قبل الشراء
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
