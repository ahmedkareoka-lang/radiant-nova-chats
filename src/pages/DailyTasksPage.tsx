import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Clock, Gamepad2, CheckCircle2 } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";

interface TaskRow {
  gifts_sent: number;
  room_minutes: number;
  games_played: number;
  gift_reward_claimed: boolean;
  room_reward_claimed: boolean;
  games_reward_claimed: boolean;
}

const DailyTasksPage = () => {
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchTasks = async (uid: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", uid)
      .eq("task_date", today)
      .maybeSingle();
    setTask(
      data || {
        gifts_sent: 0,
        room_minutes: 0,
        games_played: 0,
        gift_reward_claimed: false,
        room_reward_claimed: false,
        games_reward_claimed: false,
      }
    );
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await fetchTasks(user.id);
    })();
  }, [navigate]);

  const claim = async (type: "gift" | "room" | "games") => {
    if (!userId) return;
    setClaiming(type);
    const { error } = await supabase.rpc("claim_daily_reward", {
      _user_id: userId,
      _task_type: type,
    });
    if (error) {
      toast.error(error.message.includes("Not completed") || error.message.includes("not completed") ? "أكمل المهمة أولاً" : "حدث خطأ");
    } else {
      toast.success("تمت المكافأة! 🎁");
      await fetchTasks(userId);
    }
    setClaiming(null);
  };

  const tasks = task
    ? [
        {
          id: "gift",
          icon: Gift,
          title: "إرسال هدية",
          desc: "أرسل هدية واحدة لأي مستخدم",
          progress: task.gifts_sent,
          required: 1,
          reward: 500,
          claimed: task.gift_reward_claimed,
          color: "from-pink-500/30 to-rose-700/30",
          border: "border-pink-500/40",
        },
        {
          id: "room",
          icon: Clock,
          title: "البقاء في غرفة 30 دقيقة",
          desc: "ابقَ نشطاً في غرفة صوتية",
          progress: task.room_minutes,
          required: 30,
          reward: 1000,
          claimed: task.room_reward_claimed,
          color: "from-blue-500/30 to-indigo-700/30",
          border: "border-blue-500/40",
        },
        {
          id: "games",
          icon: Gamepad2,
          title: "العب 3 جولات",
          desc: "العب 3 جولات في أي لعبة",
          progress: task.games_played,
          required: 3,
          reward: 800,
          claimed: task.games_reward_claimed,
          color: "from-purple-500/30 to-violet-700/30",
          border: "border-purple-500/40",
        },
      ]
    : [];

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-accent">🎯 المهام اليومية</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
          <div className="rounded-3xl p-5 text-center" style={{ background: "linear-gradient(135deg, hsl(45 90% 40% / 0.2), hsl(35 80% 30% / 0.2))", border: "1px solid hsl(45 80% 50% / 0.3)" }}>
            <p className="text-sm text-muted-foreground mb-1">مكافآت يومية متجددة</p>
            <p className="text-3xl font-black glow-gold-text flex items-center justify-center gap-2">2,300 <CurrencyIcon type="gold" size="lg" /></p>
            <p className="text-xs text-muted-foreground mt-1">إجمالي المكافآت اليوم</p>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : (
            tasks.map((t) => {
              const Icon = t.icon;
              const completed = t.progress >= t.required;
              const percent = Math.min(100, (t.progress / t.required) * 100);
              return (
                <div key={t.id} className={`rounded-2xl p-4 border ${t.border} bg-gradient-to-br ${t.color}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-background/40 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{t.progress} / {t.required}</span>
                      <span className="text-accent font-bold flex items-center gap-1">
                        <CurrencyIcon type="gold" size="xs" /> +{t.reward}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-background/40 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-amber-400 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <button
                    disabled={!completed || t.claimed || claiming === t.id}
                    onClick={() => claim(t.id as any)}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                      t.claimed
                        ? "bg-secondary/40 text-muted-foreground"
                        : completed
                        ? "gradient-neon text-primary-foreground"
                        : "bg-secondary/40 text-muted-foreground/60"
                    }`}
                  >
                    {t.claimed ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> تم الاستلام
                      </span>
                    ) : completed ? "🎁 استلام المكافأة" : "أكمل المهمة"}
                  </button>
                </div>
              );
            })
          )}
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default DailyTasksPage;
