import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, HelpCircle, Trophy, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import { NOVA_ASSETS, getNovaAsset, getNovaProgress } from "@/lib/novaAssets";
import { FRAME_MAP } from "@/lib/frameConfig";

const TIERS = [1, 2, 3, 4, 5, 6] as const;

const TIER_THEMES: Record<number, { from: string; to: string; ring: string; text: string; badgeBg: string }> = {
  1: { from: "from-emerald-700/40", to: "to-emerald-900/30", ring: "ring-emerald-400/40", text: "text-emerald-300", badgeBg: "from-emerald-500 to-green-700" },
  2: { from: "from-emerald-600/40", to: "to-teal-900/30", ring: "ring-emerald-300/50", text: "text-emerald-200", badgeBg: "from-emerald-500 to-emerald-700" },
  3: { from: "from-cyan-600/40", to: "to-teal-900/40", ring: "ring-cyan-300/50", text: "text-cyan-200", badgeBg: "from-cyan-500 to-teal-700" },
  4: { from: "from-blue-600/40", to: "to-indigo-900/40", ring: "ring-blue-300/60", text: "text-blue-200", badgeBg: "from-blue-500 to-indigo-700" },
  5: { from: "from-purple-600/50", to: "to-fuchsia-900/40", ring: "ring-purple-300/60", text: "text-purple-200", badgeBg: "from-purple-500 to-fuchsia-700" },
  6: { from: "from-amber-500/50", to: "to-red-900/50", ring: "ring-amber-300/70", text: "text-amber-200", badgeBg: "from-amber-500 to-red-700" },
};

const PERKS_BY_TIER: Record<number, { title: string; visual: "frame" | "badge" | "bubble" | "id" | "vehicle" | "card" | "throne" | "gift-tray" | "entrance" | "banner" | "nickname"; }[]> = {
  1: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
  ],
  2: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
    { title: "المركبة الحصرية", visual: "vehicle" },
    { title: "بطاقة الملف الشخصي الحصرية", visual: "card" },
  ],
  3: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
    { title: "المركبة الحصرية", visual: "vehicle" },
    { title: "بطاقة الملف الشخصي الحصرية", visual: "card" },
    { title: "إخفاء عدد أيام تسجيل الدخول", visual: "throne" },
    { title: "صينية الهدايا الحصرية", visual: "gift-tray" },
  ],
  4: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
    { title: "المركبة الحصرية", visual: "vehicle" },
    { title: "بطاقة الملف الشخصي الحصرية", visual: "card" },
    { title: "شاشة رئيسية محلقة", visual: "throne" },
    { title: "صينية الهدايا الحصرية", visual: "gift-tray" },
    { title: "تأثيرات دخول الملف الشخصي", visual: "entrance" },
    { title: "إشعار على مستوى السيرفر", visual: "banner" },
  ],
  5: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
    { title: "المركبة الحصرية", visual: "vehicle" },
    { title: "بطاقة الملف الشخصي الحصرية", visual: "card" },
    { title: "شاشة رئيسية محلقة", visual: "throne" },
    { title: "صينية الهدايا الحصرية", visual: "gift-tray" },
    { title: "تأثيرات دخول الملف الشخصي", visual: "entrance" },
    { title: "إشعار على مستوى السيرفر", visual: "banner" },
    { title: "تعليقات الشاشة على كامل السيرفر", visual: "nickname" },
    { title: "الاسم المستعار المتحرك", visual: "nickname" },
  ],
  6: [
    { title: "إطار الصورة الرمزية الحصري", visual: "frame" },
    { title: "شارة حصرية", visual: "badge" },
    { title: "فقاعة دردشة حصرية", visual: "bubble" },
    { title: "علامة هوية حصرية", visual: "id" },
    { title: "المركبة الحصرية", visual: "vehicle" },
    { title: "بطاقة الملف الشخصي الحصرية", visual: "card" },
    { title: "شاشة رئيسية محلقة", visual: "throne" },
    { title: "صينية الهدايا الحصرية", visual: "gift-tray" },
    { title: "تأثيرات دخول الملف الشخصي", visual: "entrance" },
    { title: "إشعار على مستوى السيرفر", visual: "banner" },
    { title: "تعليقات الشاشة على كامل السيرفر", visual: "nickname" },
    { title: "الاسم المستعار المتحرك", visual: "nickname" },
  ],
};

const FRAME_KEY_BY_LEVEL: Record<number, string> = {
  1: "frame-purple-wings",
  2: "frame-royal-crown",
  3: "frame-ice",
  4: "frame-fire",
  5: "frame-rainbow",
  6: "frame-dragon",
};

