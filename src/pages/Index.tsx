import { Bell, Search, Crown, Flame, Trophy } from "lucide-react";
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
  const [topRechargers, setTopRechargers] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);

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
    const fetchTopRechargers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, wealth_xp, vip_level")
        .order("wealth_xp", { ascending: false })
        .limit(5);
      setTopRechargers(data || []);
    };
    fetchTopRechargers();

    const fetchBanners = async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setBanners(data || []);
    };
    fetchBanners();

    const channel = supabase
      .channel("banners-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => fetchBanners())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
          <div className="relative rounded-2xl overflow-hidden mb-4 cursor-pointer" onClick={() => navigate("/leaderboard")}>
            <div className="h-36 relative" style={{ background: "linear-gradient(135deg, hsl(35 80% 30%), hsl(45 90% 40%), hsl(25 70% 25%))" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-accent" />
                  <span className="text-lg font-black glow-gold-text">الشحن الأسبوعي</span>
                  <Crown className="w-6 h-6 text-accent" />
                </div>
                <div className="flex items-center gap-1">
                  {topRechargers.slice(0, 5).map((user, i) => (
                    <div key={user.id} className="flex flex-col items-center">
                      <div className={`rounded-full overflow-hidden ${i === 0 ? "w-12 h-12 ring-2 ring-accent" : "w-9 h-9 ring-1 ring-accent/50"}`}>
                        <img src={user.avatar_url || `https://i.pravatar.cc/60?img=${i + 5}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      {i < 3 && (
                        <span className="text-[8px] font-bold mt-0.5">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-foreground/70 mt-1">اشحن الآن واحصل على مكافآت حصرية</p>
              </div>
            </div>
          </div>

          {/* Admin Banners (live) */}
          {banners.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-3 mb-3 scrollbar-none">
              {banners.map((b) => (
                <a
                  key={b.id}
                  href={b.link_url || "#"}
                  onClick={(e) => { if (!b.link_url) e.preventDefault(); }}
                  className="flex-shrink-0 w-72 h-28 rounded-2xl overflow-hidden bg-secondary"
                >
                  <img src={b.image_url} alt={b.title || "banner"} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}

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
            <div className="card-gradient-blue p-3 cursor-pointer" onClick={() => navigate("/leaderboard")}>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {topRechargers.slice(0, 2).map((u, i) => (
                    <div key={u.id} className="w-8 h-8 rounded-full ring-1 ring-primary overflow-hidden">
                      <img src={u.avatar_url || `https://i.pravatar.cc/40?img=${10 + i}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <span className="text-sm font-bold">Top NOVA</span>
              </div>
            </div>
            <div className="card-gradient-blue p-3 cursor-pointer" onClick={() => navigate("/leaderboard")}>
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {topRechargers.slice(2, 4).map((u, i) => (
                    <div key={u.id} className="w-8 h-8 rounded-full ring-1 ring-accent overflow-hidden">
                      <img src={u.avatar_url || `https://i.pravatar.cc/40?img=${15 + i}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <span className="text-sm font-bold">الكاريزما</span>
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