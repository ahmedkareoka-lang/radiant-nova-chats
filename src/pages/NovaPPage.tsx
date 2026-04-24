import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, HelpCircle, Trophy, Wand2, Share2, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import { NOVA_ASSETS, getNovaAsset, getNovaProgress } from "@/lib/novaAssets";
import perkVehicle from "@/assets/nova-perk-vehicle.png";
import perkCard from "@/assets/nova-perk-card.png";
import perkTray from "@/assets/nova-perk-tray.png";
import perkEntrance from "@/assets/nova-perk-entrance.png";
import perkThrone from "@/assets/nova-perk-throne.png";
import perkBanner from "@/assets/nova-perk-banner.png";
import perkBubble from "@/assets/nova-perk-bubble.png";
import perkNickname from "@/assets/nova-perk-nickname.png";

const TIER_THEMES: Record<number, { from: string; to: string; ring: string; text: string; badgeBg: string; hex: string }> = {
  1: { from: "from-emerald-700/40", to: "to-emerald-900/30", ring: "ring-emerald-400/40", text: "text-emerald-300", badgeBg: "from-emerald-500 to-green-700", hex: "#10b981" },
  2: { from: "from-emerald-600/40", to: "to-teal-900/30", ring: "ring-emerald-300/50", text: "text-emerald-200", badgeBg: "from-emerald-500 to-emerald-700", hex: "#14b8a6" },
  3: { from: "from-cyan-600/40", to: "to-teal-900/40", ring: "ring-cyan-300/50", text: "text-cyan-200", badgeBg: "from-cyan-500 to-teal-700", hex: "#06b6d4" },
  4: { from: "from-blue-600/40", to: "to-indigo-900/40", ring: "ring-blue-300/60", text: "text-blue-200", badgeBg: "from-blue-500 to-indigo-700", hex: "#6366f1" },
  5: { from: "from-purple-600/50", to: "to-fuchsia-900/40", ring: "ring-purple-300/60", text: "text-purple-200", badgeBg: "from-purple-500 to-fuchsia-700", hex: "#a855f7" },
  6: { from: "from-amber-500/50", to: "to-red-900/50", ring: "ring-amber-300/70", text: "text-amber-200", badgeBg: "from-amber-500 to-red-700", hex: "#f59e0b" },
};

type PerkVisual = "frame" | "badge" | "bubble" | "id" | "vehicle" | "card" | "throne" | "gift-tray" | "entrance" | "banner" | "nickname";

const PERKS_BY_TIER: Record<number, { title: string; visual: PerkVisual }[]> = {
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

const PERK_IMAGE: Partial<Record<PerkVisual, string>> = {
  vehicle: perkVehicle,
  card: perkCard,
  "gift-tray": perkTray,
  entrance: perkEntrance,
  throne: perkThrone,
  banner: perkBanner,
  bubble: perkBubble,
  nickname: perkNickname,
};

function PerkCard({
  visual,
  title,
  level,
  asset,
  avatarUrl,
}: {
  visual: PerkVisual;
  title: string;
  level: number;
  asset: ReturnType<typeof getNovaAsset>;
  avatarUrl?: string | null;
}) {
  const theme = TIER_THEMES[level];
  const perkImg = PERK_IMAGE[visual];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-secondary/30 border border-border/30 p-3 flex flex-col items-center justify-center gap-2 aspect-square"
    >
      <div className="flex-1 flex items-center justify-center w-full">
        {visual === "frame" && asset && (
          <div className="relative w-20 h-20">
            <img loading="lazy" decoding="async" src={asset.frame} alt={asset.label} className="absolute inset-0 w-full h-full object-contain z-10" />
            {avatarUrl ? (
              <img loading="lazy" decoding="async" src={avatarUrl} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-secondary" />
            )}
          </div>
        )}
        {visual === "badge" && asset && (
          <img loading="lazy" decoding="async" src={asset.frame} alt={asset.label} className="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]" />
        )}
        {visual === "id" && (
          <div className={`px-5 py-1.5 rounded-full bg-gradient-to-r ${theme.badgeBg} border-2 border-white/30 shadow-xl flex items-center gap-2`}>
            {asset && <img loading="lazy" decoding="async" src={asset.frame} alt="" className="w-5 h-5 object-contain" />}
            <span className="text-white font-black text-base">P{level}</span>
          </div>
        )}
        {perkImg && (
          <img
            src={perkImg}
            alt={title}
            loading="lazy"
            width={512}
            height={512}
            className="w-20 h-20 object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]"
          />
        )}
      </div>
      <p className="text-[11px] text-center text-muted-foreground font-bold leading-tight line-clamp-2">{title}</p>
    </motion.div>
  );
}

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function getLastMonthYM(): { ym: string; label: string } {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { ym, label: `${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}` };
}

