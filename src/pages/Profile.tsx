import { Settings, Shield, Camera, Bell, ChevronLeft, ImagePlus, Crown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useFollows } from "@/hooks/useFollows";
import { useNotifications } from "@/hooks/useNotifications";
import { FRAME_MAP, FRAME_ANIMATION, bossFrame } from "@/lib/frameConfig";
import PageTransition from "@/components/PageTransition";
import DualBadge from "@/components/DualBadge";
import EquippedBadge from "@/components/EquippedBadge";
import TierBadge from "@/components/TierBadge";
import { getNovaAsset, getNovaProgress } from "@/lib/novaAssets";

// Wealth XP thresholds per level (matches DB function deduct_coins_add_wealth)
const wealthThreshold = (lvl: number) => {
  if (lvl < 10) return 25_000;
  if (lvl < 20) return 40_000;
  if (lvl < 30) return 65_000;
  if (lvl < 40) return 100_000;
  if (lvl < 50) return 150_000;
  return 300_000;
};
// Charm XP thresholds (matches add_diamonds_add_charisma)
const charmThreshold = (lvl: number) => {
  if (lvl < 10) return 15_000;
  if (lvl < 20) return 25_000;
  if (lvl < 30) return 40_000;
  if (lvl < 40) return 70_000;
  if (lvl < 50) return 110_000;
  return 200_000;
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });
  const [ownedFrames, setOwnedFrames] = useState<any[]>([]);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [genderPicking, setGenderPicking] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { followersCount, followingCount } = useFollows(myId);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setMyId(user.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
      const { count: sentCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("sender_id", user.id);
      const { count: receivedCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", user.id);
      setGiftStats({ sent: sentCount || 0, received: receivedCount || 0 });
      const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", user.id).eq("item_type", "frame");
      setOwnedFrames(inv || []);
      if (!data?.gender) setGenderPicking(true);
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const equipFrame = async (frameUrl: string | null) => {
    await supabase.from("profiles").update({ equipped_frame: frameUrl }).eq("id", profile.id);
    setProfile({ ...profile, equipped_frame: frameUrl });
    setShowFramePicker(false);
    toast.success(frameUrl ? "تم تفعيل الإطار! 🖼️" : "تم إزالة الإطار");
  };

  const setGender = async (gender: string) => {
    await supabase.from("profiles").update({ gender }).eq("id", profile.id);
    setProfile({ ...profile, gender });
    setGenderPicking(false);
    toast.success("تم تحديد الجنس! ✅");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${profile.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const avatar_url = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ avatar_url }).eq("id", profile.id);
      setProfile({ ...profile, avatar_url });
      toast.success("تم تحديث الصورة! 📸");
    } catch (err: any) { toast.error("فشل رفع الصورة: " + (err.message || "خطأ")); }
    finally { setUploadingAvatar(false); }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الغلاف يجب أن يكون أقل من 5MB"); return; }
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${profile.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const cover_url = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ cover_url }).eq("id", profile.id);
      setProfile({ ...profile, cover_url });
      toast.success("تم تحديث الغلاف! 🖼️");
    } catch (err: any) { toast.error("فشل رفع الغلاف: " + (err.message || "خطأ")); }
    finally { setUploadingCover(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  const isBoss = profile?.is_boss;
  const equippedFrameKey = profile?.equipped_frame;
  const frameImage = (equippedFrameKey && FRAME_MAP[equippedFrameKey]) ? FRAME_MAP[equippedFrameKey] : (isBoss ? bossFrame : null);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 bg-background">
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

        {/* Gender picker modal */}
        {genderPicking && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center">
            <div className="card-nova p-6 max-w-xs w-full text-center space-y-4">
              <h3 className="font-bold text-lg">حدد جنسك</h3>
              <p className="text-xs text-muted-foreground">يتم تحديده مرة واحدة فقط</p>
              <div className="flex gap-3">
                <button onClick={() => setGender("male")} className="flex-1 py-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-center">
                  <span className="text-3xl">👨</span><p className="text-xs font-bold mt-1">ذكر</p>
                </button>
                <button onClick={() => setGender("female")} className="flex-1 py-4 rounded-2xl bg-pink-500/20 border border-pink-500/30 text-center">
                  <span className="text-3xl">👩</span><p className="text-xs font-bold mt-1">أنثى</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Frame picker modal */}
        {showFramePicker && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end justify-center">
            <div className="card-nova p-4 max-w-lg w-full rounded-t-3xl space-y-3 max-h-[60vh] overflow-auto">
              <h3 className="font-bold text-sm text-center">اختر إطارك</h3>
              <button onClick={() => equipFrame(null)} className={`w-full p-3 rounded-xl text-xs font-bold ${!equippedFrameKey ? "gradient-neon text-primary-foreground" : "bg-secondary"}`}>بدون إطار</button>
              <div className="grid grid-cols-3 gap-3">
                {ownedFrames.map((item) => {
                  const key = item.item_data?.frame_url;
                  const img = FRAME_MAP[key];
                  if (!img) return null;
                  return (
                    <button key={item.id} onClick={() => equipFrame(key)}
                      className={`p-2 rounded-xl text-center ${equippedFrameKey === key ? "border-2 border-primary glow-neon" : "border border-border"}`}>
                      <img src={img} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" />
                      <p className="text-[9px] font-bold mt-1">{item.item_name}</p>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setShowFramePicker(false)} className="w-full py-2 text-xs text-muted-foreground">إغلاق</button>
            </div>
          </div>
        )}

        {/* === COVER + AVATAR (Yalla/Soulmatch style) === */}
        <div className="relative">
          {/* Cover image */}
          <div className="relative w-full h-56 overflow-hidden">
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(135deg, hsl(280 60% 25%), hsl(260 50% 18%) 50%, hsl(45 70% 30%))" }}
              />
            )}
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, transparent 50%, hsl(var(--background) / 0.95) 100%)" }} />

            {/* Top action buttons floating over cover */}
            <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between z-20">
              <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-background/40 backdrop-blur-md flex items-center justify-center border border-border/30">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex gap-2">
                {isBoss && (
                  <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-accent/30 backdrop-blur-md flex items-center justify-center border border-accent/40">
                    <Shield className="w-4 h-4 text-accent" />
                  </button>
                )}
                <button onClick={() => navigate("/notifications")} className="relative w-9 h-9 rounded-full bg-background/40 backdrop-blur-md flex items-center justify-center border border-border/30">
                  <Bell className="w-4 h-4 text-foreground" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                      <span className="text-[7px] font-bold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    </div>
                  )}
                </button>
                <button onClick={() => navigate("/edit-profile")} className="w-9 h-9 rounded-full bg-background/40 backdrop-blur-md flex items-center justify-center border border-border/30">
                  <Settings className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Cover upload button (bottom-right of cover) */}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-16 right-4 z-20 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md flex items-center gap-1.5 border border-border/40 hover:bg-background/80 transition-colors"
            >
              {uploadingCover ? (
                <div className="w-3 h-3 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5 text-foreground" />
              )}
              <span className="text-[10px] font-bold text-foreground">تغيير الغلاف</span>
            </button>
          </div>

          {/* Avatar — large circular, overlapping cover */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 z-10">
            <div className="relative">
              <div className={`relative w-32 h-32 ${isBoss ? "boss-god-frame" : ""}`}>
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full p-1" style={{ background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(280 90% 60%))" }}>
                  <div className="w-full h-full rounded-full bg-background p-0.5">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
                {/* Equipped frame overlay */}
                {frameImage && (
                  <img
                    src={frameImage}
                    alt="Frame"
                    className={`absolute -inset-2 w-[calc(100%+1rem)] h-[calc(100%+1rem)] object-contain z-20 pointer-events-none ${equippedFrameKey ? (FRAME_ANIMATION[equippedFrameKey] || "") : ""}`}
                  />
                )}
              </div>

              {/* Avatar action buttons */}
              <button
                onClick={() => setShowFramePicker(true)}
                className="absolute -bottom-1 -left-1 z-30 w-8 h-8 rounded-full bg-secondary/90 backdrop-blur flex items-center justify-center border border-border/50 shadow-lg"
                aria-label="تغيير الإطار"
              >
                <span className="text-sm">🖼️</span>
              </button>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 z-30 w-8 h-8 rounded-full gradient-neon flex items-center justify-center shadow-lg"
                aria-label="تغيير الصورة"
              >
                {uploadingAvatar ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* === USER INFO === */}
        <main className="px-4 max-w-lg mx-auto pt-20">
          <div className="flex flex-col items-center text-center">
            <h2 className={`font-black text-2xl ${isBoss ? "boss-fire-text" : "text-foreground"}`}>
              {profile?.display_name || "User"}
            </h2>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
              {profile?.gender && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${profile.gender === "male" ? "bg-blue-500/20 text-blue-400" : "bg-pink-500/20 text-pink-400"}`}>
                  {profile.gender === "male" ? "♂" : "♀"}
                </span>
              )}
              {profile?.age && <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{profile.age}</span>}
              {profile?.country_code && <span className="text-xs">🌍 {profile.country_code}</span>}
              {isBoss ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">🔥 BOSS</span>
              ) : (
                <DualBadge novaLevel={profile?.nova_p_level || 0} vipLevel={profile?.vip_level || 0} />
              )}
              {profile?.is_agent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">🏅 وكيل</span>
              )}
              {profile?.is_host && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">🎤 مضيف</span>
              )}
              {profile?.equipped_badge && <EquippedBadge badgeName={profile.equipped_badge} />}
            </div>

            {/* Wealth & Charm visual tier badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              <TierBadge level={profile?.wealth_level || 1} type="wealth" size="md" />
              <TierBadge level={profile?.charisma_level || 1} type="charm" size="md" />
            </div>

            <span className="text-[11px] text-muted-foreground mt-1.5">ID: {profile?.user_id}</span>
          </div>

          {/* === STATS PILL === */}
          <div className="mt-5 rounded-3xl border border-border/30 bg-secondary/30 backdrop-blur-sm p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-black text-base text-foreground">{followersCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">متابع</p>
              </div>
              <div className="border-l border-border/40">
                <p className="font-black text-base text-foreground">{followingCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">يتابع</p>
              </div>
              <div className="border-l border-border/40">
                <p className="font-black text-base text-foreground">{giftStats.received}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">هدايا</p>
              </div>
              <div className="border-l border-border/40">
                <p className="font-black text-base text-foreground">{profile?.charisma_level || 1}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المستوى</p>
              </div>
            </div>
          </div>

          {/* === NOVA P CARD === */}
          {(() => {
            const novaLvl = profile?.nova_p_level || 0;
            const totalGold = profile?.total_spend_gold || 0;
            const novaProgress = getNovaProgress(totalGold);
            const novaAsset = novaLvl > 0 ? getNovaAsset(novaLvl) : null;
            return (
              <button
                onClick={() => navigate("/nova-p")}
                className="mt-4 w-full text-right rounded-3xl border border-accent/30 p-4 relative overflow-hidden group"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(280 60% 18% / 0.85), hsl(260 50% 14% / 0.85) 50%, hsl(45 70% 22% / 0.7))",
                }}
              >
                <div className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{ background: "radial-gradient(circle at 80% 20%, hsl(45 90% 55% / 0.4), transparent 60%)" }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: "linear-gradient(135deg, hsl(45 95% 55%), hsl(280 80% 50%))" }}>
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-foreground flex items-center gap-1.5">
                        NOVA P
                        {novaAsset && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-accent/30 text-accent font-black">
                            {novaAsset.label}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {novaLvl > 0
                          ? `إجمالي الذهب: ${totalGold.toLocaleString()}`
                          : "لم تصل لأي مستوى بعد - أرسل هدايا لتفعيله"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground rtl:rotate-180 shrink-0" />
                </div>
                {/* Progress bar */}
                {novaProgress.nextThreshold && (
                  <div className="relative mt-3">
                    <div className="h-2 rounded-full bg-background/40 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${novaProgress.pct}%`,
                          background: "linear-gradient(90deg, hsl(45 90% 55%), hsl(280 80% 60%))",
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      التقدّم نحو P{novaProgress.nextLevel}: {Math.round(novaProgress.pct)}%
                    </p>
                  </div>
                )}
              </button>
            );
          })()}

          {/* === Wealth & Charm progress bars === */}
          {(() => {
            const wXp = profile?.wealth_xp || 0;
            const wLvl = profile?.wealth_level || 1;
            const wNext = wealthThreshold(wLvl);
            const wPct = Math.min(100, (wXp / wNext) * 100);
            const cXp = profile?.charisma_xp || 0;
            const cLvl = profile?.charisma_level || 1;
            const cNext = charmThreshold(cLvl);
            const cPct = Math.min(100, (cXp / cNext) * 100);
            return (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-3 border border-border/30 bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground">الثروة</span>
                    <TierBadge level={wLvl} type="wealth" size="sm" />
                  </div>
                  <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${wPct}%`, background: "linear-gradient(90deg, hsl(45 90% 55%), hsl(20 90% 55%))" }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5">{wXp.toLocaleString()} / {wNext.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl p-3 border border-border/30 bg-secondary/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground">السحر</span>
                    <TierBadge level={cLvl} type="charm" size="sm" />
                  </div>
                  <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${cPct}%`, background: "linear-gradient(90deg, hsl(280 90% 60%), hsl(320 90% 60%))" }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5">{cXp.toLocaleString()} / {cNext.toLocaleString()}</p>
                </div>
              </div>
            );
          })()}

          {/* === DUAL CURRENCY (display only, no navigation) === */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 rounded-2xl p-3 flex items-center justify-center gap-2 border border-border/30" style={{ background: "linear-gradient(135deg, hsl(220 50% 18% / 0.6), hsl(260 30% 12% / 0.6))" }}>
              <CurrencyIcon type="diamond" size="lg" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Diamonds</p>
                <p className="font-black text-base text-foreground">{isBoss ? "∞" : (profile?.diamonds || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex-1 rounded-2xl p-3 flex items-center justify-center gap-2 border border-border/30" style={{ background: "linear-gradient(135deg, hsl(40 50% 18% / 0.6), hsl(260 30% 12% / 0.6))" }}>
              <CurrencyIcon type="gold" size="lg" />
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">NOVA Coins</p>
                <p className="font-black text-base text-accent">{isBoss ? "∞" : (profile?.coins || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Hint to redirect to home for actions */}
          <button
            onClick={() => navigate("/")}
            className="mt-5 w-full py-3 rounded-2xl border border-border/30 bg-secondary/30 backdrop-blur-sm text-center hover:bg-secondary/50 transition-colors"
          >
            <p className="text-xs text-muted-foreground">
              للوصول للمتجر، الحقيبة، VIP، المهام والمزيد →
              <span className="font-bold text-primary mr-1">الصفحة الرئيسية</span>
            </p>
          </button>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
