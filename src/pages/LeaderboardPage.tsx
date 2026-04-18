import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Crown, Gem, TrendingUp, Heart, Globe, Flag, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";
import NovaSpinner from "@/components/NovaSpinner";
import EmptyState from "@/components/EmptyState";
import { FRAME_MAP } from "@/lib/frameConfig";

type TabId = "sender" | "receiver" | "charm" | "wealth";
type PeriodId = "daily" | "weekly" | "monthly" | "all";
type ScopeId = "global" | "country" | "agency";

const TABS: { id: TabId; label: string; emoji: string; color: string }[] = [
  { id: "sender", label: "أكثر إنفاقاً", emoji: "💸", color: "from-amber-400 to-orange-500" },
  { id: "receiver", label: "أكثر استلاماً", emoji: "💎", color: "from-pink-400 to-purple-500" },
  { id: "charm", label: "الكاريزما", emoji: "💖", color: "from-rose-400 to-pink-500" },
  { id: "wealth", label: "الثروة", emoji: "👑", color: "from-yellow-400 to-amber-600" },
];

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "daily", label: "اليوم" },
  { id: "weekly", label: "الأسبوع" },
  { id: "monthly", label: "الشهر" },
  { id: "all", label: "كل الوقت" },
];

const SCOPES: { id: ScopeId; label: string; icon: any }[] = [
  { id: "global", label: "عالمي", icon: Globe },
  { id: "country", label: "بلدي", icon: Flag },
  { id: "agency", label: "وكالتي", icon: Building2 },
];

