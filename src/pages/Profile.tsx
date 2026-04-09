import { Settings, Edit, Crown, Coins, Diamond, Star, Users, Shield, Zap, Package, ArrowRightLeft, TrendingUp, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import bossFrame from "@/assets/boss-frame.png";
import lionFrame from "@/assets/lion-frame.png";
import PageTransition from "@/components/PageTransition";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);

      // Get real gift stats
      const { count: sentCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("sender_id", user.id);
      const { count: receivedCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", user.id);
      setGiftStats({ sent: sentCount || 0, received: receivedCount || 0 });
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const isBoss = profile?.is_boss;
  const frameImage = isBoss ? bossFrame : lionFrame;
  const wealthLevel = profile?.wealth_level || 1;
  const charismaLevel = profile?.charisma_level || 1;
  const wealthProgress = ((profile?.wealth_xp || 0) % 10000) / 100;
  const charismaProgress = ((profile?.charisma_xp || 0) % 10000) / 100;

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
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
              <div className={`relative w-36 h-36 ${isBoss ? "boss-god-frame" : ""}`}>
                <img src={frameImage} alt="Frame" className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />
                <div className="absolute inset-[15%] rounded-full overflow-hidden z-10">
                  <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
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
          <div className="grid grid-cols-3 gap-3 mt-4">
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
