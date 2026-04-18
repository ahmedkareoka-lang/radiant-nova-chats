import { ArrowLeft, TrendingUp, Heart, Users, Star, Crown, MessageCircle, UserPlus, UserMinus, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useConversations } from "@/hooks/useChat";
import VipBadge from "@/components/VipBadge";
import DualBadge from "@/components/DualBadge";
import EquippedBadge from "@/components/EquippedBadge";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import { FRAME_MAP, FRAME_ANIMATION, bossFrame } from "@/lib/frameConfig";

const UserProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });
  const [activeTab, setActiveTab] = useState("personal");
  const { followersCount, followingCount, isFollowing, toggleFollow, currentUserId } = useFollows(userId);
  const { startConversation } = useConversations();

  useEffect(() => {
    if (!userId) { navigate("/"); return; }
    const load = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!data) { navigate("/"); return; }
      setProfile(data);
      const { count: sent } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("sender_id", userId);
      const { count: received } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", userId);
      setGiftStats({ sent: sent || 0, received: received || 0 });
      setLoading(false);
    };
    load();
  }, [userId, navigate]);

  const handleChat = async () => {
    if (!userId) return;
    const convId = await startConversation(userId);
    if (convId) navigate(`/chat?conv=${convId}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  const isBoss = profile?.is_boss;
  const frameKey = profile?.equipped_frame;
  const frameImage = (frameKey && FRAME_MAP[frameKey]) ? FRAME_MAP[frameKey] : (isBoss ? bossFrame : null);
  const isMe = currentUserId === userId;
  const tabs = ["الصفحة الشخصية", "بطاقة العلاقات", "الألعاب"];

  return (
    <PageTransition>
      <div className="min-h-screen">
        {/* Full-width cover photo */}
        <div className="relative h-72 overflow-hidden">
          <img
            src={profile?.avatar_url || "https://i.pravatar.cc/600?img=3"}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          
          {/* Back button */}
          <button onClick={() => navigate(-1)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-background/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Purple Info Card - overlapping the cover */}
        <div className="px-4 -mt-20 relative z-10">
          <div className="max-w-lg mx-auto">
            <div className="rounded-2xl p-4 border border-primary/20" style={{ background: "linear-gradient(135deg, hsl(270 50% 25% / 0.9), hsl(260 40% 15% / 0.95))", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center gap-3">
                {/* Small avatar */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  {frameImage && (
                    <img src={frameImage} alt="Frame" className={`absolute inset-0 w-full h-full object-contain z-20 pointer-events-none ${frameKey ? (FRAME_ANIMATION[frameKey] || "") : ""}`} />
                  )}
                  <div className="absolute inset-[12%] rounded-full overflow-hidden z-10">
                    <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="" className="w-full h-full object-cover" />
                  </div>
                </div>
                
                <div className="flex-1 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <h2 className="font-black text-base">{profile?.display_name}</h2>
                    {profile?.gender && <span className="text-xs">{profile.gender === "male" ? "♂" : "♀"}</span>}
                    {profile?.country_code && <span className="text-xs">🏳️</span>}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-0.5">
                    <span className="text-[10px] text-foreground/60">● متصل</span>
                    <span className="text-[10px] text-foreground/60">ID: {profile?.user_id}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1 flex-wrap">
                    {isBoss ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/30 text-destructive font-bold">🔥 BOSS</span>
                    ) : (
                      <DualBadge novaLevel={profile?.nova_p_level || 0} vipLevel={profile?.vip_level || 0} size="lg" luxury />
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {!isMe && (
                <div className="flex gap-2 mt-3">
                  <button onClick={toggleFollow}
                    className={`flex-1 py-2 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 ${isFollowing ? "bg-secondary/50 text-foreground border border-border/30" : "gradient-neon text-primary-foreground glow-neon"}`}>
                    {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> إلغاء</> : <><UserPlus className="w-3.5 h-3.5" /> متابعة</>}
                  </button>
                  <button onClick={handleChat} className="flex-1 py-2 rounded-full bg-secondary/50 text-foreground font-bold text-xs flex items-center justify-center gap-1.5 border border-border/30">
                    <MessageCircle className="w-3.5 h-3.5" /> محادثة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Social Stats */}
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <p className="font-bold text-base">{giftStats.received}</p>
              <p className="text-[10px] text-muted-foreground">أصدقاء</p>
            </div>
            <div className="w-px bg-border/30" />
            <div className="text-center">
              <p className="font-bold text-base">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">المعجبون</p>
            </div>
            <div className="w-px bg-border/30" />
            <div className="text-center">
              <p className="font-bold text-base">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">متابعة</p>
            </div>
            <div className="w-px bg-border/30" />
            <div className="text-center">
              <p className="font-bold text-base">{giftStats.sent}</p>
              <p className="text-[10px] text-muted-foreground">زائر</p>
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="max-w-lg mx-auto px-4 mt-5">
          <div className="flex justify-center gap-6 border-b border-border/20 pb-2">
            {tabs.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(["personal", "relations", "games"][i])}
                className={`text-sm font-bold pb-1 transition-colors relative ${activeTab === ["personal", "relations", "games"][i] ? "text-primary" : "text-muted-foreground/50"}`}>
                {tab}
                {activeTab === ["personal", "relations", "games"][i] && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-4 pb-10">
            {activeTab === "personal" && (
              <div className="space-y-3">
                {/* Levels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-nova p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[10px] font-bold">الثروة Lv.{profile?.wealth_level || 1}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--accent)), hsl(45 100% 55%))" }}
                        initial={{ width: 0 }} animate={{ width: `${((profile?.wealth_xp || 0) % 10000) / 100}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                  <div className="card-nova p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Heart className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-bold">الكاريزما Lv.{profile?.charisma_level || 1}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(270 100% 65%))" }}
                        initial={{ width: 0 }} animate={{ width: `${((profile?.charisma_xp || 0) % 10000) / 100}%` }} transition={{ duration: 1 }} />
                    </div>
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
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
              </div>
            )}
            {activeTab === "games" && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">قريباً...</p>
              </div>
            )}
            {activeTab === "relations" && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">لا توجد علاقات بعد</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default UserProfile;
