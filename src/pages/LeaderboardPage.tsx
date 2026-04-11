import { useState, useEffect } from "react";
import { ArrowLeft, Crown, Gem, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";
import NovaSpinner from "@/components/NovaSpinner";
import EmptyState from "@/components/EmptyState";
import { FRAME_MAP } from "@/lib/frameConfig";

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"wealth" | "charisma">("wealth");
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const orderCol = activeTab === "wealth" ? "wealth_xp" : "charisma_xp";
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, user_id, equipped_frame, wealth_level, wealth_xp, charisma_level, charisma_xp, vip_level")
        .order(orderCol, { ascending: false })
        .limit(50);
      setLeaders(data || []);
      setLoading(false);
    };
    load();
  }, [activeTab]);

  const top3 = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  const medalColors = [
    "from-yellow-400 to-amber-600",
    "from-gray-300 to-gray-500",
    "from-orange-400 to-orange-700",
  ];
  const medalEmoji = ["👑", "🥈", "🥉"];

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
            <Crown className="w-5 h-5 text-accent" />
            <h1 className="font-bold text-lg">Top NOVA Leaders</h1>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setActiveTab("wealth")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "wealth" ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary/50 text-muted-foreground"
            }`}>
            <CurrencyIcon type="gold" size="sm" /> الثروة
          </button>
          <button onClick={() => setActiveTab("charisma")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "charisma" ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary/50 text-muted-foreground"
            }`}>
            <Gem className="w-4 h-4" /> الكاريزما
          </button>
        </div>

        <main className="px-4 max-w-lg mx-auto">
          {loading ? (
            <NovaSpinner text="جارٍ التحميل..." />
          ) : (
            <>
              {/* Top 3 Royal Design */}
              {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 mb-6 pt-4">
                  {[1, 0, 2].map((idx) => {
                    const user = top3[idx];
                    if (!user) return <div key={idx} className="w-20" />;
                    const isFirst = idx === 0;
                    const frameImg = user.equipped_frame && FRAME_MAP[user.equipped_frame];
                    const xp = activeTab === "wealth" ? user.wealth_xp : user.charisma_xp;
                    const level = activeTab === "wealth" ? user.wealth_level : user.charisma_level;
                    return (
                      <div key={user.id} className={`flex flex-col items-center ${isFirst ? "mb-4" : ""}`}
                        onClick={() => navigate(`/user?id=${user.id}`)}>
                        <span className="text-lg mb-1">{medalEmoji[idx]}</span>
                        <div className={`relative ${isFirst ? "w-20 h-20" : "w-16 h-16"}`}>
                          {frameImg && <img src={frameImg} alt="" className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none" />}
                          <div className={`absolute ${isFirst ? "inset-[15%]" : "inset-[12%]"} rounded-full overflow-hidden z-10 ring-2 ring-accent`}>
                            <img src={user.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <p className="text-[11px] font-bold mt-1 truncate max-w-[80px]">{user.display_name}</p>
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r ${medalColors[idx]} text-white mt-0.5`}>
                          Lv.{level} • {(xp || 0).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rest of list */}
              <div className="space-y-2">
                {rest.map((user, i) => {
                  const xp = activeTab === "wealth" ? user.wealth_xp : user.charisma_xp;
                  const level = activeTab === "wealth" ? user.wealth_level : user.charisma_level;
                  return (
                    <div key={user.id} className="card-nova p-3 flex items-center gap-3"
                      onClick={() => navigate(`/user?id=${user.id}`)}>
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center">{i + 4}</span>
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-border">
                        <img src={user.avatar_url || "https://i.pravatar.cc/60"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {user.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-accent">Lv.{level}</p>
                        <p className="text-[10px] text-muted-foreground">{(xp || 0).toLocaleString()} XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {leaders.length === 0 && (
                <EmptyState icon="🏆" title="لا توجد بيانات حالياً" subtitle="كن أول من يتصدر القائمة!" />
              )}
            </>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default LeaderboardPage;