function PerkCard({
  visual,
  title,
  level,
  asset,
  avatarUrl,
}: {
  visual: string;
  title: string;
  level: number;
  asset: ReturnType<typeof getNovaAsset>;
  avatarUrl?: string | null;
}) {
  const theme = TIER_THEMES[level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-secondary/30 border border-border/30 p-4 flex flex-col items-center justify-center gap-3 aspect-square"
    >
      <div className="flex-1 flex items-center justify-center w-full">
        {visual === "frame" && asset && (
          <div className="relative w-20 h-20">
            <img src={asset.frame} alt={asset.label} className="absolute inset-0 w-full h-full object-contain z-10" />
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-secondary" />
            )}
          </div>
        )}
        {visual === "badge" && asset && (
          <img src={asset.frame} alt={asset.label} className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" />
        )}
        {visual === "bubble" && (
          <div className={`px-5 py-2 rounded-2xl bg-gradient-to-br ${theme.badgeBg} border-2 border-white/40 shadow-xl`}>
            <span className="text-white font-black text-sm">Hello</span>
          </div>
        )}
        {visual === "id" && (
          <div className={`px-5 py-1.5 rounded-full bg-gradient-to-r ${theme.badgeBg} border-2 border-white/30 shadow-xl flex items-center gap-2`}>
            {asset && <img src={asset.frame} alt="" className="w-5 h-5 object-contain" />}
            <span className="text-white font-black text-base">P{level}</span>
          </div>
        )}
        {visual === "vehicle" && (
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-3xl shadow-inner`}>
            🚗
          </div>
        )}
        {visual === "card" && (
          <div className={`w-20 h-12 rounded-lg bg-gradient-to-br ${theme.from} ${theme.to} border ${theme.ring} ring-1 flex items-center justify-center`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20" />
            )}
          </div>
        )}
        {visual === "throne" && (
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-2xl shadow-inner`}>
            👑
          </div>
        )}
        {visual === "gift-tray" && (
          <div className={`w-20 h-10 rounded-full bg-gradient-to-r ${theme.badgeBg} flex items-center justify-around px-2 shadow-xl`}>
            <div className="w-5 h-5 rounded-full bg-white/40" />
            <div className="w-5 h-5 rounded-full bg-white/40" />
            <span className="text-white font-black text-xs">x1</span>
          </div>
        )}
        {visual === "entrance" && (
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.from} ${theme.to} flex items-center justify-center text-3xl shadow-inner`}>
            ✨
          </div>
        )}
        {visual === "banner" && (
          <div className={`w-24 h-6 rounded-full bg-gradient-to-r ${theme.badgeBg} shadow-xl flex items-center justify-center`}>
            {avatarUrl && <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full -ml-10" />}
          </div>
        )}
        {visual === "nickname" && (
          <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${theme.badgeBg} shadow-xl`}>
            <span className="text-white font-black text-xs">Nickname</span>
          </div>
        )}
      </div>
      <p className="text-[11px] text-center text-muted-foreground font-bold leading-tight">{title}</p>
    </motion.div>
  );
}

