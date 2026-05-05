import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Crown, Loader2, Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import VipFrame from "@/components/VipFrame";
import VipName from "@/components/VipName";
import { VIP_TIERS, getVipTier } from "@/lib/vipConfig";

export default function VipPreviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = Math.min(7, Math.max(1, Number(params.get("level")) || 1));
  const [level, setLevel] = useState(initial);
  const [profile, setProfile] = useState<any>(null);
  const [buying, setBuying] = useState(false);
  const [playingEntrance, setPlayingEntrance] = useState(false);

  const playEntrance = () => {
    setPlayingEntrance(false);
    // Force remount to replay
    requestAnimationFrame(() => setPlayingEntrance(true));
    setTimeout(() => setPlayingEntrance(false), 4200);
  };

  const tier = getVipTier(level)!;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("vip_level, vip_expiry, displayed_vip_level, coins, avatar_url, display_name")
        .eq("id", user.id)
        .single();
      setProfile(data);
      // Sync the previewed level with what the user has displayed (or owned)
      if (data) {
        const initialLvl = data.displayed_vip_level || data.vip_level || initial;
        if (initialLvl >= 1 && initialLvl <= 7) setLevel(initialLvl);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = () => setLevel((l) => (l >= 7 ? 1 : l + 1));
  const prev = () => setLevel((l) => (l <= 1 ? 7 : l - 1));

  // Auto-play entrance effect when wearing/switching VIP level
  useEffect(() => {
    setPlayingEntrance(false);
    const r = requestAnimationFrame(() => setPlayingEntrance(true));
    const t = setTimeout(() => setPlayingEntrance(false), 4200);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [level]);

  const ownedLevel = profile?.vip_level || 0;
  const displayedLevel = profile?.displayed_vip_level || ownedLevel;
  const isOwned = ownedLevel >= tier.level;
  const isCurrentlyDisplayed = displayedLevel === tier.level && isOwned;
  const isActive = ownedLevel === tier.level;
  const expiryDate = profile?.vip_expiry ? new Date(profile.vip_expiry) : null;
  const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : true;

  const handleEquip = async () => {
    if (!isOwned) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ displayed_vip_level: tier.level })
      .eq("id", user.id);
    if (error) return toast.error("تعذّر تبديل VIP");
    setProfile((p: any) => ({ ...p, displayed_vip_level: tier.level }));
    toast.success(`✨ تم ارتداء VIP ${tier.level}`);
  };

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
    toast.success(`✨ تم تفعيل VIP ${tier.level} لمدة 30 يوماً!`);
    // Reload profile in-place so UI reflects ownership instantly
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("vip_level, vip_expiry, displayed_vip_level, coins, avatar_url, display_name")
        .eq("id", user.id)
        .single();
      setProfile(data);
    }
  };

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
                className="relative flex items-center justify-center"
                style={{ minHeight: 280 }}
              >
                {/* Pulsing glow halo behind frame */}
                <motion.div
                  aria-hidden
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 240,
                    height: 240,
                    background: tier.aura,
                    filter: "blur(28px)",
                  }}
                />
                <VipFrame level={tier.level} size={220}>
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

                {/* Entrance effect overlay */}
                <AnimatePresence>
                  {playingEntrance && (
                    <motion.div
                      key={`entrance-${level}-${Date.now()}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                    >
                      {/* Sweep streak */}
                      <motion.div
                        initial={{ x: "-120%", opacity: 0 }}
                        animate={{ x: "120%", opacity: [0, 1, 0] }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-y-0 w-1/3"
                        style={{
                          background: `linear-gradient(90deg, transparent, hsl(${tier.glow} / 0.7), transparent)`,
                          filter: "blur(8px)",
                        }}
                      />
                      {/* Burst rings */}
                      {[0, 0.3, 0.6].map((d) => (
                        <motion.div
                          key={d}
                          initial={{ scale: 0.4, opacity: 0.9 }}
                          animate={{ scale: 2.4, opacity: 0 }}
                          transition={{ duration: 1.6, delay: d, ease: "easeOut" }}
                          className="absolute rounded-full border-2"
                          style={{
                            width: 180,
                            height: 180,
                            borderColor: `hsl(${tier.glow})`,
                            boxShadow: `0 0 40px hsl(${tier.glow} / 0.7)`,
                          }}
                        />
                      ))}
                      {/* Banner */}
                      <motion.div
                        initial={{ y: 120, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-2 px-5 py-2 rounded-full backdrop-blur-md text-xs font-black flex items-center gap-2"
                        style={{
                          background: tier.gradient,
                          boxShadow: tier.shadow,
                          color: "white",
                        }}
                      >
                        <span>{tier.crest}</span>
                        <span>{profile?.display_name || "أنت"} • {tier.title}</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

          {/* Play entrance effect button */}
          <div className="flex justify-center mb-5">
            <button
              onClick={playEntrance}
              disabled={playingEntrance}
              className="px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-2 backdrop-blur border border-foreground/20 hover:scale-105 active:scale-95 transition-transform disabled:opacity-60"
              style={{
                background: tier.gradient,
                boxShadow: tier.shadow,
                color: "white",
              }}
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              {playingEntrance ? "جارٍ العرض…" : "تشغيل تأثير الدخول"}
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
              <div className="mb-2 flex justify-center">
                <VipName
                  name={profile?.display_name || "اسمك هنا"}
                  level={tier.level}
                  size="lg"
                />
              </div>
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
