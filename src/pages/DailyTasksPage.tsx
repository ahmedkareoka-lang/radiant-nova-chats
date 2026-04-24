import { useEffect, useState } from "react";
import { ArrowLeft, Gift, Clock, Gamepad2, CheckCircle2, UserPlus, FileText, Heart, MessageCircle } from "lucide-react";
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
  follows_made: number;
  posts_made: number;
  likes_given: number;
  messages_sent: number;
  gift_reward_claimed: boolean;
  room_reward_claimed: boolean;
  games_reward_claimed: boolean;
  follow_reward_claimed: boolean;
  post_reward_claimed: boolean;
  like_reward_claimed: boolean;
  message_reward_claimed: boolean;
}

const EMPTY_TASK: TaskRow = {
  gifts_sent: 0,
  room_minutes: 0,
  games_played: 0,
  follows_made: 0,
  posts_made: 0,
  likes_given: 0,
  messages_sent: 0,
  gift_reward_claimed: false,
  room_reward_claimed: false,
  games_reward_claimed: false,
  follow_reward_claimed: false,
  post_reward_claimed: false,
  like_reward_claimed: false,
  message_reward_claimed: false,
};

type TaskType = "gift" | "room" | "games" | "follow" | "post" | "like" | "message";

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
    setTask((data as any) || EMPTY_TASK);
    setLoading(false);
  };

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await fetchTasks(user.id);

      // Realtime: update progress as the user completes tasks elsewhere
      const today = new Date().toISOString().split("T")[0];
      const channel = supabase
        .channel(`daily-tasks-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "daily_tasks", filter: `user_id=eq.${user.id}` },
          (payload: any) => {
            const row = payload.new;
            if (row && row.task_date === today) {
              setTask({ ...EMPTY_TASK, ...row });
            }
          }
        )
        .subscribe();

      unsub = () => { supabase.removeChannel(channel); };
    })();
    return () => { unsub?.(); };
  }, [navigate]);

  const claim = async (type: TaskType) => {
    if (!userId) return;
    setClaiming(type);
    const { error } = await supabase.rpc("claim_daily_reward", {
      _user_id: userId,
      _task_type: type,
    });
    if (error) {
      toast.error(error.message.toLowerCase().includes("not completed") ? "أكمل المهمة أولاً" : "حدث خطأ");
    } else {
      toast.success("تمت المكافأة! 🎁");
      await fetchTasks(userId);
    }
    setClaiming(null);
  };

  const tasks = task
    ? [
        {
          id: "gift" as TaskType,
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
          id: "room" as TaskType,
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
          id: "games" as TaskType,
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
        {
          id: "follow" as TaskType,
          icon: UserPlus,
          title: "تابع مستخدماً",
          desc: "تابع شخصاً جديداً اليوم",
          progress: task.follows_made,
          required: 1,
          reward: 300,
          claimed: task.follow_reward_claimed,
          color: "from-emerald-500/30 to-teal-700/30",
          border: "border-emerald-500/40",
        },
        {
          id: "post" as TaskType,
          icon: FileText,
          title: "انشر منشوراً",
          desc: "شارك منشوراً واحداً في الموجز",
          progress: task.posts_made,
          required: 1,
          reward: 400,
          claimed: task.post_reward_claimed,
          color: "from-amber-500/30 to-orange-700/30",
          border: "border-amber-500/40",
        },
        {
          id: "like" as TaskType,
          icon: Heart,
          title: "أعجِب بـ 5 منشورات",
          desc: "ادعم منشورات الآخرين",
          progress: task.likes_given,
          required: 5,
          reward: 250,
          claimed: task.like_reward_claimed,
          color: "from-red-500/30 to-pink-700/30",
          border: "border-red-500/40",
        },
        {
          id: "message" as TaskType,
          icon: MessageCircle,
          title: "أرسل 5 رسائل خاصة",
          desc: "تواصل مع أصدقائك في الدردشة الخاصة",
          progress: task.messages_sent,
          required: 5,
          reward: 350,
          claimed: task.message_reward_claimed,
          color: "from-cyan-500/30 to-sky-700/30",
          border: "border-cyan-500/40",
        },
      ]
    : [];

  const totalRewards = tasks.reduce((s, t) => s + t.reward, 0);

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
            <p className="text-3xl font-black glow-gold-text flex items-center justify-center gap-2">
              {totalRewards.toLocaleString()} <CurrencyIcon type="gold" size="lg" />
            </p>
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
                <div key={t.id} className={`rounded-2xl p-4 border ${t.border} bg-gradient-to-br ${t.color} transition-all`}>
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
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-amber-400 transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <button
                    disabled={!completed || t.claimed || claiming === t.id}
                    onClick={() => claim(t.id)}
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
