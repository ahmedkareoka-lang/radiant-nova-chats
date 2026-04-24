import { ArrowLeft, TrendingUp, Heart, Users, Star, Crown, MessageCircle, UserPlus, UserMinus, Coins as CoinsIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useConversations } from "@/hooks/useChat";
import DualBadge from "@/components/DualBadge";
import EquippedBadge from "@/components/EquippedBadge";
import TierBadge from "@/components/TierBadge";
import PageTransition from "@/components/PageTransition";
import FramedAvatar from "@/components/FramedAvatar";
import LoveBadge from "@/components/LoveBadge";
import RechargeAgentBadge from "@/components/RechargeAgentBadge";
import AgentTransferModal from "@/components/AgentTransferModal";
import { useIsRechargeAgent } from "@/hooks/useIsRechargeAgent";
import { useLoveCouple } from "@/hooks/useLoveCouple";
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
  const { couple: loveCouple } = useLoveCouple(userId);
  const targetIsAgent = useIsRechargeAgent(userId);
  const meIsAgent = useIsRechargeAgent(currentUserId);
  const [transferOpen, setTransferOpen] = useState(false);

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
  const frameImage = (frameKey && FRAME_MAP[frameKey]) ? FRAME_MAP[frameKey] : null;
  // For admin-store frames the equipped key may be a direct URL
  const directFrameImage = (!frameImage && frameKey && (frameKey.startsWith("http") || frameKey.startsWith("/"))) ? frameKey : null;
  const finalFrame = frameImage || directFrameImage;
  const isMe = currentUserId === userId;
  const tabs = ["الصفحة الشخصية", "بطاقة العلاقات", "الألعاب"];

  return (
    <PageTransition>
      <div className="min-h-screen pb-10">
        {/* === COVER + AVATAR (matches own-profile style) === */}
        <div className="relative">
          <div className="relative w-full h-56 overflow-hidden">
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full"
                style={{ background: "linear-gradient(135deg, hsl(280 60% 25%), hsl(260 50% 18%) 50%, hsl(45 70% 30%))" }}
              />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 0%, transparent 50%, hsl(var(--background) / 0.95) 100%)" }} />

            <button onClick={() => navigate(-1)} className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-background/40 backdrop-blur-md flex items-center justify-center border border-border/30">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Big framed avatar overlapping cover */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-14 z-10">
            <div
              className="rounded-full p-1"
              style={{ background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(280 90% 60%))" }}
            >
              <div className="rounded-full bg-background p-0.5">
                <FramedAvatar
                  avatarUrl={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"}
                  equippedFrame={frameKey}
                  isRechargeAgent={targetIsAgent}
                  size={120}
                />
              </div>
            </div>
          </div>
        </div>

        {/* === USER INFO === */}
        <main className="px-4 max-w-lg mx-auto pt-20">
          <div className="flex flex-col items-center text-center">
            <h2 className={`font-black text-2xl ${isBoss ? "boss-fire-text" : "text-foreground"}`}>
              {profile?.display_name || "User"}
            </h2>

            {/* All badges visible to public */}
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
              {targetIsAgent && <RechargeAgentBadge size="md" />}
            </div>

            {/* Wealth & Charm tier badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
              <TierBadge level={profile?.wealth_level || 1} type="wealth" size="md" />
              <TierBadge level={profile?.charisma_level || 1} type="charm" size="md" />
            </div>

            <span className="text-[11px] text-muted-foreground mt-1.5">ID: {profile?.user_id}</span>

            {/* Action buttons */}
            {!isMe && (
              <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
                <div className="flex gap-2">
                  <button onClick={toggleFollow}
                    className={`flex-1 py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 ${isFollowing ? "bg-secondary/50 text-foreground border border-border/30" : "gradient-neon text-primary-foreground glow-neon"}`}>
                    {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> إلغاء</> : <><UserPlus className="w-3.5 h-3.5" /> متابعة</>}
                  </button>
                  <button onClick={handleChat} className="flex-1 py-2.5 rounded-full bg-secondary/50 text-foreground font-bold text-xs flex items-center justify-center gap-1.5 border border-border/30">
                    <MessageCircle className="w-3.5 h-3.5" /> محادثة
                  </button>
                </div>
                {meIsAgent && (
                  <button
                    onClick={() => setTransferOpen(true)}
                    className="w-full py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 text-white
                      bg-gradient-to-r from-red-700 via-red-500 to-orange-500
                      shadow-[0_0_14px_hsl(0_85%_55%/0.6)] border border-yellow-200/60"
                  >
                    <CoinsIcon className="w-3.5 h-3.5" /> شحن عملات لهذا المستخدم
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Love couple badge */}
          {loveCouple && (
            <div
              className="mt-4 rounded-3xl p-4 border-2 border-pink-400/40 backdrop-blur-md"
              style={{
                background: "linear-gradient(135deg, hsl(330 70% 25% / 0.5), hsl(280 60% 20% / 0.5))",
                boxShadow: "0 4px 20px hsl(330 90% 50% / 0.25)",
              }}
            >
              <LoveBadge
                user1Avatar={profile?.avatar_url}
                user2Avatar={loveCouple.partner?.avatar_url}
                level={loveCouple.love_level}
                points={loveCouple.love_points}
                size="md"
              />
            </div>
          )}

          {/* Social Stats */}
          <div className="mt-5 rounded-3xl border border-border/30 bg-secondary/30 backdrop-blur-sm p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-black text-base text-foreground">{followersCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">المعجبون</p>
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

          {/* Tabs */}
          <div className="mt-5">
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

            <div className="mt-4 pb-10">
              {activeTab === "personal" && (
                <div className="space-y-3">
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
                <div className="text-center py-8 text-muted-foreground"><p className="text-sm">قريباً...</p></div>
              )}
              {activeTab === "relations" && (
                <div className="text-center py-8 text-muted-foreground"><p className="text-sm">لا توجد علاقات بعد</p></div>
              )}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default UserProfile;