export default function NovaPPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTier, setActiveTier] = useState<number>(1);
  const [equipping, setEquipping] = useState(false);
  const [lastMonth, setLastMonth] = useState<{ level: number; gold: number; label: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      setActiveTier(Math.max(1, data?.nova_p_level || 1));

      // Record this month
      if (data?.nova_p_level && data.nova_p_level > 0) {
        await supabase.rpc("record_nova_p_monthly", { _user_id: user.id });
      }

      // Fetch last month
      const { ym, label } = getLastMonthYM();
      const { data: hist } = await supabase
        .from("nova_p_monthly_history")
        .select("highest_level, total_gold_earned")
        .eq("user_id", user.id)
        .eq("year_month", ym)
        .maybeSingle();

      if (hist && hist.highest_level > 0) {
        setLastMonth({ level: hist.highest_level, gold: hist.total_gold_earned, label });
      } else {
        setLastMonth({ level: 0, gold: 0, label });
      }

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
    if (error) { toast.error("فشل تجهيز الإطار"); return; }
    toast.success(`✨ تم تجهيز إطار ${currentAsset?.label}`);
    setProfile({ ...profile, equipped_frame: frameKey });
  };

  // Generate share image via canvas
  const generateShareImage = async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const theme = TIER_THEMES[Math.max(1, currentLevel)];
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1a0b3d");
    bg.addColorStop(0.5, theme.hex + "40");
    bg.addColorStop(1, "#0a0419");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const r = Math.random() * 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Title
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px sans-serif";
    ctx.fillText("NOVA P", W / 2, 130);
    ctx.font = "32px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("الرتبة الشخصية", W / 2, 180);

    // Frame + avatar
    try {
      if (currentAsset) {
        const frameImg = new Image();
        frameImg.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => {
          frameImg.onload = () => res();
          frameImg.onerror = () => rej();
          frameImg.src = currentAsset.frame;
        }).catch(() => {});
        if (frameImg.complete && frameImg.naturalWidth > 0) {
          ctx.drawImage(frameImg, W / 2 - 220, 240, 440, 440);
        }
      }
      if (profile?.avatar_url) {
        const av = new Image();
        av.crossOrigin = "anonymous";
        await new Promise<void>((res) => {
          av.onload = () => res();
          av.onerror = () => res();
          av.src = profile.avatar_url;
        });
        if (av.complete && av.naturalWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(W / 2, 460, 140, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(av, W / 2 - 140, 320, 280, 280);
          ctx.restore();
        }
      }
    } catch {}

    // Tier label
    ctx.fillStyle = theme.hex;
    ctx.font = "bold 120px sans-serif";
    ctx.fillText(currentLevel > 0 ? currentAsset?.label || "" : "بدون رتبة", W / 2, 800);

    // Display name
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText(profile?.display_name || "", W / 2, 870);

    // Gold
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "36px sans-serif";
    ctx.fillText(`💰 ${totalGold.toLocaleString()} NOVA`, W / 2, 940);

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "28px sans-serif";
    ctx.fillText("NOVA · Voice Rooms", W / 2, 1020);

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateShareImage();
      if (!blob) { toast.error("فشل توليد الصورة"); return; }
      const file = new File([blob], `nova-p-${currentLevel}.png`, { type: "image/png" });

      // Try native share with file
      const shareData: ShareData = {
        title: `رتبتي في NOVA P`,
        text: `رتبتي الحالية: ${currentAsset?.label || "بدون رتبة"} 💎`,
        files: [file],
      };
      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("تمت المشاركة");
      } else {
        // Download fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nova-p-${currentAsset?.label || "rank"}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("تم تنزيل الصورة");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("فشلت المشاركة");
    } finally {
      setSharing(false);
    }
  };

  const lastMonthAsset = lastMonth && lastMonth.level > 0 ? getNovaAsset(lastMonth.level) : null;
  const lastMonthTheme = lastMonth && lastMonth.level > 0 ? TIER_THEMES[lastMonth.level] : null;

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
            <button
              onClick={handleShare}
              disabled={sharing}
              className="p-1.5 rounded-full bg-gradient-to-br from-primary to-accent backdrop-blur shadow-lg disabled:opacity-50"
              aria-label="مشاركة"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={() => navigate("/leaderboard")} className="text-xl">🏆</button>
            <button className="p-1.5 rounded-full bg-secondary/40 backdrop-blur">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Last-month medal */}
        <div className="relative px-4 mb-3" ref={cardRef}>
          {lastMonth && lastMonth.level > 0 && lastMonthAsset && lastMonthTheme ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-3 bg-gradient-to-r ${lastMonthTheme.from} ${lastMonthTheme.to} border ${lastMonthTheme.ring} ring-1 backdrop-blur flex items-center gap-3`}
            >
              <div className="relative w-14 h-14 shrink-0">
                <img loading="lazy" decoding="async" src={lastMonthAsset.frame} alt={lastMonthAsset.label} className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,200,0,0.6)]" />
                <Medal className="absolute -bottom-1 -right-1 w-5 h-5 text-amber-300 fill-amber-400" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] text-muted-foreground">إنجاز الشهر الماضي · {lastMonth.label}</p>
                <p className="text-sm font-black">
                  وصلت إلى <span className={lastMonthTheme.text}>{lastMonthAsset.label}</span>
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                  بإجمالي {lastMonth.gold.toLocaleString()}
                  <CurrencyIcon type="gold" size="sm" />
                </p>
              </div>
            </motion.div>
          ) : (
            <p className="text-[10px] text-muted-foreground text-right">
              إنجاز الشهر الماضي ({lastMonth?.label}): <span className="text-foreground">لم يتم الحصول عليه بعد</span>
            </p>
          )}
        </div>

        {/* Top Hero Card */}
        <div className="relative px-4">
          <div className="relative">
            {/* Avatar floating above card */}
            <div className="relative -mb-8 z-10 flex justify-center">
              <div className="relative w-16 h-16">
                {currentAsset && (
                  <img loading="lazy" decoding="async" src={currentAsset.frame} alt="" className="absolute inset-0 w-full h-full object-contain z-10 scale-150" />
                )}
                {profile?.avatar_url ? (
                  <img loading="lazy" decoding="async" src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-white/30" />
                )}
              </div>
            </div>

            {/* Hero card */}
            <div className={`relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br ${currentLevel > 0 ? `${tierTheme.from} ${tierTheme.to}` : "from-secondary/40 to-secondary/20"} backdrop-blur-xl p-5 pt-12`}>
              <div className="flex items-center gap-4">
                {currentAsset ? (
                  <img loading="lazy" decoding="async" src={currentAsset.frame} alt="" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
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

              {currentLevel > 0 && (
                <div className="mt-4 flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={equipNovaFrame}
                    disabled={equipping}
                    className={`flex-1 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 bg-gradient-to-r ${tierTheme.badgeBg} text-white shadow-xl border border-white/30`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {equipping ? "جاري التجهيز..." : `تجهيز إطار ${currentAsset?.label}`}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleShare}
                    disabled={sharing}
                    className="px-4 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 bg-background/40 text-foreground border border-white/20 backdrop-blur"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {sharing ? "..." : "مشاركة"}
                  </motion.button>
                </div>
              )}
            </div>
          </div>

          {/* Progress section */}
          <div className="mt-4 rounded-3xl bg-secondary/20 border border-border/30 backdrop-blur p-4">
            <div className="flex justify-between items-center mb-2 text-[11px]">
              <button className="text-muted-foreground">{"<"} تفاصيل العملات</button>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">عملات NOVA المكتسبة هذا الشهر:</span>
                <span className="font-black">{totalGold.toLocaleString()}</span>
                <CurrencyIcon type="gold" size="sm" />
              </div>
            </div>

            <div className="relative pt-6 pb-2">
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
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-muted-foreground text-xs">◇</span>
              <h3 className="font-black text-sm">امتياز</h3>
              <span className="text-muted-foreground text-xs">◇</span>
            </div>

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
