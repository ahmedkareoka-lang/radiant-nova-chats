import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import RoomCard from "@/components/RoomCard";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import CurrencyIcon from "@/components/CurrencyIcon";
import PageTransition from "@/components/PageTransition";
import RoomSkeleton from "@/components/RoomSkeleton";
import AnimatedIcon from "@/components/AnimatedIcon";
import { useRooms } from "@/hooks/useRooms";
import { usePresence } from "@/hooks/usePresence";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = ["All", "Music", "Chat", "Gaming", "VIP"];

const Index = () => {
  const navigate = useNavigate();
  const { rooms, loading } = useRooms();
  const { onlineUsers } = usePresence();
  const { unreadCount, notifications } = useNotifications();
  const [profile, setProfile] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (notifications.length > 0 && !notifications[0].is_read) {
      const n = notifications[0];
      toast(n.title, { description: n.message });
    }
  }, [notifications.length]);

  const filteredRooms = activeCategory === "All" ? rooms : rooms.filter((r) => r.type === activeCategory);

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        <header className="sticky top-0 z-40 border-b border-border/40" style={{ background: "hsl(260 20% 6% / 0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <div className="flex items-center gap-3" onClick={() => navigate("/profile")} role="button">
              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary">
                <img src={profile?.avatar_url || "https://i.pravatar.cc/100?img=3"} alt="Profile" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{profile?.display_name || "User"}</span>
                  <VipBadge level={profile?.vip_level || 0} />
                </div>
                <span className="text-[10px] text-muted-foreground">ID: {profile?.user_id}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/top-up")} className="flex items-center gap-1 btn-glass px-2.5 py-1">
                <CurrencyIcon type="gold" size="xs" />
                <span className="text-xs font-bold text-accent">{(profile?.coins || 0).toLocaleString()}</span>
              </button>
              <button onClick={() => navigate("/top-up")} className="flex items-center gap-1 btn-glass px-2.5 py-1">
                <CurrencyIcon type="diamond" size="xs" />
                <span className="text-xs font-bold text-primary">{(profile?.diamonds || 0).toLocaleString()}</span>
              </button>
              <div className="relative" onClick={() => navigate("/chat")} role="button">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                    <span className="text-[8px] font-bold text-destructive-foreground">{unreadCount}</span>
                  </div>
                )}
                <span className="absolute -top-2 -left-2 text-[8px] text-green-400 font-bold">{onlineUsers.length}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <AnimatedIcon type="live" className="w-5 h-5" />
              <span className="glow-neon-text">LIVE</span>{" "}
              <span className="text-muted-foreground font-normal text-base">Rooms</span>
            </h1>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-[10px] px-3 py-1 rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                    activeCategory === cat ? "gradient-neon text-primary-foreground glow-neon" : "btn-glass text-muted-foreground hover:text-foreground"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <RoomSkeleton key={i} />)
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">لا توجد غرف حالياً</p>
                <button onClick={() => navigate("/create-room")} className="mt-3 text-primary font-bold text-sm">+ إنشاء غرفة جديدة</button>
              </div>
            ) : (
              filteredRooms.map((room, i) => (
                <div key={room.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                  <RoomCard
                    name={room.name}
                    hostName={room.host_profile?.display_name || "Host"}
                    hostImage={room.host_profile?.avatar_url || "https://i.pravatar.cc/100?img=3"}
                    viewerCount={room.member_count || 0}
                    isVip={(room.host_profile?.vip_level || 0) >= 5}
                    category={room.type}
                    onClick={() => navigate(`/voice-room?id=${room.id}`)}
                  />
                </div>
              ))
            )}
          </div>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Index;
