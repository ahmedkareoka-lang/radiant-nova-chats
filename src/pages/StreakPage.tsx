import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame, Trophy, CheckCircle2, Lock, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";

interface StreakRow {
  current_streak: number;
  longest_streak: number;
  last_claim_date: string | null;
  total_claims: number;
}

const dayReward = (day: number) => {
  const base = Math.min(200 + day * 100, 2000);
  let bonus = 0;
  if (day % 30 === 0) bonus = 2000;
  else if (day % 7 === 0) bonus = 500;
  return base + bonus;
};

const StreakPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState<StreakRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const refresh = async (uid: string) => {
    const { data } = await supabase.from("user_streaks").select("*").eq("user_id", uid).maybeSingle();
    setStreak(
      (data as StreakRow) || {
        current_streak: 0,
        longest_streak: 0,
        last_claim_date: null,
        total_claims: 0,
      },
    );
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await refresh(user.id);
    })();
  }, [navigate]);

  const today = new Date().toISOString().split("T")[0];
  const claimedToday = streak?.last_claim_date === today;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const willContinue = streak?.last_claim_date === yesterday || streak?.last_claim_date === today;
  const nextDay = willContinue ? (streak?.current_streak ?? 0) + (claimedToday ? 0 : 1) : 1;
  const previewReward = dayReward(claimedToday ? streak!.current_streak : nextDay);

  const claim = async () => {
    if (!userId || claiming || claimedToday) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc("claim_daily_streak", { _user_id: userId });
      if (error) throw error;
      const r = data as any;
      toast.success(`🔥 يوم ${r.streak} — كسبت ${r.total_reward} كوينز!`);
      await refresh(userId);
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
    } finally {
      setClaiming(false);
    }
  };

  // Build day grid (current week / next reset cycle of 30)
  const baseDay = claimedToday ? streak!.current_streak : (streak?.current_streak ?? 0);
  const cycleStart = Math.floor(baseDay / 30) * 30 + 1;
  const days = Array.from({ length: 30 }, (_, i) => cycleStart + i);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span>الستريك اليومي</span>
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <>
              {/* Hero */}
              <div
                className="rounded-3xl p-5 text-center relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, hsl(15 90% 45% / 0.25), hsl(35 90% 45% / 0.25))",
                  border: "1px solid hsl(25 85% 50% / 0.4)",
                }}
              >
                <Flame className="absolute -top-4 -right-4 w-24 h-24 text-orange-500/15" />
                <p className="text-sm text-muted-foreground mb-1">ستريكك الحالي</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Flame className="w-10 h-10 text-orange-400" />
                  <span className="text-5xl font-black text-orange-300">{streak?.current_streak ?? 0}</span>
                  <span className="text-lg text-muted-foreground self-end mb-1">يوم</span>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs mt-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Trophy className="w-3.5 h-3.5 text-accent" /> الأطول: <b className="text-foreground">{streak?.longest_streak ?? 0}</b>
                  </span>
                  <span className="text-muted-foreground">إجمالي: <b className="text-foreground">{streak?.total_claims ?? 0}</b></span>
                </div>
              </div>

              {/* Claim button */}
              <button
                onClick={claim}
                disabled={claimedToday || claiming}
                className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
                  claimedToday
                    ? "bg-secondary/40 text-muted-foreground"
                    : "gradient-neon text-primary-foreground glow-neon hover:scale-[1.02] active:scale-95"
                }`}
              >
                {claimedToday ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> تم استلام مكافأة اليوم
                  </span>
                ) : claiming ? (
                  "جارٍ الاستلام..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🎁 استلم اليوم {nextDay} <span className="opacity-80 flex items-center gap-1">(+{previewReward} <CurrencyIcon type="gold" size="xs" />)</span>
                  </span>
                )}
              </button>

              {/* 30-day grid */}
              <div className="rounded-2xl p-4 bg-secondary/30 border border-border/30">
                <p className="text-xs font-bold mb-3">دورة الـ 30 يوم</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {days.map((d) => {
                    const reward = dayReward(d);
                    const isClaimed = d <= baseDay;
                    const isToday = d === (claimedToday ? baseDay : nextDay);
                    const isMilestone = d % 7 === 0 || d % 30 === 0;
                    return (
                      <div
                        key={d}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[9px] font-bold relative ${
                          isClaimed
                            ? "bg-orange-500/30 border border-orange-400/50 text-orange-200"
                            : isToday
                            ? "gradient-neon text-primary-foreground glow-neon"
                            : isMilestone
                            ? "bg-accent/20 border border-accent/40 text-accent"
                            : "bg-background/40 border border-border/20 text-muted-foreground"
                        }`}
                      >
                        {isClaimed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isMilestone ? (
                          <Gift className="w-3 h-3 mb-0.5" />
                        ) : !isToday ? (
                          <Lock className="w-2.5 h-2.5 opacity-40" />
                        ) : null}
                        <span>{d}</span>
                        {isMilestone && !isClaimed && (
                          <span className="text-[7px] opacity-80">+{reward}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  🎁 يوم 7/14/21/28: +500 بونص &nbsp; • &nbsp; 🏆 يوم 30: +2000 بونص
                </p>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                ⚠️ لو ضيعت يوم، الستريك يبدأ من 1 من تاني!
              </p>
            </>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default StreakPage;
