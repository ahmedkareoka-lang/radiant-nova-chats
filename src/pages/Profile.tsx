import { Settings, Edit, Crown, Coins, Diamond, Star, Users, Shield, Zap } from "lucide-react";
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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
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

  const stats = [
    { label: "Followers", value: "1.2K", icon: Users },
    { label: "Following", value: "348", icon: Star },
    { label: "Gifts Sent", value: "5.4K", icon: Crown },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        {/* Header Background */}
        <div className="relative h-48 gradient-neon overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {isBoss && (
              <button
                onClick={() => navigate("/admin")}
                className="w-10 h-10 rounded-full bg-accent/20 backdrop-blur flex items-center justify-center"
              >
                <Shield className="w-5 h-5 text-accent" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full bg-background/30 backdrop-blur flex items-center justify-center"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-16 relative z-10">
          {/* Avatar with Frame */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Frame overlay */}
              <div className={`relative w-36 h-36 ${isBoss ? "boss-god-frame" : ""}`}>
                <img
                  src={frameImage}
                  alt="Frame"
                  className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none"
                />
                <div className="absolute inset-[15%] rounded-full overflow-hidden z-10">
                  <img
                    src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <button className="absolute bottom-1 right-1 z-30 w-8 h-8 rounded-full gradient-neon flex items-center justify-center glow-neon">
                <Edit className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>

            {/* Name with fire effect for BOSS */}
            <h2 className={`font-black text-xl mt-3 ${isBoss ? "boss-fire-text" : "glow-neon-text"}`}>
              {profile?.display_name || "User"}
            </h2>
            <span className="text-xs text-muted-foreground mb-1">
              ID: <span className={isBoss ? "text-accent font-bold" : ""}>{profile?.user_id}</span>
            </span>

            {/* VVVIP badge for BOSS */}
            {isBoss ? (
              <motion.div
                className="mt-1 px-4 py-1.5 rounded-full font-black text-sm flex items-center gap-1.5"
                style={{
                  background: "linear-gradient(135deg, hsl(0 100% 50%), hsl(45 100% 55%), hsl(270 100% 65%))",
                  backgroundSize: "200% 200%",
                }}
                animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="w-4 h-4" />
                VVVIP • GOD MODE
              </motion.div>
            ) : (
              <VipBadge level={profile?.vip_level || 0} size="lg" />
            )}
          </div>

          {/* Balances */}
          <div className="flex gap-3 mt-6">
            <div className="flex-1 card-nova p-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-accent" />
              <div>
                <p className="text-[10px] text-muted-foreground">Coins</p>
                <p className="font-bold text-sm text-accent">
                  {isBoss ? "∞" : (profile?.coins || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex-1 card-nova p-3 flex items-center gap-2">
              <Diamond className="w-5 h-5 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Diamonds</p>
                <p className="font-bold text-sm text-primary">
                  {isBoss ? "999K+" : (profile?.diamonds || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card-nova p-3 text-center">
                <stat.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="font-bold text-sm">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Level bar */}
          <div className="mt-6 card-nova p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold">Level {isBoss ? "MAX" : profile?.level || 1}</span>
              <span className="text-muted-foreground">{isBoss ? "100%" : "45%"}</span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: isBoss
                    ? "linear-gradient(90deg, hsl(0 100% 50%), hsl(45 100% 55%))"
                    : "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                }}
                initial={{ width: 0 }}
                animate={{ width: isBoss ? "100%" : "45%" }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 py-3 rounded-full bg-destructive/20 text-destructive font-bold btn-nova"
          >
            تسجيل الخروج
          </button>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Profile;
