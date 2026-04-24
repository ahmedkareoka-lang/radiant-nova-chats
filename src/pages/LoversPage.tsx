import { ArrowLeft, Heart, Sparkles, X, Users, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import LoveBadge from "@/components/LoveBadge";
import { LOVE_PERKS, LOVE_THRESHOLDS, LOVE_ACTIVATION_COST, getLoveProgress } from "@/lib/loveLevels";
import { useLoveCouple } from "@/hooks/useLoveCouple";

interface Mutual {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_id: string;
}

const LoversPage = () => {
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; display_name: string; coins: number } | null>(null);
  const [mutuals, setMutuals] = useState<Mutual[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [activating, setActivating] = useState(false);
  const { couple, refetch } = useLoveCouple(myId);

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
    // Choose partner from people I FOLLOW (المتابَعون)
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
    if (couple) { toast.info("لديك حبيب/ة بالفعل"); return; }
    if ((myProfile?.coins ?? 0) < LOVE_ACTIVATION_COST) {
      toast.error(`تحتاج ${LOVE_ACTIVATION_COST.toLocaleString()} عملة للتفعيل`);
      return;
    }
    await loadMutuals();
    setShowPicker(true);
  };

  const handleActivate = async (partnerId: string) => {
    setActivating(true);
    const { error } = await supabase.rpc("activate_love_couple", { _partner_id: partnerId });
    setActivating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("💕 تم تفعيل علاقة حبيبين!");
    setShowPicker(false);
    refetch();
    // refresh balance
    const { data: p } = await supabase.from("profiles").select("avatar_url, display_name, coins").eq("id", myId!).single();
    setMyProfile(p as any);
  };

  const handleBreakup = async () => {
    if (!confirm("هل أنت متأكد من إلغاء علاقة حبيبين؟")) return;
    const { error } = await supabase.rpc("deactivate_love_couple");
    if (error) { toast.error(error.message); return; }
    toast.success("تم الإلغاء");
    refetch();
  };

  const progress = couple ? getLoveProgress(couple.love_points) : null;

  return (
    <PageTransition>
      <div className="min-h-screen pb-20" style={{
        background: "radial-gradient(ellipse at top, hsl(330 70% 20%), hsl(280 50% 12%) 60%, hsl(0 0% 5%))",
      }}>
        {/* Romantic Banner */}
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: "linear-gradient(135deg, hsl(330 80% 35%) 0%, hsl(280 70% 30%) 50%, hsl(340 80% 40%) 100%)",
          }} />
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
              {i % 3 === 0 ? "💖" : i % 3 === 1 ? "💕" : "🌸"}
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
              <Heart className="w-14 h-14 text-pink-300 fill-pink-400" style={{ filter: "drop-shadow(0 0 20px hsl(330 90% 60%))" }} />
            </motion.div>
            <h1 className="text-3xl font-black text-white" style={{ textShadow: "0 0 16px hsl(330 90% 60%)" }}>
              حبيبين 💕
            </h1>
            <p className="text-pink-100 text-sm">رابطة الحب الأبدي</p>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto -mt-4 relative z-20 space-y-4">
          {/* Current couple card OR activation CTA */}
          {couple ? (
            <div className="rounded-3xl p-6 border-2 border-pink-400/40 backdrop-blur-md" style={{
              background: "linear-gradient(135deg, hsl(330 70% 25% / 0.5), hsl(280 60% 20% / 0.5))",
              boxShadow: "0 8px 40px hsl(330 90% 50% / 0.3)",
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

              {/* Progress to next level */}
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
                إلغاء العلاقة
              </button>
            </div>
          ) : (
            <div className="rounded-3xl p-6 border-2 border-pink-400/40 backdrop-blur-md text-center" style={{
              background: "linear-gradient(135deg, hsl(330 70% 25% / 0.5), hsl(280 60% 20% / 0.5))",
            }}>
              <Sparkles className="w-12 h-12 mx-auto text-pink-300 mb-2" />
              <h2 className="text-xl font-black text-white mb-2">فعّل علاقة حبيبين</h2>
              <p className="text-sm text-pink-100 mb-4">اربط نفسك مع شخص من متابعَيك بشكل دائم وأظهروا للجميع حبكم</p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-2xl font-black text-yellow-300">{LOVE_ACTIVATION_COST.toLocaleString()}</span>
                <span className="text-yellow-300">🪙 رسوم التفعيل</span>
              </div>
              <button
                onClick={handleOpenPicker}
                disabled={(myProfile?.coins ?? 0) < LOVE_ACTIVATION_COST}
                className="w-full py-3 rounded-full font-black text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, hsl(330 90% 55%), hsl(280 90% 55%))" }}
              >
                💕 اختر حبيب/ة
              </button>
              <p className="text-[11px] text-pink-200 mt-2">رصيدك: {(myProfile?.coins ?? 0).toLocaleString()} 🪙</p>
            </div>
          )}

          {/* Levels & Perks */}
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

          {/* How it works */}
          <div className="rounded-2xl p-4 border border-pink-400/20 bg-background/30 backdrop-blur-sm">
            <h3 className="font-black text-foreground mb-2">كيف يعمل النظام؟</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
              <li>التفعيل بـ <span className="text-yellow-300 font-bold">10,000 عملة</span> ويبدأ من المستوى 1</li>
              <li>تزداد النقاط عند تبادل الهدايا بينكم في أي غرفة</li>
              <li>كل مستوى جديد يكشف ميزة بصرية أفخم</li>
              <li>الاختيار من <span className="text-pink-300 font-bold">قائمة المتابَعين (الأصدقاء الذين تتابعهم)</span></li>
              <li>كل شخص يمكنه أن يكون حبيباً لشخص واحد فقط</li>
            </ul>
          </div>
        </main>

        {/* Picker Modal */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
              onClick={() => setShowPicker(false)}
            >
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30 }}
                className="w-full max-w-lg bg-card rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto border-t-2 border-pink-400/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-foreground">اختر حبيب/ة 💕</h3>
                  <button onClick={() => setShowPicker(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {mutuals.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">لا يوجد أحد في قائمة المتابَعين</p>
                    <p className="text-xs text-muted-foreground mt-1">تابع أصدقاءك أولاً ثم اختر منهم</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mutuals.map((m) => (
                      <button
                        key={m.id}
                        disabled={activating}
                        onClick={() => handleActivate(m.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl border border-pink-400/20 bg-secondary/30 hover:bg-pink-500/20 transition-colors disabled:opacity-50"
                      >
                        <img src={m.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-400/40" />
                        <div className="flex-1 text-right">
                          <p className="font-bold text-sm text-foreground">{m.display_name}</p>
                          <p className="text-[10px] text-muted-foreground">ID: {m.user_id}</p>
                        </div>
                        <Heart className="w-5 h-5 text-pink-400" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default LoversPage;
