import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Gift, Coins, Diamond, History, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import { triggerConfetti } from "@/lib/effects";

interface Opening {
  id: string;
  reward_coins: number;
  reward_diamonds: number;
  is_jackpot: boolean;
  created_at: string;
}

const BOX_COST = 500;

const LuckyBoxPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [coins, setCoins] = useState(0);
  const [opening, setOpening] = useState(false);
  const [history, setHistory] = useState<Opening[]>([]);
  const [lastResult, setLastResult] = useState<{ coins: number; diamonds: number; jackpot: boolean } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [shake, setShake] = useState(false);

  const refresh = async (uid: string) => {
    const [{ data: profile }, { data: hist }] = await Promise.all([
      supabase.from("profiles").select("coins").eq("id", uid).single(),
      supabase.from("lucky_box_openings").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
    ]);
    if (profile) setCoins(profile.coins);
    if (hist) setHistory(hist as Opening[]);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await refresh(user.id);
    })();
  }, [navigate]);

  const openBox = async () => {
    if (!userId || opening) return;
    if (coins < BOX_COST) {
      toast.error("رصيدك مش كفاية");
      return;
    }
    setOpening(true);
    setShake(true);
    setShowResult(false);
    try {
      const { data, error } = await supabase.rpc("open_lucky_box", { _user_id: userId });
      if (error) throw error;
      const result = data as any;
      // Wait for shake animation
      await new Promise((r) => setTimeout(r, 1200));
      setShake(false);
      setLastResult({
        coins: Number(result.reward_coins) || 0,
        diamonds: Number(result.reward_diamonds) || 0,
        jackpot: Boolean(result.is_jackpot),
      });
      setShowResult(true);
      if (result.is_jackpot) triggerConfetti();
      await refresh(userId);
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ");
      setShake(false);
    } finally {
      setOpening(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, hsl(280 60% 8%), hsl(260 28% 6%))" }}>
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="glow-gold-text">صندوق الحظ</span>
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
          {/* Balance */}
          <div className="rounded-2xl p-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, hsl(45 90% 40% / 0.18), hsl(35 80% 30% / 0.18))", border: "1px solid hsl(45 80% 50% / 0.25)" }}>
            <span className="text-xs text-muted-foreground">رصيدك</span>
            <span className="font-black text-accent flex items-center gap-1">
              <CurrencyIcon type="gold" size="sm" /> {coins.toLocaleString()}
            </span>
          </div>

          {/* Box visual */}
          <div className="relative flex flex-col items-center justify-center py-6">
            <div
              className={`relative w-48 h-48 flex items-center justify-center rounded-3xl ${shake ? "animate-shake" : ""}`}
              style={{
                background: "linear-gradient(135deg, hsl(45 95% 55%), hsl(35 90% 45%), hsl(15 85% 40%))",
                boxShadow: "0 20px 60px -10px hsl(45 90% 50% / 0.6), inset 0 -8px 20px hsl(15 80% 30% / 0.4)",
              }}
            >
              <Gift className="w-24 h-24 text-foreground drop-shadow-2xl" strokeWidth={1.5} />
              <div className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-black">
                JACKPOT 5%
              </div>
              <Sparkles className="absolute top-4 left-4 w-5 h-5 text-foreground/80 animate-pulse" />
              <Sparkles className="absolute bottom-6 right-6 w-4 h-4 text-foreground/80 animate-pulse" style={{ animationDelay: "0.3s" }} />
            </div>

            {/* Result overlay */}
            {showResult && lastResult && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-3xl animate-fade-in"
                onClick={() => setShowResult(false)}
              >
                <div className={`p-5 rounded-2xl text-center ${lastResult.jackpot ? "gradient-gold" : "bg-card"} max-w-[260px]`}>
                  {lastResult.jackpot && <Trophy className="w-10 h-10 mx-auto mb-2 text-foreground" />}
                  <p className={`text-sm font-bold mb-2 ${lastResult.jackpot ? "text-background" : "text-foreground"}`}>
                    {lastResult.jackpot ? "🎰 جاكبوت!" : "🎁 مكافأتك"}
                  </p>
                  <div className="flex items-center justify-center gap-3 text-2xl font-black">
                    <span className={`flex items-center gap-1 ${lastResult.jackpot ? "text-background" : "text-accent"}`}>
                      <CurrencyIcon type="gold" size="sm" /> +{lastResult.coins}
                    </span>
                    {lastResult.diamonds > 0 && (
                      <span className={`flex items-center gap-1 ${lastResult.jackpot ? "text-background" : "text-primary"}`}>
                        <Diamond className="w-5 h-5" /> +{lastResult.diamonds}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowResult(false)}
                    className="mt-3 text-[11px] text-muted-foreground underline"
                  >
                    تخطي
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Open button */}
          <button
            onClick={openBox}
            disabled={opening || coins < BOX_COST}
            className="w-full py-4 rounded-2xl font-black text-lg gradient-neon text-primary-foreground glow-neon disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
          >
            {opening ? "جارٍ الفتح..." : coins < BOX_COST ? `محتاج ${BOX_COST} كوينز` : `🔓 افتح صندوق (${BOX_COST} كوينز)`}
          </button>

          {/* Odds */}
          <div className="rounded-2xl p-4 bg-secondary/30 border border-border/30 space-y-2">
            <p className="text-xs font-bold text-foreground mb-2">📊 احتمالات المكافآت</p>
            {[
              { range: "100-300 كوينز", chance: "40%", color: "text-muted-foreground" },
              { range: "300-700 كوينز", chance: "35%", color: "text-foreground" },
              { range: "700-1500 كوينز", chance: "15%", color: "text-accent" },
              { range: "1500-3000 كوينز", chance: "5%", color: "text-primary" },
              { range: "🎰 3000-5000 + 10 ماس", chance: "5%", color: "text-amber-400" },
            ].map((o, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className={o.color}>{o.range}</span>
                <span className="font-black text-muted-foreground">{o.chance}</span>
              </div>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="rounded-2xl p-4 bg-secondary/30 border border-border/30">
              <p className="text-xs font-bold mb-3 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> آخر 10 عمليات فتح
              </p>
              <div className="space-y-1.5 max-h-48 overflow-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-border/10 last:border-0">
                    <span className={h.is_jackpot ? "text-amber-400 font-bold" : "text-muted-foreground"}>
                      {h.is_jackpot ? "🎰 جاكبوت" : "🎁 صندوق"}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-accent flex items-center gap-0.5">
                        <Coins className="w-3 h-3" /> +{h.reward_coins}
                      </span>
                      {h.reward_diamonds > 0 && (
                        <span className="text-primary flex items-center gap-0.5">
                          <Diamond className="w-3 h-3" /> +{h.reward_diamonds}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default LuckyBoxPage;
