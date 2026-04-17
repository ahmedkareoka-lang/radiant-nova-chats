import { Settings, Crown, Star, Users, Shield, Zap, Package, ArrowRightLeft, TrendingUp, Heart, Building2, Camera, Bell, ChevronLeft, Gamepad2, Award, Gem } from "lucide-react";
import NovaGamesMenu from "@/components/games/NovaGamesMenu";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useFollows } from "@/hooks/useFollows";
import { useNotifications } from "@/hooks/useNotifications";
import { FRAME_MAP, FRAME_ANIMATION, bossFrame } from "@/lib/frameConfig";
import PageTransition from "@/components/PageTransition";
import NovaDashboard from "@/components/NovaDashboard";
import DualBadge from "@/components/DualBadge";
import { useMyRoom } from "@/hooks/useMyRoom";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });
  const [ownedFrames, setOwnedFrames] = useState<any[]>([]);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [genderPicking, setGenderPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { followersCount, followingCount } = useFollows(myId);
  const { unreadCount } = useNotifications();
  const { myRoomId } = useMyRoom(myId);

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
    setUploading(true);
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
    finally { setUploading(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  const isBoss = profile?.is_boss;
  const equippedFrameKey = profile?.equipped_frame;
  const frameImage = (equippedFrameKey && FRAME_MAP[equippedFrameKey]) ? FRAME_MAP[equippedFrameKey] : (isBoss ? bossFrame : null);
  const frameSize = isBoss ? "w-28 h-28" : "w-24 h-24";
  const avatarInset = isBoss ? "inset-[18%]" : "inset-[15%]";

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

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

        {/* Header with buttons */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex gap-2">
            {isBoss && (
              <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-accent" />
              </button>
            )}
            <button onClick={() => navigate("/notifications")} className="relative w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                  <span className="text-[7px] font-bold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </div>
              )}
            </button>
            <button onClick={() => navigate("/edit-profile")} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto">
          {/* Avatar & Info */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`relative ${frameSize} ${isBoss ? "boss-god-frame" : ""}`}>
                {frameImage && (
                  <img src={frameImage} alt="Frame" className={`absolute inset-0 w-full h-full object-contain z-20 pointer-events-none ${equippedFrameKey ? (FRAME_ANIMATION[equippedFrameKey] || "") : ""}`} />
                )}
                <div className={`absolute ${avatarInset} rounded-full overflow-hidden z-10`}>
                  <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
              <button onClick={() => setShowFramePicker(true)} className="absolute bottom-0 left-0 z-30 w-7 h-7 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center border border-border/50">
                <span className="text-[10px]">🖼️</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute bottom-0 right-0 z-30 w-7 h-7 rounded-full gradient-neon flex items-center justify-center">
                {uploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3 h-3 text-primary-foreground" />}
              </button>
            </div>

            <h2 className={`font-black text-lg mt-2 ${isBoss ? "boss-fire-text" : ""}`}>{profile?.display_name || "User"}</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap justify-center">
              {profile?.gender && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{profile.gender === "male" ? "♂" : "♀"}</span>}
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
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">ID: {profile?.user_id}</span>
          </div>

          {/* Follow Stats */}
          <div className="flex justify-center gap-8 mt-4 mb-4">
            <div className="text-center">
              <p className="font-bold text-base">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">متابع</p>
            </div>
            <div className="w-px bg-border/50" />
            <div className="text-center">
              <p className="font-bold text-base">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">يتابع</p>
            </div>
            <div className="w-px bg-border/50" />
            <div className="text-center">
              <p className="font-bold text-base">{giftStats.received}</p>
              <p className="text-[10px] text-muted-foreground">صديق</p>
            </div>
          </div>

          {/* Dual Currency Boxes */}
          <div className="flex gap-3 mb-4">
            <button onClick={() => navigate("/wallet")} className="flex-1 card-gradient-blue p-3 flex items-center justify-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Diamonds</p>
                <p className="font-bold text-base">{isBoss ? "∞" : (profile?.diamonds || 0).toLocaleString()}</p>
              </div>
              <CurrencyIcon type="diamond" size="lg" />
            </button>
            <button onClick={() => navigate("/wallet")} className="flex-1 card-gradient-blue p-3 flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, hsl(40 40% 18% / 0.8), hsl(260 30% 12% / 0.8))" }}>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">NOVA Coins</p>
                <p className="font-bold text-base text-accent">{isBoss ? "∞" : (profile?.coins || 0).toLocaleString()}</p>
              </div>
              <CurrencyIcon type="gold" size="lg" />
            </button>
          </div>

          {/* NOVA P Dashboard */}
          {!isBoss && (
            <div className="mb-4">
              <NovaDashboard
                totalGold={profile?.total_spend_gold || 0}
                level={profile?.nova_p_level || 0}
                expiry={profile?.nova_p_expiry || null}
                userId={profile?.id}
                equippedFrame={profile?.equipped_frame}
                onEquipped={(frameKey) => setProfile({ ...profile, equipped_frame: frameKey })}
              />
            </div>
          )}

          {/* Agency Center */}
          <button onClick={() => navigate("/agencies")} className="w-full card-gradient-blue p-3 flex items-center justify-between mb-4">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold">مركز الوكالة</p>
                <p className="text-[10px] text-muted-foreground">إدارة الوكالة وتفاصيل الدخل</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
            </div>
          </button>

          {/* Icon Grid - 2 rows × 4 columns */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <button onClick={() => navigate("/daily-tasks")} className="icon-grid-btn">
              <div className="w-11 h-11 rounded-2xl bg-pink-500/20 flex items-center justify-center"><Heart className="w-5 h-5 text-pink-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">المهام</span>
            </button>
            <button onClick={() => navigate("/games")} className="icon-grid-btn">
              <div className="w-11 h-11 rounded-2xl bg-green-500/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">مستوى</span>
            </button>
            <button onClick={() => navigate("/nova-p")} className="icon-grid-btn relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/40 to-fuchsia-500/40 border border-purple-300/30 flex items-center justify-center shadow-[0_0_15px_hsl(280_90%_60%/0.4)]">
                <Crown className="w-5 h-5 text-purple-200" />
              </div>
              <span className="text-[10px] font-black text-purple-200">NOVA P</span>
            </button>
            <button onClick={() => navigate("/store")} className="icon-grid-btn">
              <div className="w-11 h-11 rounded-2xl bg-orange-500/20 flex items-center justify-center"><Crown className="w-5 h-5 text-orange-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">مركز VIP</span>
            </button>
            <div className="icon-grid-btn">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center"><Gamepad2 className="w-5 h-5 text-emerald-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">LUDO</span>
            </div>
            <div className="icon-grid-btn relative">
              <NovaGamesMenu currentUserId={myId} />
              <span className="text-[10px] font-bold text-muted-foreground">مركز الألعاب</span>
            </div>
            <button onClick={() => navigate("/inventory")} className="icon-grid-btn relative">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center"><Package className="w-5 h-5 text-purple-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">الحقيبة</span>
            </button>
            <button onClick={() => navigate("/store")} className="icon-grid-btn">
              <div className="w-11 h-11 rounded-2xl bg-red-500/20 flex items-center justify-center"><Gem className="w-5 h-5 text-red-400" /></div>
              <span className="text-[10px] font-bold text-muted-foreground">المتجر</span>
            </button>
          </div>

          {/* Menu Rows */}
          <div className="rounded-2xl overflow-hidden border border-border/30 mb-4">
            <button
              onClick={() => navigate(myRoomId ? `/voice-room?id=${myRoomId}` : "/create-room")}
              className="menu-row w-full"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{myRoomId ? "الدخول إلى غرفتي" : "إنشاء غرفة"}</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary" /></div>
              </div>
            </button>
            <button onClick={() => navigate(`/user-profile?id=${profile?.id}`)} className="menu-row w-full">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">عرض ملفي الشخصي للجمهور</span>
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"><Star className="w-4 h-4 text-accent" /></div>
              </div>
            </button>
            <button className="menu-row w-full">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">خدمة عملاء الوكالات</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
              </div>
            </button>
            <button onClick={() => navigate("/edit-profile")} className="menu-row w-full border-b-0">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">الإعدادات</span>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Settings className="w-4 h-4 text-muted-foreground" /></div>
              </div>
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
