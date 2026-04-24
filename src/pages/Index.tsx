import { Bell, Search, Crown, Flame, Trophy, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import RoomCard from "@/components/RoomCard";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";
import PageTransition from "@/components/PageTransition";
import RoomSkeleton from "@/components/RoomSkeleton";
import BannerCarousel from "@/components/BannerCarousel";
import { useRooms } from "@/hooks/useRooms";
import { useMyRoom } from "@/hooks/useMyRoom";
import { usePresence } from "@/hooks/usePresence";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOP_TABS = [
  { id: "party", label: "حفلة", emoji: "🎉" },
];

const CATEGORIES = [
  { id: "hot", label: "🔥 شائع" },
  { id: "chat", label: "💬 دردشة", type: "Chat" },
  { id: "music", label: "🎤 غناء", type: "Music" },
  { id: "gaming", label: "🎮 ألعاب", type: "Gaming" },
  { id: "vip", label: "👑 VIP", type: "VIP" },
  { id: "new", label: "🆕 جديد" },
];

const Index = () => {
  const navigate = useNavigate();
  const { rooms, loading } = useRooms();
  const { onlineUsers } = usePresence();
  const { unreadCount, notifications } = useNotifications();
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("party");
  const [activeCategory, setActiveCategory] = useState("hot");
  const [topRechargers, setTopRechargers] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const { myRoomId, loading: myRoomLoading } = useMyRoom(profile?.id ?? null);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleMicButtonClick = () => {
    if (myRoomLoading) return;
    if (myRoomId) {
      navigate(`/voice-room?id=${myRoomId}`);
    } else {
      navigate("/create-room");
    }
  };

  // 🚀 Single combined fetch (profile + top rechargers + banners) in parallel
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const [profileRes, topRes, bannersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, wealth_xp, vip_level")
          .order("wealth_xp", { ascending: false })
          .limit(5),
        supabase
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data);
      setTopRechargers(topRes.data || []);
      setBanners(bannersRes.data || []);
    };
    init();

    // Keep banners live without re-fetching profile/rechargers
    const channel = supabase
      .channel("banners-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, async () => {
        const { data } = await supabase
          .from("banners").select("*").eq("is_active", true).order("sort_order", { ascending: true });
        if (!cancelled) setBanners(data || []);
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, []);

  // 🔔 Toast only when a NEW unread notification arrives (id-based, not length-based)
  useEffect(() => {
    if (notifications.length === 0) return;
    const n = notifications[0];
    if (!n.is_read) toast(n.title, { description: n.message });
  }, [notifications[0]?.id]);

  // Filter & sort rooms based on active category (only public rooms shown on home)
  const filteredRooms = useMemo(() => {
    let list = [...rooms].filter((r: any) => !r.is_private);
    const cat = CATEGORIES.find((c) => c.id === activeCategory);
    if (cat?.type) {
      list = list.filter((r: any) => r.type === cat.type);
    } else if (activeCategory === "hot") {
      list = list.sort((a: any, b: any) => (b.hot_score || 0) - (a.hot_score || 0) || (b.member_count || 0) - (a.member_count || 0));
    } else if (activeCategory === "new") {
      list = list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [rooms, activeCategory]);

  // Determine which rooms are "hot" (top 3 by hot_score)
  const hotRoomIds = useMemo(() => {
    const sorted = [...rooms].filter((r: any) => (r.hot_score || 0) > 0)
      .sort((a: any, b: any) => (b.hot_score || 0) - (a.hot_score || 0))
      .slice(0, 3)
      .map((r) => r.id);
    return new Set(sorted);
  }, [rooms]);

  return (
    <PageTransition>
      <div className="min-h-screen pb-20">
        {/* Premium Header */}
        <header
          className="sticky top-0 z-40 border-b border-border/20"
          style={{ background: "hsl(260 28% 6% / 0.92)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          <div className="px-4 py-2.5 max-w-lg mx-auto">
            {/* Top row: search + balances + bell */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <button onClick={() => navigate("/search")} className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors">
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-1.5">
                <button onClick={() => navigate("/wallet")} className="flex items-center gap-1 bg-secondary/60 rounded-full px-2.5 py-1 hover:bg-secondary transition-colors">
                  <CurrencyIcon type="gold" size="xs" />
                  <span className="text-xs font-bold text-foreground">{(profile?.coins || 0).toLocaleString()}</span>
                </button>
                <button onClick={() => navigate("/top-up")} className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-accent-foreground font-black text-sm hover:scale-110 transition-transform">
                  +
                </button>
              </div>

              <button onClick={() => navigate("/notifications")} className="relative w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[9px] font-black text-destructive-foreground flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tabs row */}
            <div className="flex items-center justify-center gap-6">
              {TOP_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative text-sm font-black transition-all ${activeTab === tab.id ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full gradient-neon" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="px-3 py-3 max-w-lg mx-auto">
          {/* Banner Carousel (Soulmatch style with auto-rotation) */}
          {banners.length > 0 ? (
            <BannerCarousel
              banners={banners}
              onBannerClick={(b) => {
                if (b.link_url) window.location.href = b.link_url;
              }}
            />
          ) : (
            <div
              className="relative rounded-2xl overflow-hidden mb-4 cursor-pointer h-32"
              onClick={() => navigate("/leaderboard")}
              style={{ background: "linear-gradient(135deg, hsl(35 80% 30%), hsl(45 90% 40%), hsl(25 70% 25%))" }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Crown className="w-5 h-5 text-accent" />
                  <span className="text-base font-black glow-gold-text">الشحن الأسبوعي</span>
                  <Crown className="w-5 h-5 text-accent" />
                </div>
                <div className="flex items-center gap-1">
                  {topRechargers.slice(0, 5).map((user, i) => (
                    <div key={user.id} className="flex flex-col items-center">
                      <div className={`rounded-full overflow-hidden ${i === 0 ? "w-10 h-10 ring-2 ring-accent" : "w-8 h-8 ring-1 ring-accent/50"}`}>
                        <img src={user.avatar_url || `https://i.pravatar.cc/60?img=${i + 5}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      {i < 3 && <span className="text-[8px] font-bold mt-0.5">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick action tiles row (Yalla-style) — 6 tiles in 2 rows */}
          <div className="grid grid-cols-4 gap-2 mb-2">
            <button onClick={() => navigate("/leaderboard")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-gold">
              <div className="w-9 h-9 rounded-xl gradient-gold flex items-center justify-center">
                <Trophy className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="text-[9px] font-bold text-foreground/90">الترتيب</span>
            </button>
            <button onClick={() => navigate("/games")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-purple">
              <div className="w-9 h-9 rounded-xl gradient-neon flex items-center justify-center text-base">🎮</div>
              <span className="text-[9px] font-bold text-foreground/90">الألعاب</span>
            </button>
            <button onClick={() => navigate("/store")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-pink">
              <div className="w-9 h-9 rounded-xl gradient-vip flex items-center justify-center">
                <Gift className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-[9px] font-bold text-foreground/90">المتجر</span>
            </button>
            <button onClick={() => navigate("/agencies")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-white">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-base">🏰</div>
              <span className="text-[9px] font-bold text-foreground/90">الوكالات</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button onClick={() => navigate("/vip")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-orange">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center">
                <Crown className="w-5 h-5 text-foreground" />
              </div>
              <span className="text-[9px] font-bold text-foreground/90">VIP</span>
            </button>
            <button onClick={() => navigate("/nova-pass")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-pink">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-base">✨</div>
              <span className="text-[9px] font-bold text-foreground/90">NOVA Pass</span>
            </button>
            <button onClick={() => navigate("/daily-tasks")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-mint">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-base">🎯</div>
              <span className="text-[9px] font-bold text-foreground/90">المهام</span>
            </button>
            <button onClick={() => navigate("/lucky-box")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-gold">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-base">🎰</div>
              <span className="text-[9px] font-bold text-foreground/90">صندوق الحظ</span>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <button onClick={() => navigate("/streak")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-fire">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-base">🔥</div>
              <span className="text-[9px] font-bold text-foreground/90">الستريك</span>
            </button>
            <button onClick={() => navigate("/invite-friends")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-purple">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-base">👥</div>
              <span className="text-[9px] font-bold text-foreground/90">ادعُ صديق</span>
            </button>
            <button onClick={() => navigate("/posts")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-cyan">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-500 flex items-center justify-center text-base">📸</div>
              <span className="text-[9px] font-bold text-foreground/90">المنشورات</span>
            </button>
            <button onClick={() => navigate("/nova-p")} className="flex flex-col items-center gap-1 p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-all hover:-translate-y-0.5 accent-white">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-base">⭐</div>
              <span className="text-[9px] font-bold text-foreground/90">NOVA P</span>
            </button>
          </div>

          {/* Categories scrollable bar */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-[11px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "gradient-neon text-primary-foreground shadow-[0_0_12px_hsl(270_100%_65%/0.5)]"
                    : "bg-secondary/50 text-muted-foreground border border-border/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Section title */}
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-black text-foreground flex items-center gap-1">
              <Flame className="w-4 h-4 text-accent" />
              غرف صوتية مباشرة
            </h2>
            <span className="text-[10px] text-muted-foreground">{filteredRooms.length} غرفة</span>
          </div>

          {/* Room Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <RoomSkeleton key={i} />)
            ) : filteredRooms.length === 0 ? (
              <div className="col-span-2 text-center py-10 text-muted-foreground">
                <p className="text-4xl mb-2">🎤</p>
                <p className="text-sm mb-3">لا توجد غرف في هذا التصنيف</p>
                <button onClick={() => navigate("/create-room")} className="text-primary font-bold text-sm bg-primary/10 px-4 py-2 rounded-full">
                  + إنشاء غرفة جديدة
                </button>
              </div>
            ) : (
              filteredRooms.map((room: any, i) => (
                <div key={room.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}>
                  <RoomCard
                    name={room.name}
                    hostName={room.host_profile?.display_name || "Host"}
                    hostImage={room.host_profile?.avatar_url || "https://i.pravatar.cc/100?img=3"}
                    viewerCount={room.member_count || 0}
                    isVip={(room.host_profile?.vip_level || 0) >= 5}
                    category={room.type}
                    hostNovaLevel={room.host_profile?.nova_p_level || 0}
                    hostVipLevel={room.host_profile?.vip_level || 0}
                    micPreviews={room.mic_previews || []}
                    isHot={hotRoomIds.has(room.id)}
                    roomImage={room.room_image}
                    onClick={() => navigate(`/voice-room?id=${room.id}`)}
                  />
                </div>
              ))
            )}
          </div>
        </main>

        {/* Floating mic button — opens user's room or create flow */}
        <button
          onClick={handleMicButtonClick}
          disabled={myRoomLoading}
          className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-[0_0_24px_hsl(45_100%_55%/0.6)] hover:scale-110 active:scale-95 transition-transform animate-pulse-glow disabled:opacity-60"
          aria-label={myRoomId ? "غرفتي" : "إنشاء غرفة"}
        >
          <span className="text-2xl">🎤</span>
        </button>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Index;
