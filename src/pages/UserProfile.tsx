import { ArrowLeft, TrendingUp, Heart, Users, Star, Crown, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFollows } from "@/hooks/useFollows";
import { useConversations } from "@/hooks/useChat";
import VipBadge from "@/components/VipBadge";
import CurrencyIcon from "@/components/CurrencyIcon";
import PageTransition from "@/components/PageTransition";
import { motion } from "framer-motion";
import bossFrame from "@/assets/boss-frame.png";
import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import lionFrame from "@/assets/lion-frame.png";
import { toast } from "sonner";

const FRAME_MAP: Record<string, string> = {
  "frame-purple-wings": framePurpleWings,
  "frame-royal-crown": frameRoyalCrown,
  "lion-frame": lionFrame,
  "boss-frame": bossFrame,
};

const UserProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("id");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [giftStats, setGiftStats] = useState({ sent: 0, received: 0 });
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  const isBoss = profile?.is_boss;
  const frameKey = profile?.equipped_frame;
  const frameImage = (frameKey && FRAME_MAP[frameKey]) ? FRAME_MAP[frameKey] : (isBoss ? bossFrame : null);
  const frameSize = isBoss ? "w-36 h-36" : "w-32 h-32";
  const avatarInset = isBoss ? "inset-[18%]" : "inset-[15%]";
  const isMe = currentUserId === userId;

  return (
    <PageTransition>
      <div className="min-h-screen pb-10">
        <div className="relative h-40 gradient-neon overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-background/30 backdrop-blur flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-14 relative z-10">
          <div className="flex flex-col items-center">
            <div className={`relative ${frameSize}`}>
              {frameImage && <img src={frameImage} alt="Frame" className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />}
              <div className={`absolute ${avatarInset} rounded-full overflow-hidden z-10`}>
                <img src={profile?.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            <h2 className={`font-black text-xl mt-3 ${isBoss ? "boss-fire-text" : "glow-neon-text"}`}>{profile?.display_name}</h2>
            <span className="text-xs text-muted-foreground">
              ID: {profile?.user_id}
              {profile?.gender && <span className="ml-2">{profile.gender === "male" ? "👨" : "👩"}</span>}
              {profile?.country_code && <span className="ml-2">🌍 {profile.country_code}</span>}
            </span>
            {isBoss ? (
              <div className="mt-1 px-3 py-1 rounded-full bg-destructive/20 text-xs font-bold">🔥 BOSS</div>
            ) : (
              <VipBadge level={profile?.vip_level || 0} size="lg" />
            )}
          </div>

          {/* Follow Stats */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="font-bold text-sm">{followersCount}</p>
              <p className="text-[10px] text-muted-foreground">متابعين</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm">{followingCount}</p>
              <p className="text-[10px] text-muted-foreground">يتابع</p>
            </div>
          </div>

          {/* Actions */}
          {!isMe && (
            <div className="flex gap-3 mt-4">
              <button onClick={toggleFollow}
                className={`flex-1 py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 ${isFollowing ? "bg-secondary text-foreground" : "gradient-neon text-primary-foreground"}`}>
                {isFollowing ? <><UserMinus className="w-4 h-4" /> إلغاء المتابعة</> : <><UserPlus className="w-4 h-4" /> متابعة</>}
              </button>
              <button onClick={handleChat} className="flex-1 py-2.5 rounded-full bg-secondary text-foreground font-bold text-sm flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> محادثة
              </button>
            </div>
          )}

          {/* Levels */}
          <div className="grid grid-cols-2 gap-3 mt-4">
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
        </main>
      </div>
    </PageTransition>
  );
};

export default UserProfile;
