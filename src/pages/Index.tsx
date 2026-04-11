import { Bell, Search, Crown, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import RoomCard from "@/components/RoomCard";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";
import CurrencyIcon from "@/components/CurrencyIcon";
import PageTransition from "@/components/PageTransition";
import RoomSkeleton from "@/components/RoomSkeleton";
import { useRooms } from "@/hooks/useRooms";
import { usePresence } from "@/hooks/usePresence";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categories = ["حفلة", "خاصي"];
const countryFilters = ["Hot 🔥", "Morocco 🇲🇦", "Yemen 🇾🇪", "Syria 🇸🇾", "Iraq 🇮🇶"];

const Index = () => {
  const navigate = useNavigate();
  const { rooms, loading } = useRooms();
  const { onlineUsers } = usePresence();
  const { unreadCount, notifications } = useNotifications();
  const [profile, setProfile] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState("حفلة");
  const [activeCountry, setActiveCountry] = useState("Hot 🔥");

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

  const filteredRooms = rooms;

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/search")} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`text-sm font-bold transition-all ${activeCategory === cat ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="px-4 py-3 max-w-lg mx-auto">
          {/* Weekly Recharge Banner */}
          <div className="relative rounded-2xl overflow-hidden mb-4 cursor-pointer" onClick={() => navigate("/top-up")}>
            <div className="h-32 relative" style={{ background: "linear-gradient(135deg, hsl(35 80% 30%), hsl(45 90% 40%), hsl(25 70% 25%))" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Crown className="w-6 h-6 text-accent" />
                    <span className="text-lg font-black glow-gold-text">الشحن الأسبوعي</span>
                    <Crown className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-[10px] text-foreground/70">اشحن الآن واحصل على مكافآت حصرية</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute bottom-2 left-4 flex -space-x-2">
                <div className="w-10 h-10 rounded-full ring-2 ring-gold overflow-hidden">
                  <img src="https://i.pravatar.cc/60?img=5" alt="" className="w-full h-full object-cover" />
                </div>
                <div className="w-10 h-10 rounded-full ring-2 ring-gold overflow-hidden">
                  <img src="https://i.pravatar.cc/60?img=8" alt="" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Country Filter Tags */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
            {countryFilters.map((filter) => (
              <button key={filter} onClick={() => setActiveCountry(filter)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                  activeCountry === filter ? "gradient-neon text-primary-foreground" : "bg-secondary/50 text-muted-foreground border border-border/30"
                }`}>
                {filter}
              </button>
            ))}
          </div>

          {/* Ranking cards row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="card-gradient-blue p-3 cursor-pointer" onClick={() => navigate("/search")}>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full ring-1 ring-primary overflow-hidden">
                    <img src="https://i.pravatar.cc/40?img=10" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full ring-1 ring-primary overflow-hidden">
                    <img src="https://i.pravatar.cc/40?img=12" alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                <span className="text-sm font-bold">الجاذبية</span>
              </div>
            </div>
            <div className="card-gradient-blue p-3 cursor-pointer" onClick={() => navigate("/search")}>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full ring-1 ring-accent overflow-hidden">
                    <img src="https://i.pravatar.cc/40?img=15" alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-8 h-8 rounded-full ring-1 ring-accent overflow-hidden">
                    <img src="https://i.pravatar.cc/40?img=18" alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                <span className="text-sm font-bold">الغرفة</span>
              </div>
            </div>
          </div>

          {/* Room Grid */}
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <RoomSkeleton key={i} />)
            ) : filteredRooms.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
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
