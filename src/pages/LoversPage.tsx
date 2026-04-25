import { ArrowLeft, Heart, Sparkles, History, Inbox, Send } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import LoveBadge from "@/components/LoveBadge";
import { LOVE_PERKS, LOVE_THRESHOLDS, getLoveProgress } from "@/lib/loveLevels";
import { useLoveCouple } from "@/hooks/useLoveCouple";
import { useRelationshipRequests } from "@/hooks/useRelationshipRequests";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/relationshipTypes";
import RelationshipRequestModal from "@/components/RelationshipRequestModal";
import RelationshipRequestCard from "@/components/RelationshipRequestCard";
import GiftMemoryWall from "@/components/GiftMemoryWall";
import { differenceInDays } from "date-fns";

interface Mutual {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_id: string;
}

type Tab = "couple" | "requests" | "memories";

const LoversPage = () => {
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; display_name: string; coins: number } | null>(null);
  const [mutuals, setMutuals] = useState<Mutual[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState<Tab>("couple");

  const { couple, refetch } = useLoveCouple(myId);
  const { incoming, outgoing, refetch: refetchRequests } = useRelationshipRequests(myId);

  const relType = (couple as any)?.relationship_type as RelationshipType | undefined ?? "lover";
  const meta = RELATIONSHIP_TYPES[relType];
  const anniversaryDate = (couple as any)?.anniversary_date ?? (couple as any)?.activated_at;
  const daysTogether = anniversaryDate ? differenceInDays(new Date(), new Date(anniversaryDate)) : 0;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data: p } = await supabase.from("profiles").select("avatar_url, display_name, coins").eq("id", user.id).single();
      setMyProfile(p as any);
    })();
  }, []);

  const loadMutuals = async () => {
    if (!myId) return;
    const { data: iFollow } = await supabase.from("follows").select("following_id").eq("follower_id", myId);
    if (!iFollow) return;
    const followingIds = iFollow.map((r) => r.following_id);
    if (followingIds.length === 0) { setMutuals([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, user_id")
      .in("id", followingIds);
    setMutuals((profiles as any) || []);
  };

  const handleOpenPicker = async () => {
    if (couple) { toast.info("لديك علاقة نشطة بالفعل"); return; }
    await loadMutuals();
    setShowPicker(true);
  };

  const handleBreakup = async () => {
    if (!confirm("هل أنت متأكد من إنهاء العلاقة؟")) return;
    const { error } = await supabase.rpc("deactivate_love_couple");
    if (error) { toast.error(error.message); return; }
    toast.success("تم الإلغاء");
    refetch();
  };

  const refreshAll = async () => {
    await Promise.all([
      refetch(),
      refetchRequests(),
      myId ? supabase.from("profiles").select("avatar_url, display_name, coins").eq("id", myId).single().then(({ data }) => setMyProfile(data as any)) : Promise.resolve(),
    ]);
  };

  const progress = couple ? getLoveProgress(couple.love_points) : null;
  const totalRequests = incoming.length + outgoing.length;

  const headerGradient = useMemo(() => couple ? meta.gradient : "linear-gradient(135deg, hsl(330 80% 35%), hsl(280 70% 30%))", [couple, meta]);

  return (
    <PageTransition>
      <div className="min-h-screen pb-20" style={{
        background: "radial-gradient(ellipse at top, hsl(330 70% 20%), hsl(280 50% 12%) 60%, hsl(0 0% 5%))",
      }}>
        {/* Romantic Banner */}
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0" style={{ background: headerGradient }} />
          {/* Floating hearts */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-pink-200"
              style={{
                left: `${(i * 7) % 100}%`,
                fontSize: `${12 + (i % 3) * 6}px`,
                opacity: 0.5 + (i % 3) * 0.15,
              }}
              initial={{ y: 240 }}
              animate={{ y: -40 }}
              transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: i * 0.4, ease: "linear" }}
            >
              {i % 3 === 0 ? meta.emoji : i % 3 === 1 ? "💕" : "🌸"}
            </motion.div>
          ))}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, transparent 50%, hsl(280 50% 12% / 0.95) 100%)",
          }} />

          <button onClick={() => navigate(-1)} className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-background/30 backdrop-blur-md flex items-center justify-center border border-pink-400/30">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => navigate("/love-history")}
            className="absolute top-4 left-4 z-20 h-10 px-3 rounded-full bg-background/30 backdrop-blur-md flex items-center gap-1.5 border border-pink-400/30 text-xs font-bold text-foreground"
          >
            <History className="w-4 h-4" />
            السجل
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <Heart className="w-14 h-14 text-pink-300 fill-pink-400" style={{ filter: `drop-shadow(0 0 20px ${meta.glow})` }} />
            </motion.div>
            <h1 className="text-3xl font-black text-white" style={{ textShadow: `0 0 16px ${meta.glow}` }}>
              العلاقات {meta.emoji}
            </h1>
            <p className="text-pink-100 text-sm">
              {couple ? `${meta.label} منذ ${daysTogether} يوم` : "اختر نوع علاقتك مع شخص مميز"}
            </p>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-4 relative z-20 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-background/40 backdrop-blur-md border border-pink-400/20">
            <TabBtn icon={<Heart className="w-4 h-4" />} label="علاقتي" active={tab === "couple"} onClick={() => setTab("couple")} />
            <TabBtn
              icon={<Inbox className="w-4 h-4" />}
              label="الطلبات"
              badge={totalRequests > 0 ? totalRequests : undefined}
              active={tab === "requests"}
              onClick={() => setTab("requests")}
            />
            <TabBtn icon={<Sparkles className="w-4 h-4" />} label="الذكريات" active={tab === "memories"} onClick={() => setTab("memories")} disabled={!couple} />
          </div>

          {/* TAB: Couple */}
          {tab === "couple" && (
            couple ? (
              <div className="rounded-3xl p-6 border-2 backdrop-blur-md" style={{
                borderColor: meta.glow + "60",
                background: `linear-gradient(135deg, ${meta.glow}1f, hsl(280 60% 20% / 0.5))`,
                boxShadow: `0 8px 40px ${meta.glow}50`,
              }}>
                <div className="flex justify-center mb-4">
                  <LoveBadge
                    user1Avatar={myProfile?.avatar_url}
                    user2Avatar={couple.partner?.avatar_url}
                    level={couple.love_level}
                    points={couple.love_points}
                    size="lg"
                  />
                </div>

                {/* Type label */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-xs font-black text-white" style={{ background: meta.gradient }}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="text-xs text-pink-200">• {daysTogether} يوم معاً</span>
                </div>

                {/* Progress */}
                {progress?.nextTh !== null && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-pink-200 mb-1">
                      <span>Lv.{couple.love_level}</span>
                      <span>{couple.love_points.toLocaleString()} / {progress?.nextTh?.toLocaleString()}</span>
                      <span>Lv.{couple.love_level + 1}</span>
                    </div>
                    <div className="h-2 rounded-full bg-background/30 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, hsl(330 90% 55%), hsl(45 95% 60%))" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress?.pct ?? 0}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                    <p className="text-center text-[11px] text-pink-200 mt-1">
                      تبقى {progress?.remaining.toLocaleString()} نقطة للمستوى {couple.love_level + 1}
                    </p>
                  </div>
                )}

                <p className="text-center text-xs text-pink-100 mt-3 leading-relaxed">
                  💡 أرسلوا الهدايا لبعض في أي غرفة لزيادة نقاط الحب
                </p>

                <button
                  onClick={handleBreakup}
                  className="mt-4 w-full py-2 rounded-full bg-destructive/20 border border-destructive/40 text-destructive font-bold text-xs"
                >
                  إنهاء العلاقة
                </button>
              </div>
            ) : (
              <div className="rounded-3xl p-6 border-2 border-pink-400/40 backdrop-blur-md text-center" style={{
                background: "linear-gradient(135deg, hsl(330 70% 25% / 0.5), hsl(280 60% 20% / 0.5))",
              }}>
                <Sparkles className="w-12 h-12 mx-auto text-pink-300 mb-2" />
                <h2 className="text-xl font-black text-white mb-2">ابدأ علاقتك</h2>
                <p className="text-sm text-pink-100 mb-4">اختر بين 3 أنواع علاقات وأرسل طلباً لشخص تتابعه. الطلب يتطلب موافقته.</p>
                <button
                  onClick={handleOpenPicker}
                  className="w-full py-3 rounded-full font-black text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(330 90% 55%), hsl(280 90% 55%))" }}
                >
                  <Send className="w-4 h-4" /> إرسال طلب علاقة
                </button>
                <p className="text-[11px] text-pink-200 mt-2 flex items-center justify-center gap-1">
                  رصيدك: {(myProfile?.coins ?? 0).toLocaleString()} <CurrencyIcon type="gold" size="xs" />
                </p>
              </div>
            )
          )}

          {/* TAB: Requests */}
          {tab === "requests" && (
            <div className="space-y-3">
              <section>
                <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-pink-300" /> طلبات واردة ({incoming.length})
                </h3>
                {incoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-border/20 bg-background/20">
                    لا توجد طلبات واردة
                  </p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {incoming.map((r) => <RelationshipRequestCard key={r.id} request={r} onChanged={refreshAll} />)}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-purple-300" /> طلبات مُرسَلة ({outgoing.length})
                </h3>
                {outgoing.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-border/20 bg-background/20">
                    لم ترسل أي طلبات
                  </p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {outgoing.map((r) => <RelationshipRequestCard key={r.id} request={r} onChanged={refreshAll} />)}
                    </AnimatePresence>
                  </div>
                )}
              </section>

              {!couple && (
                <button
                  onClick={handleOpenPicker}
                  className="w-full py-3 rounded-full font-black text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(330 90% 55%), hsl(280 90% 55%))" }}
                >
                  <Send className="w-4 h-4" /> طلب علاقة جديدة
                </button>
              )}
            </div>
          )}

          {/* TAB: Memories */}
          {tab === "memories" && couple && (
            <GiftMemoryWall myId={myId} partnerId={couple.partner?.id ?? null} partnerName={couple.partner?.display_name} />
          )}

          {/* Levels & Perks (always visible) */}
          {tab === "couple" && (
            <div className="rounded-2xl p-4 border border-pink-400/20 bg-background/30 backdrop-blur-sm">
              <h3 className="font-black text-foreground mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" /> المستويات والمكافآت
              </h3>
              <div className="space-y-2">
                {LOVE_THRESHOLDS.map((threshold, idx) => {
                  const lvl = idx + 1;
                  const reached = couple ? couple.love_level >= lvl : false;
                  return (
                    <div
                      key={lvl}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                        reached ? "border-pink-400/50 bg-pink-500/10" : "border-border/20 bg-background/20"
                      }`}
                    >
                      <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-black text-xs ${
                        reached ? "bg-gradient-to-br from-pink-400 to-rose-500 text-white" : "bg-secondary text-muted-foreground"
                      }`}>
                        {lvl}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${reached ? "text-pink-200" : "text-foreground"}`}>
                          {LOVE_PERKS[lvl]}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {threshold === 0 ? "بداية الرحلة" : `يتطلب ${threshold.toLocaleString()} نقطة`}
                        </p>
                      </div>
                      {reached && <span className="text-pink-300">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        <RelationshipRequestModal
          open={showPicker}
          onClose={() => setShowPicker(false)}
          mutuals={mutuals}
          myCoins={myProfile?.coins ?? 0}
          onSent={refreshAll}
        />
      </div>
    </PageTransition>
  );
};

interface TabBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  disabled?: boolean;
}

const TabBtn = ({ icon, label, active, onClick, badge, disabled }: TabBtnProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative flex-1 py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all ${
      active ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md" : "text-muted-foreground"
    } ${disabled ? "opacity-40" : ""}`}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center px-1">
        {badge}
      </span>
    )}
  </button>
);

export default LoversPage;