export default function NovaPPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<number>(1);
  const [equipping, setEquipping] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      setActiveTier(Math.max(1, data?.nova_p_level || 1));
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalGold = profile?.total_spend_gold || 0;
  const currentLevel = profile?.nova_p_level || 0;
  const expiry = profile?.nova_p_expiry;
  const progress = getNovaProgress(totalGold);
  const currentAsset = getNovaAsset(currentLevel);
  const tierAsset = getNovaAsset(activeTier);
  const tierTheme = TIER_THEMES[activeTier];

  const daysLeft = expiry
    ? Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const equipNovaFrame = async () => {
    if (!profile?.id || currentLevel <= 0) return;
    const frameKey = FRAME_KEY_BY_LEVEL[currentLevel];
    setEquipping(true);
    const { error } = await supabase
      .from("profiles")
      .update({ equipped_frame: frameKey })
      .eq("id", profile.id);
    setEquipping(false);
    if (error) {
      toast.error("فشل تجهيز الإطار");
      return;
    }
    toast.success(`✨ تم تجهيز إطار ${currentAsset?.label}`);
    setProfile({ ...profile, equipped_frame: frameKey });
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-20 bg-gradient-to-b from-[hsl(240_60%_8%)] via-[hsl(260_50%_10%)] to-background relative overflow-hidden" dir="rtl">
        {/* Star particles background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full"
              style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative px-4 pt-6 pb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-secondary/40 backdrop-blur">
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
          <h1 className="font-black text-base">الرتبة الشخصية</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/leaderboard")} className="text-xl">🏆</button>
            <button className="p-1.5 rounded-full bg-secondary/40 backdrop-blur">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Hero Card */}
        <div className="relative px-4">
          <p className="text-[10px] text-muted-foreground text-left mb-2">
            الشهر الماضي: <span className="text-foreground">لم يتم الحصول عليه بعد</span>
          </p>

          <div className="relative">
            {/* Avatar floating above card */}
            <div className="relative -mb-8 z-10 flex justify-center">
              <div className="relative w-16 h-16">
                {currentAsset && (
                  <img src={currentAsset.frame} alt="" className="absolute inset-0 w-full h-full object-contain z-10 scale-150" />
                )}
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-white/30" />
                )}
              </div>
            </div>

            {/* Hero card */}
            <div className={`relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br ${currentLevel > 0 ? `${tierTheme.from} ${tierTheme.to}` : "from-secondary/40 to-secondary/20"} backdrop-blur-xl p-5 pt-12`}>
              <div className="flex items-center gap-4">
                {currentAsset ? (
                  <img src={currentAsset.frame} alt="" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-secondary/40 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 text-right">
                  <h2 className="text-2xl font-black mb-1">
                    {currentLevel > 0 ? currentAsset?.label : "بدون رتبة"}
                  </h2>
                  <p className="text-xs text-muted-foreground mb-2">
                    {currentLevel > 0
                      ? expiry ? `ينتهي خلال ${daysLeft} يوم` : "نشط"
                      : "لم يتم الحصول عليه بعد"}
                  </p>
                  <button className="text-[10px] px-3 py-1 rounded-full bg-background/40 border border-white/20 backdrop-blur">
                    كيفية الترقية ؟ {">"}
                  </button>
                </div>
              </div>

              {/* Equip button if has tier */}
              {currentLevel > 0 && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={equipNovaFrame}
                  disabled={equipping}
                  className={`mt-4 w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-gradient-to-r ${tierTheme.badgeBg} text-white shadow-xl border border-white/30`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {equipping ? "جاري التجهيز..." : `تجهيز إطار ${currentAsset?.label} تلقائياً`}
                </motion.button>
              )}
            </div>
          </div>

          {/* Progress section with gold instead of points */}
          <div className="mt-4 rounded-3xl bg-secondary/20 border border-border/30 backdrop-blur p-4">
            <div className="flex justify-between items-center mb-2 text-[11px]">
              <button className="text-muted-foreground">{"<"} تفاصيل العملات</button>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">عملات NOVA المكتسبة هذا الشهر:</span>
                <span className="font-black">{totalGold.toLocaleString()}</span>
                <CurrencyIcon type="gold" size="sm" />
              </div>
            </div>

            {/* Tier progress line */}
            <div className="relative pt-6 pb-2">
              {/* Floating bubble showing current value */}
              {progress.nextThreshold && (
                <motion.div
                  initial={{ left: "0%" }}
                  animate={{ left: `${Math.min(95, progress.pct)}%` }}
                  transition={{ duration: 0.8 }}
                  className="absolute -top-1 -translate-x-1/2"
                >
                  <div className="px-2 py-0.5 rounded-full bg-foreground text-background text-[10px] font-black flex items-center gap-1">
                    {(totalGold / 1000).toFixed(0)}K
                    <CurrencyIcon type="gold" size="sm" />
                  </div>
                </motion.div>
              )}

              <div className="relative h-px bg-border/50">
                {/* Tier markers - reverse order p6 -> p1 to match RTL UI */}
                <div className="absolute inset-0 flex justify-between">
                  {[6, 5, 4, 3, 2, 1].map((lvl) => (
                    <div key={lvl} className="flex flex-col items-center -translate-y-1/2">
                      <div className={`w-2 h-2 rotate-45 ${currentLevel >= lvl ? "bg-accent" : "bg-border"}`} />
                      <span className={`mt-2 text-[10px] font-bold ${currentLevel >= lvl ? "text-accent" : "text-muted-foreground"}`}>p{lvl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground justify-end">
              <span>عدد العملات المطلوبة للوصول إلى المستوى التالي</span>
              <span className="font-black text-foreground">
                {progress.nextThreshold
                  ? (progress.nextThreshold - totalGold).toLocaleString()
                  : "اكتمل"}
              </span>
              <CurrencyIcon type="gold" size="sm" />
            </div>
          </div>
        </div>

        {/* Perks section */}
        <div className="relative mt-6 px-4">
          <div className="rounded-t-3xl bg-secondary/20 backdrop-blur border-x border-t border-border/30 p-4">
            {/* Title */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-muted-foreground text-xs">◇</span>
              <h3 className="font-black text-sm">امتياز</h3>
              <span className="text-muted-foreground text-xs">◇</span>
            </div>

            {/* Tier tabs - p6 to p1 (RTL) */}
            <div className="flex justify-around mb-4 border-b border-border/30 pb-3">
              {[6, 5, 4, 3, 2, 1].map((lvl) => {
                const isActive = activeTier === lvl;
                const threshold = NOVA_ASSETS.thresholds[lvl - 1];
                return (
                  <button
                    key={lvl}
                    onClick={() => setActiveTier(lvl)}
                    className={`flex flex-col items-center gap-1 px-1 ${isActive ? "" : "opacity-40"}`}
                  >
                    <span className={`text-sm font-black ${isActive ? "text-accent" : "text-muted-foreground"}`}>
                      p{lvl}
                    </span>
                    {isActive && <div className="w-1.5 h-1.5 rotate-45 bg-accent" />}
                    <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                      {(threshold / 1000).toFixed(0)}K
                      <CurrencyIcon type="gold" size="sm" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Perks grid */}
            <div className="grid grid-cols-2 gap-3">
              {PERKS_BY_TIER[activeTier].map((perk, i) => (
                <PerkCard
                  key={i}
                  visual={perk.visual}
                  title={perk.title}
                  level={activeTier}
                  asset={tierAsset}
                  avatarUrl={profile?.avatar_url}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
