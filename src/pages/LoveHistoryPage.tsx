import { ArrowLeft, Heart, Gift, TrendingUp, ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import LoveBadge from "@/components/LoveBadge";
import { useLoveCouple } from "@/hooks/useLoveCouple";
import { LOVE_THRESHOLDS, getLoveProgress } from "@/lib/loveLevels";

interface GiftRow {
  id: string;
  gift_name: string;
  gold_amount: number;
  diamond_amount: number;
  created_at: string;
  sender_id: string;
  receiver_id: string;
}

const LoveHistoryPage = () => {
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { couple } = useLoveCouple(myId);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);
      const { data: p } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single();
      setMyAvatar((p as any)?.avatar_url ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!couple || !myId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const partnerId = couple.user1_id === myId ? couple.user2_id : couple.user1_id;
      // Gifts exchanged in either direction since couple was activated
      const { data } = await supabase
        .from("gift_transactions")
        .select("id, gift_name, gold_amount, diamond_amount, created_at, sender_id, receiver_id")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`
        )
        .gte("created_at", couple.activated_at)
        .order("created_at", { ascending: false })
        .limit(200);
      setGifts((data as any) || []);
      setLoading(false);
    })();
  }, [couple, myId]);

  const sentByMe = gifts.filter((g) => g.sender_id === myId);
  const receivedByMe = gifts.filter((g) => g.receiver_id === myId);
  const totalSent = sentByMe.reduce((s, g) => s + Number(g.gold_amount || 0), 0);
  const totalReceived = receivedByMe.reduce((s, g) => s + Number(g.gold_amount || 0), 0);
  const totalCombined = totalSent + totalReceived;
  const progress = couple ? getLoveProgress(couple.love_points) : null;

  // Build level milestones reached
  const milestones = couple
    ? LOVE_THRESHOLDS.slice(0, couple.love_level).map((th, idx) => ({ level: idx + 1, threshold: th }))
    : [];

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{
        background: "radial-gradient(ellipse at top, hsl(330 70% 18%), hsl(280 50% 10%) 60%, hsl(0 0% 4%))",
      }}>
        {/* Header */}
        <header className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 backdrop-blur-md bg-background/40 border-b border-pink-400/20">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-foreground flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
            سجل حبيبين
          </h1>
        </header>

        <main className="px-4 max-w-lg mx-auto pt-4 space-y-4">
          {!couple ? (
            <div className="rounded-3xl p-8 border border-pink-400/30 bg-background/30 backdrop-blur-md text-center">
              <Heart className="w-12 h-12 mx-auto text-pink-400/60 mb-3" />
              <p className="text-foreground font-bold mb-1">لا توجد علاقة حبيبين فعالة</p>
              <p className="text-xs text-muted-foreground mb-4">قم بتفعيل علاقة حبيبين لرؤية السجل</p>
              <button
                onClick={() => navigate("/lovers")}
                className="px-6 py-2 rounded-full font-black text-white"
                style={{ background: "linear-gradient(135deg, hsl(330 90% 55%), hsl(280 90% 55%))" }}
              >
                💕 افتح صفحة حبيبين
              </button>
            </div>
          ) : (
            <>
              {/* Couple summary */}
              <div className="rounded-3xl p-5 border-2 border-pink-400/40 backdrop-blur-md" style={{
                background: "linear-gradient(135deg, hsl(330 70% 25% / 0.5), hsl(280 60% 20% / 0.5))",
                boxShadow: "0 8px 40px hsl(330 90% 50% / 0.3)",
              }}>
                <div className="flex justify-center mb-3">
                  <LoveBadge
                    user1Avatar={myAvatar}
                    user2Avatar={couple.partner?.avatar_url}
                    level={couple.love_level}
                    points={couple.love_points}
                    size="md"
                  />
                </div>
                {progress?.nextTh !== null && (
                  <>
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
                  </>
                )}
                <p className="text-center text-[11px] text-pink-200 mt-2">
                  منذ {new Date(couple.activated_at).toLocaleDateString("ar-EG")}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={<ArrowLeftRight className="w-4 h-4" />} label="إجمالي" value={totalCombined.toLocaleString()} color="hsl(330 90% 60%)" />
                <StatCard icon={<Gift className="w-4 h-4" />} label="أرسلت" value={totalSent.toLocaleString()} color="hsl(45 95% 60%)" />
                <StatCard icon={<Heart className="w-4 h-4" />} label="استلمت" value={totalReceived.toLocaleString()} color="hsl(280 90% 65%)" />
              </div>

              {/* Level timeline */}
              <div className="rounded-2xl p-4 border border-pink-400/20 bg-background/30 backdrop-blur-sm">
                <h3 className="font-black text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-400" /> تطور المستوى
                </h3>
                <div className="relative">
                  <div className="absolute right-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-pink-400/60 via-pink-400/30 to-transparent" />
                  <div className="space-y-3">
                    {milestones.map((m) => (
                      <motion.div
                        key={m.level}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: m.level * 0.05 }}
                        className="flex items-center gap-3 relative pr-8"
                      >
                        <div className="absolute right-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-[10px] font-black text-white ring-2 ring-background">
                          {m.level}
                        </div>
                        <div className="flex-1 bg-pink-500/10 border border-pink-400/30 rounded-xl p-2.5">
                          <p className="text-xs font-bold text-pink-100">المستوى {m.level}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {m.threshold === 0 ? "نقطة البداية 💕" : `${m.threshold.toLocaleString()} نقطة`}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    {couple.love_level < LOVE_THRESHOLDS.length && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        className="flex items-center gap-3 relative pr-8"
                      >
                        <div className="absolute right-0 w-6 h-6 rounded-full bg-secondary border-2 border-dashed border-pink-400/50 flex items-center justify-center text-[10px] font-black text-muted-foreground ring-2 ring-background">
                          {couple.love_level + 1}
                        </div>
                        <div className="flex-1 bg-secondary/30 border border-dashed border-pink-400/30 rounded-xl p-2.5">
                          <p className="text-xs font-bold text-muted-foreground">المستوى التالي</p>
                          <p className="text-[10px] text-muted-foreground">
                            تبقى {progress?.remaining.toLocaleString()} نقطة
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gifts log */}
              <div className="rounded-2xl p-4 border border-pink-400/20 bg-background/30 backdrop-blur-sm">
                <h3 className="font-black text-foreground mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-400" /> آخر الهدايا المتبادلة
                </h3>
                {loading ? (
                  <p className="text-xs text-muted-foreground text-center py-6">جاري التحميل…</p>
                ) : gifts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">لا توجد هدايا بعد. تبادلوا الهدايا لزيادة نقاط الحب 💕</p>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {gifts.map((g) => {
                      const sent = g.sender_id === myId;
                      return (
                        <li
                          key={g.id}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${
                            sent ? "border-yellow-400/30 bg-yellow-500/5" : "border-pink-400/30 bg-pink-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg">{sent ? "📤" : "📥"}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">
                                {g.gift_name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {sent ? "أرسلت" : "استلمت"} • {new Date(g.created_at).toLocaleDateString("ar-EG")}
                              </p>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs font-black text-yellow-300">{Number(g.gold_amount).toLocaleString()} 🪙</p>
                            <p className="text-[10px] text-blue-300">+{Number(g.diamond_amount).toLocaleString()} 💎</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </PageTransition>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="rounded-2xl p-3 border border-pink-400/20 bg-background/30 backdrop-blur-sm text-center">
    <div className="mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1.5" style={{ background: `${color}20`, color }}>
      {icon}
    </div>
    <p className="text-base font-black text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default LoveHistoryPage;