const periodToDate = (p: PeriodId): string | null => {
  const now = new Date();
  if (p === "all") return null;
  if (p === "daily") {
    now.setHours(0, 0, 0, 0);
  } else if (p === "weekly") {
    now.setDate(now.getDate() - 7);
  } else if (p === "monthly") {
    now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString();
};

interface Leader {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_id: string;
  equipped_frame: string | null;
  vip_level: number;
  country_code: string | null;
  agency_id: string | null;
  value: number; // the metric we're ranking by
  level?: number;
}

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("sender");
  const [period, setPeriod] = useState<PeriodId>("weekly");
  const [scope, setScope] = useState<ScopeId>("global");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string; country_code: string | null; agency_id: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, country_code, agency_id")
        .eq("id", user.id)
        .single();
      if (data) setMe(data);
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = periodToDate(period);

      let aggregated: Leader[] = [];

      if (activeTab === "sender" || activeTab === "receiver") {
        // Aggregate gift_transactions
        const col = activeTab === "sender" ? "sender_id" : "receiver_id";
        let query = supabase
          .from("gift_transactions")
          .select(`${col}, gold_amount, diamond_amount`)
          .limit(1000);
        if (since) query = query.gte("created_at", since);
        const { data: txs } = await query;

        const totals: Record<string, number> = {};
        (txs as any[] | null)?.forEach((t) => {
          const uid = t[col];
          const amount = activeTab === "sender" ? Number(t.gold_amount || 0) : Number(t.diamond_amount || 0);
          totals[uid] = (totals[uid] || 0) + amount;
        });
        const userIds = Object.keys(totals);
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, user_id, equipped_frame, vip_level, country_code, agency_id")
            .in("id", userIds);
          aggregated = (profs || []).map((p: any) => ({
            ...p,
            value: totals[p.id] || 0,
          }));
        }
      } else {
        // wealth or charm — read from profiles directly
        const orderCol = activeTab === "wealth" ? "wealth_xp" : "charisma_xp";
        const levelCol = activeTab === "wealth" ? "wealth_level" : "charisma_level";
        const { data: profs } = await supabase
          .from("profiles")
          .select(`id, display_name, avatar_url, user_id, equipped_frame, vip_level, country_code, agency_id, ${orderCol}, ${levelCol}`)
          .order(orderCol, { ascending: false })
          .limit(100);
        aggregated = (profs || []).map((p: any) => ({
          ...p,
          value: p[orderCol] || 0,
          level: p[levelCol] || 1,
        }));
      }

      // Apply scope filter
      if (scope === "country" && me?.country_code) {
        aggregated = aggregated.filter((l) => l.country_code === me.country_code);
      } else if (scope === "agency" && me?.agency_id) {
        aggregated = aggregated.filter((l) => l.agency_id === me.agency_id);
      }

      aggregated.sort((a, b) => b.value - a.value);
      setLeaders(aggregated.slice(0, 50));
      setLoading(false);
    };
    load();
  }, [activeTab, period, scope, me]);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);
  const tabConfig = TABS.find((t) => t.id === activeTab)!;

  const myRank = useMemo(() => {
    if (!me) return null;
    const idx = leaders.findIndex((l) => l.id === me.id);
    return idx >= 0 ? idx + 1 : null;
  }, [leaders, me]);

  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, hsl(260 35% 8%), hsl(260 25% 4%))" }}>
        {/* Header */}
        <header
          className="sticky top-0 z-40 border-b border-border/30"
          style={{ background: "hsl(260 28% 6% / 0.92)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} aria-label="رجوع">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Crown className="w-5 h-5 text-accent" />
            <h1 className="font-black text-base glow-gold-text">قائمة المتصدرين</h1>
          </div>

          {/* Main Tabs (4 categories) */}
          <div className="flex gap-1.5 px-3 pb-2.5 max-w-lg mx-auto overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${
                  activeTab === t.id
                    ? `bg-gradient-to-r ${t.color} text-foreground shadow-[0_0_12px_hsl(45_100%_55%/0.3)]`
                    : "bg-secondary/50 text-muted-foreground border border-border/30"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Period + Scope row */}
          <div className="flex items-center gap-2 px-3 pb-2 max-w-lg mx-auto">
            <div className="flex gap-1 flex-1">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`flex-1 text-[10px] py-1 rounded-full font-bold transition-all ${
                    period === p.id ? "bg-primary/30 text-foreground border border-primary/60" : "bg-secondary/30 text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 pb-2 max-w-lg mx-auto">
            {SCOPES.map((s) => {
              const Icon = s.icon;
              const disabled = (s.id === "country" && !me?.country_code) || (s.id === "agency" && !me?.agency_id);
              return (
                <button
                  key={s.id}
                  disabled={disabled}
                  onClick={() => setScope(s.id)}
                  className={`flex-1 flex items-center justify-center gap-1 text-[10px] py-1 rounded-full font-bold transition-all ${
                    scope === s.id ? "gradient-neon text-primary-foreground" : "bg-secondary/30 text-muted-foreground"
                  } ${disabled ? "opacity-40" : ""}`}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </header>

        <main className="px-3 max-w-lg mx-auto pt-3">
          {loading ? (
            <NovaSpinner text="جارٍ التحميل..." />
          ) : leaders.length === 0 ? (
            <EmptyState icon="🏆" title="لا توجد بيانات حالياً" subtitle="كن أول من يتصدر القائمة!" />
          ) : (
            <>
              {/* PODIUM */}
              {top3.length > 0 && (
                <div className="relative mb-5 pt-6">
                  {/* Glowing background */}
                  <div
                    className="absolute inset-0 -top-4 opacity-40 blur-2xl"
                    style={{ background: `radial-gradient(circle at 50% 30%, hsl(45 100% 55% / 0.4), transparent 70%)` }}
                  />

                  <div className="relative flex items-end justify-center gap-2">
                    {/* Order: 2nd, 1st (taller), 3rd */}
                    {[1, 0, 2].map((idx, position) => {
                      const user = top3[idx];
                      if (!user) return <div key={idx} className="w-20" />;
                      const isFirst = idx === 0;
                      const frameImg = user.equipped_frame && FRAME_MAP[user.equipped_frame];
                      const podiumHeight = isFirst ? "h-24" : idx === 1 ? "h-16" : "h-12";
                      const podiumColors = [
                        "from-yellow-400/40 to-amber-700/20", // 1st
                        "from-slate-300/40 to-slate-500/20",  // 2nd
                        "from-orange-400/40 to-orange-800/20", // 3rd
                      ];
                      const crowns = ["👑", "🥈", "🥉"];

                      return (
                        <motion.div
                          key={user.id}
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: position * 0.15, type: "spring", stiffness: 130 }}
                          onClick={() => navigate(`/user?id=${user.id}`)}
                          className="flex flex-col items-center cursor-pointer flex-1 max-w-[110px]"
                        >
                          {/* Crown floating animation for #1 */}
                          {isFirst && (
                            <motion.div
                              animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              className="text-3xl mb-1 drop-shadow-[0_0_8px_hsl(45_100%_55%/0.8)]"
                            >
                              {crowns[idx]}
                            </motion.div>
                          )}
                          {!isFirst && <span className="text-xl mb-1">{crowns[idx]}</span>}

                          {/* Avatar with frame */}
                          <div className={`relative ${isFirst ? "w-20 h-20" : "w-14 h-14"} mb-1.5`}>
                            {frameImg ? (
                              <>
                                <img src={frameImg} alt="" className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />
                                <div className={`absolute ${isFirst ? "inset-[15%]" : "inset-[12%]"} rounded-full overflow-hidden z-10`}>
                                  <img src={user.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
                                </div>
                              </>
                            ) : (
                              <div
                                className={`w-full h-full rounded-full overflow-hidden ring-[3px] ${
                                  isFirst ? "ring-accent shadow-[0_0_18px_hsl(45_100%_55%/0.7)]" : idx === 1 ? "ring-slate-300" : "ring-orange-500"
                                }`}
                              >
                                <img src={user.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>

                          <p className={`font-black truncate max-w-full ${isFirst ? "text-sm" : "text-xs"}`}>{user.display_name}</p>

                          {/* Podium pillar */}
                          <div
                            className={`w-full mt-1.5 ${podiumHeight} rounded-t-xl bg-gradient-to-b ${podiumColors[idx]} border-t border-x border-accent/40 flex items-center justify-center backdrop-blur-sm`}
                          >
                            <div className="text-center">
                              <p className={`font-black bg-gradient-to-r ${tabConfig.color} bg-clip-text text-transparent ${isFirst ? "text-base" : "text-xs"}`}>
                                {formatValue(user.value)}
                              </p>
                              <p className="text-[8px] text-muted-foreground">{tabConfig.emoji}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* My rank pill (sticky-ish) */}
              {myRank && (
                <div className="card-glass p-2.5 mb-3 flex items-center gap-3">
                  <span className={`text-sm font-black bg-gradient-to-r ${tabConfig.color} bg-clip-text text-transparent w-8 text-center`}>
                    #{myRank}
                  </span>
                  <span className="text-[11px] text-muted-foreground">ترتيبك الحالي</span>
                  <span className="ml-auto text-[11px] font-black text-accent">
                    {formatValue(leaders.find((l) => l.id === me?.id)?.value || 0)} {tabConfig.emoji}
                  </span>
                </div>
              )}

              {/* List rank 4+ */}
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {rest.map((user, i) => (
                    <motion.div
                      key={user.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      onClick={() => navigate(`/user?id=${user.id}`)}
                      className="card-nova p-2.5 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <span className="text-xs font-black text-muted-foreground w-6 text-center">{i + 4}</span>
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-border/60">
                        <img src={user.avatar_url || "https://i.pravatar.cc/60"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {user.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black bg-gradient-to-r ${tabConfig.color} bg-clip-text text-transparent`}>
                          {formatValue(user.value)}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{tabConfig.emoji}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            </>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default LeaderboardPage;
