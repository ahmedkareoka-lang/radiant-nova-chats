import { ArrowLeft, Heart, Sparkles, History, Inbox, Send, Target, Trophy, Gift, Pencil } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { getLoveProgress } from "@/lib/loveLevels";
import { useLoveCouple } from "@/hooks/useLoveCouple";
import { useRelationshipRequests } from "@/hooks/useRelationshipRequests";
import { RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/relationshipTypes";
import RelationshipRequestModal from "@/components/RelationshipRequestModal";
import RelationshipRequestCard from "@/components/RelationshipRequestCard";
import GiftMemoryWall from "@/components/GiftMemoryWall";

import LegendaryLoveBadge from "@/components/love/LegendaryLoveBadge";
import AnniversaryBanner from "@/components/love/AnniversaryBanner";
import LoveStreakBadge from "@/components/love/LoveStreakBadge";
import LovePerksTree from "@/components/love/LovePerksTree";
import LoveQuestsCard from "@/components/love/LoveQuestsCard";
import LoveHallOfFame from "@/components/love/LoveHallOfFame";
import CoupleGiftShop from "@/components/love/CoupleGiftShop";
import LoveRewardsPanel from "@/components/love/LoveRewardsPanel";

interface Mutual {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_id: string;
}

type Tab = "couple" | "quests" | "perks" | "rank" | "requests" | "memories";

const LoversPage = () => {
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; display_name: string; coins: number } | null>(null);
  const [mutuals, setMutuals] = useState<Mutual[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [tab, setTab] = useState<Tab>("couple");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const { couple, refetch } = useLoveCouple(myId);
  const { incoming, outgoing, refetch: refetchRequests } = useRelationshipRequests(myId);

  const relType = (couple as any)?.relationship_type as RelationshipType | undefined ?? "lover";
  const meta = RELATIONSHIP_TYPES[relType];
  const anniversaryDate = (couple as any)?.anniversary_date ?? (couple as any)?.activated_at;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data: p } = await supabase.from("profiles").select("avatar_url, display_name, coins").eq("id", user.id).single();
      setMyProfile(p as any);
    })();
  }, []);

  // Bump streak when both partners visit the page
  useEffect(() => {
    if (couple) { (supabase.rpc("bump_couple_streak") as any).then(() => {}, () => {}); }
  }, [couple?.id]);

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

  const saveCustomTitle = async () => {
    if (!couple) return;
    const clean = titleDraft.trim().slice(0, 30);
    const { error } = await supabase
      .from("love_couples")
      .update({ custom_title: clean || null })
      .eq("id", couple.id);
    if (error) { toast.error("تعذر الحفظ"); return; }
    toast.success("✨ تم حفظ اللقب");
    setEditingTitle(false);
    refetch();
  };

  const progress = couple ? getLoveProgress(couple.love_points) : null;
  const totalRequests = incoming.length + outgoing.length;
  const headerGradient = useMemo(() => couple ? meta.gradient : "linear-gradient(135deg, hsl(330 80% 35%), hsl(280 70% 30%))", [couple, meta]);

  const c: any = couple;

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{
        background: "radial-gradient(ellipse at top, hsl(330 70% 18%), hsl(280 55% 10%) 55%, hsl(0 0% 4%))",
      }}>
        {/* Cinematic Hero */}
        <div className="relative h-72 overflow-hidden">
          <div className="absolute inset-0" style={{ background: headerGradient }} />
          {/* Light rays */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute top-0 w-1/3 h-full pointer-events-none"
              style={{
                left: `${i * 18}%`,
                background: `linear-gradient(180deg, hsl(45 100% 70% / 0.18), transparent 70%)`,
                transformOrigin: "top",
              }}
              animate={{ opacity: [0.15, 0.4, 0.15], scaleY: [1, 1.1, 1] }}
              transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            />
          ))}
          {/* Floating hearts/sparkles */}
          {[...Array(18)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${(i * 6) % 100}%`,
                fontSize: `${10 + (i % 4) * 5}px`,
                opacity: 0.45 + (i % 3) * 0.18,
              }}
              initial={{ y: 280 }}
              animate={{ y: -50 }}
              transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.35, ease: "linear" }}
            >
              {i % 4 === 0 ? meta.emoji : i % 4 === 1 ? "💕" : i % 4 === 2 ? "✨" : "🌸"}
            </motion.div>
          ))}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to bottom, transparent 40%, hsl(280 55% 10% / 0.95) 100%)",
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

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <Heart className="w-12 h-12 text-pink-300 fill-pink-400" style={{ filter: `drop-shadow(0 0 24px ${meta.glow})` }} />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight" style={{ textShadow: `0 0 18px ${meta.glow}` }}>
              عالم الحبيبين {meta.emoji}
            </h1>
            <p className="text-pink-100 text-sm">
              {couple ? `${meta.label} · مستوى ${couple.love_level}` : "ابدأ قصتك الأسطورية"}
            </p>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-6 relative z-20 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-background/45 backdrop-blur-md border border-pink-400/20 overflow-x-auto">
            <TabBtn icon={<Heart className="w-4 h-4" />} label="علاقتي" active={tab === "couple"} onClick={() => setTab("couple")} />
            <TabBtn icon={<Target className="w-4 h-4" />} label="مهام" active={tab === "quests"} onClick={() => setTab("quests")} disabled={!couple} />
            <TabBtn icon={<Sparkles className="w-4 h-4" />} label="مميزات" active={tab === "perks"} onClick={() => setTab("perks")} />
            <TabBtn icon={<Trophy className="w-4 h-4" />} label="ترتيب" active={tab === "rank"} onClick={() => setTab("rank")} />
            <TabBtn icon={<Inbox className="w-4 h-4" />} label="طلبات" badge={totalRequests || undefined} active={tab === "requests"} onClick={() => setTab("requests")} />
            <TabBtn icon={<Gift className="w-4 h-4" />} label="ذكريات" active={tab === "memories"} onClick={() => setTab("memories")} disabled={!couple} />
          </div>

          {/* ============= TAB: Couple ============= */}
          {tab === "couple" && (
            <AnimatePresence mode="wait">
              {couple ? (
                <motion.div key="have" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Hero badge card */}
                  <div className="rounded-3xl p-4 border-2 backdrop-blur-md relative overflow-hidden"
                    style={{
                      borderColor: meta.glow + "70",
                      background: `linear-gradient(135deg, ${meta.glow}22, hsl(280 60% 15% / 0.55))`,
                      boxShadow: `0 8px 50px ${meta.glow}55`,
                    }}>
                    <LegendaryLoveBadge
                      user1Avatar={myProfile?.avatar_url}
                      user1Name={myProfile?.display_name}
                      user2Avatar={couple.partner?.avatar_url}
                      user2Name={couple.partner?.display_name}
                      level={couple.love_level}
                      points={couple.love_points}
                      customTitle={c?.custom_title}
                    />

                    {/* Custom title editor — Lv 9+ */}
                    {couple.love_level >= 9 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {editingTitle ? (
                          <>
                            <input
                              autoFocus
                              value={titleDraft}
                              onChange={(e) => setTitleDraft(e.target.value)}
                              maxLength={30}
                              placeholder="لقبكما الخاص..."
                              className="flex-1 max-w-[200px] px-3 py-1.5 rounded-full bg-background/40 border border-pink-400/40 text-xs text-foreground text-center"
                            />
                            <button onClick={saveCustomTitle} className="text-[11px] px-3 py-1.5 rounded-full bg-pink-500 text-white font-black">حفظ</button>
                            <button onClick={() => setEditingTitle(false)} className="text-[11px] text-muted-foreground">إلغاء</button>
                          </>
                        ) : (
                          <button
                            onClick={() => { setTitleDraft(c?.custom_title ?? ""); setEditingTitle(true); }}
                            className="text-[11px] px-3 py-1.5 rounded-full bg-background/40 border border-pink-400/30 text-pink-200 font-bold flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" /> {c?.custom_title ? "غيّر اللقب" : "أضف لقباً خاصاً (Lv9+)"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Progress */}
                    {progress?.nextTh !== null && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[11px] text-pink-200 mb-1.5 font-bold">
                          <span>Lv.{couple.love_level}</span>
                          <span>{couple.love_points.toLocaleString()} / {progress?.nextTh?.toLocaleString()}</span>
                          <span>Lv.{couple.love_level + 1}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-background/40 overflow-hidden relative">
                          <motion.div
                            className="h-full rounded-full relative"
                            style={{ background: "linear-gradient(90deg, hsl(330 95% 60%), hsl(45 100% 60%), hsl(280 95% 60%))" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress?.pct ?? 0}%` }}
                            transition={{ duration: 1.2 }}
                          >
                            <motion.div
                              className="absolute inset-0"
                              style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.4), transparent)" }}
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </motion.div>
                        </div>
                        <p className="text-center text-[10px] text-pink-200 mt-1.5">
                          متبقي {progress?.remaining.toLocaleString()} نقطة للمستوى التالي
                        </p>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black text-white" style={{ background: meta.gradient }}>
                        {meta.emoji} {meta.label}
                      </span>
                      {c?.streak_days > 0 && <LoveStreakBadge streakDays={c.streak_days} />}
                    </div>
                  </div>

                  {/* Anniversary */}
                  {anniversaryDate && <AnniversaryBanner anniversaryDate={anniversaryDate} emoji={meta.emoji} />}

                  {/* Rewards panel */}
                  <LoveRewardsPanel
                    level={couple.love_level}
                    weeklyClaimedAt={c?.weekly_gift_claimed_at}
                    monthlyClaimedAt={c?.monthly_anniversary_claimed_at}
                    dailyHeartsCount={c?.daily_hearts_count ?? 0}
                    dailyHeartsDate={c?.daily_hearts_sent_at}
                    onChanged={refreshAll}
                  />

                  <button
                    onClick={handleBreakup}
                    className="w-full py-2.5 rounded-full bg-destructive/15 border border-destructive/40 text-destructive font-bold text-xs"
                  >
                    إنهاء العلاقة
                  </button>
                </motion.div>
              ) : (
                <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-3xl p-6 border-2 border-pink-400/40 backdrop-blur-md text-center"
                  style={{ background: "linear-gradient(135deg, hsl(330 70% 22% / 0.55), hsl(280 60% 18% / 0.55))" }}
                >
                  <motion.div animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                    <Sparkles className="w-14 h-14 mx-auto text-pink-300 mb-3" />
                  </motion.div>
                  <h2 className="text-2xl font-black text-white mb-2">ابدأ قصتك الأسطورية 💞</h2>
                  <p className="text-sm text-pink-100 mb-4 leading-relaxed">
                    اختر شخصاً مميزاً وابدآ رحلة 10 مستويات من المميزات الحصرية: مهام يومية، هدايا أسبوعية،
                    قاعة مشاهير، متجر هدايا خاص، ولقب أسطوري.
                  </p>
                  <button
                    onClick={handleOpenPicker}
                    className="w-full py-3 rounded-full font-black text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, hsl(330 95% 55%), hsl(280 95% 55%))" }}
                  >
                    <Send className="w-4 h-4" /> إرسال طلب علاقة
                  </button>
                  <p className="text-[11px] text-pink-200 mt-2 flex items-center justify-center gap-1">
                    رصيدك: {(myProfile?.coins ?? 0).toLocaleString()} <CurrencyIcon type="gold" size="xs" />
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ============= TAB: Quests ============= */}
          {tab === "quests" && couple && (
            <LoveQuestsCard coupleId={couple.id} />
          )}

          {/* ============= TAB: Perks ============= */}
          {tab === "perks" && (
            <div className="space-y-4">
              <LovePerksTree currentLevel={couple?.love_level ?? 0} currentPoints={couple?.love_points ?? 0} />
              <CoupleGiftShop
                unlocked={(couple?.love_level ?? 0) >= 6}
                onSend={() => toast.info("اذهب إلى الغرفة الصوتية لإرسال الهدية الحصرية لحبيبك 💞")}
              />
            </div>
          )}

          {/* ============= TAB: Rank ============= */}
          {tab === "rank" && <LoveHallOfFame />}

          {/* ============= TAB: Requests ============= */}
          {tab === "requests" && (
            <div className="space-y-3">
              <section>
                <h3 className="text-sm font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-pink-300" /> طلبات واردة ({incoming.length})
                </h3>
                {incoming.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-border/20 bg-background/20">لا توجد طلبات واردة</p>
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
                  <p className="text-xs text-muted-foreground text-center py-4 rounded-xl border border-border/20 bg-background/20">لم ترسل أي طلبات</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {outgoing.map((r) => <RelationshipRequestCard key={r.id} request={r} onChanged={refreshAll} />)}
                    </AnimatePresence>
                  </div>
                )}
              </section>
              {!couple && (
                <button onClick={handleOpenPicker} className="w-full py-3 rounded-full font-black text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(330 95% 55%), hsl(280 95% 55%))" }}>
                  <Send className="w-4 h-4" /> طلب علاقة جديدة
                </button>
              )}
            </div>
          )}

          {/* ============= TAB: Memories ============= */}
          {tab === "memories" && couple && (
            <GiftMemoryWall myId={myId} partnerId={couple.partner?.id ?? null} partnerName={couple.partner?.display_name} />
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
    className={`relative shrink-0 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all ${
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
