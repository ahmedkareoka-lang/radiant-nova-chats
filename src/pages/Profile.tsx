import { Settings, Edit, Crown, Coins, Diamond, Star, Users, Shield, Zap, Package, ArrowRightLeft, TrendingUp, Heart, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import bossFrame from "@/assets/boss-frame.png";
import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import PageTransition from "@/components/PageTransition";

const FRAME_MAP: Record<string, string> = {
  "frame-purple-wings": framePurpleWings,
  "frame-royal-crown": frameRoyalCrown,
};

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });
  const [ownedFrames, setOwnedFrames] = useState<any[]>([]);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [genderPicking, setGenderPicking] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);

      const { count: sentCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("sender_id", user.id);
      const { count: receivedCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", user.id);
      setGiftStats({ sent: sentCount || 0, received: receivedCount || 0 });

      // Load owned frames
      const { data: inv } = await supabase.from("inventory").select("*").eq("user_id", user.id).eq("item_type", "frame");
      setOwnedFrames(inv || []);

      // Check if gender not set
      if (!data?.gender) setGenderPicking(true);

      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const isBoss = profile?.is_boss;
  const equippedFrameKey = profile?.equipped_frame;
  const frameImage = isBoss ? bossFrame : (equippedFrameKey ? FRAME_MAP[equippedFrameKey] : null);
  const frameSize = isBoss ? "w-44 h-44" : "w-36 h-36";
  const avatarInset = isBoss ? "inset-[18%]" : "inset-[15%]";
  const wealthLevel = profile?.wealth_level || 1;
  const charismaLevel = profile?.charisma_level || 1;
  const wealthProgress = ((profile?.wealth_xp || 0) % 10000) / 100;
  const charismaProgress = ((profile?.charisma_xp || 0) % 10000) / 100;

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        {/* Gender picker modal */}
        {genderPicking && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center">
            <div className="card-nova p-6 max-w-xs w-full text-center space-y-4">
              <h3 className="font-bold text-lg">حدد جنسك</h3>
              <p className="text-xs text-muted-foreground">يتم تحديده مرة واحدة فقط</p>
              <div className="flex gap-3">
                <button onClick={() => setGender("male")} className="flex-1 py-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-center">
                  <span className="text-3xl">👨</span>
                  <p className="text-xs font-bold mt-1">ذكر</p>
                </button>
                <button onClick={() => setGender("female")} className="flex-1 py-4 rounded-2xl bg-pink-500/20 border border-pink-500/30 text-center">
                  <span className="text-3xl">👩</span>
                  <p className="text-xs font-bold mt-1">أنثى</p>
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
              <button onClick={() => equipFrame(null)} className={`w-full p-3 rounded-xl text-xs font-bold ${!equippedFrameKey ? "gradient-neon text-primary-foreground" : "bg-secondary"}`}>
                بدون إطار
              </button>
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

        {/* Header */}
        <div className="relative h-48 gradient-neon overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {isBoss && (
              <button onClick={() => navigate("/admin")} className="w-10 h-10 rounded-full bg-accent/20 backdrop-blur flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </button>
            )}
            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-background/30 backdrop-blur flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-16 relative z-10">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`relative ${frameSize} ${isBoss ? "boss-god-frame" : ""}`}>
                {frameImage && (
                  <img src={frameImage} alt="Frame" className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />
                )}
                <div className={`absolute ${avatarInset} rounded-full overflow-hidden z-10`}>
                  <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
              <button onClick={() => setShowFramePicker(true)}
                className="absolute bottom-1 left-1 z-30 w-8 h-8 rounded-full bg-secondary/80 backdrop-blur flex items-center justify-center border border-border">
                <span className="text-xs">🖼️</span>
              </button>
              <button className="absolute bottom-1 right-1 z-30 w-8 h-8 rounded-full gradient-neon flex items-center justify-center glow-neon">
                <Edit className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>

            <h2 className={`font-black text-xl mt-3 ${isBoss ? "boss-fire-text" : "glow-neon-text"}`}>
              {profile?.display_name || "User"}
            </h2>
            <span className="text-xs text-muted-foreground mb-1">
              ID: <span className={isBoss ? "text-accent font-bold" : ""}>{profile?.user_id}</span>
              {profile?.gender && <span className="ml-2">{profile.gender === "male" ? "👨" : "👩"}</span>}
            </span>

            {isBoss ? (
              <motion.div
                className="mt-1 px-4 py-1.5 rounded-full font-black text-sm flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg, hsl(0 100% 50%), hsl(45 100% 55%), hsl(270 100% 65%))", backgroundSize: "200% 200%" }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="w-4 h-4" /> VVVIP • GOD MODE
              </motion.div>
            ) : (
              <VipBadge level={profile?.vip_level || 0} size="lg" />
            )}
          </div>

          {/* Balances */}
          <div className="flex gap-3 mt-6">
            <div className="flex-1 card-nova p-3 flex items-center gap-2" onClick={() => navigate("/wallet")} role="button">
              <Coins className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground">الذهب</p>
                <p className="font-bold text-sm text-accent">{isBoss ? "∞" : (profile?.coins || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex-1 card-nova p-3 flex items-center gap-2" onClick={() => navigate("/wallet")} role="button">
              <Diamond className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">الماس</p>
                <p className="font-bold text-sm text-primary">{isBoss ? "999K+" : (profile?.diamonds || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Wealth & Charisma Levels */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="card-nova p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span className="text-[10px] font-bold">الثروة Lv.{isBoss ? "MAX" : wealthLevel}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--accent)), hsl(45 100% 55%))" }}
                  initial={{ width: 0 }} animate={{ width: isBoss ? "100%" : `${wealthProgress}%` }} transition={{ duration: 1 }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{(profile?.wealth_xp || 0).toLocaleString()} XP</p>
            </div>
            <div className="card-nova p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold">الكاريزما Lv.{isBoss ? "MAX" : charismaLevel}</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(270 100% 65%))" }}
                  initial={{ width: 0 }} animate={{ width: isBoss ? "100%" : `${charismaProgress}%` }} transition={{ duration: 1 }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">{(profile?.charisma_xp || 0).toLocaleString()} XP</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="card-nova p-3 text-center">
              <Users className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-sm">{giftStats.sent}</p>
              <p className="text-[10px] text-muted-foreground">هدايا مرسلة</p>
            </div>
            <div className="card-nova p-3 text-center">
              <Star className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-sm">{giftStats.received}</p>
              <p className="text-[10px] text-muted-foreground">هدايا مستلمة</p>
            </div>
            <div className="card-nova p-3 text-center">
              <Crown className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-bold text-sm">Lv.{profile?.level || 1}</p>
              <p className="text-[10px] text-muted-foreground">المستوى</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <button onClick={() => navigate("/inventory")} className="card-nova p-3 text-center">
              <Package className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-[10px] font-bold">الحقيبة</p>
            </button>
            <button onClick={() => navigate("/wallet")} className="card-nova p-3 text-center">
              <ArrowRightLeft className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-[10px] font-bold">المحفظة</p>
            </button>
            <button onClick={() => navigate("/store")} className="card-nova p-3 text-center">
              <Coins className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-[10px] font-bold">المتجر</p>
            </button>
            <button onClick={() => navigate("/agencies")} className="card-nova p-3 text-center">
              <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-[10px] font-bold">الوكالات</p>
            </button>
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className="w-full mt-6 py-3 rounded-full bg-destructive/20 text-destructive font-bold btn-nova">
            تسجيل الخروج
          </button>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
