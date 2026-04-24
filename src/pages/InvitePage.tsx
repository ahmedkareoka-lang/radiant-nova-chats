import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Copy, Share2, Gift, Check, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";

interface ReferralCode {
  code: string;
  uses_count: number;
  total_earned_coins: number;
}
interface ReferralRow {
  id: string;
  referred_id: string;
  signup_reward_claimed: boolean;
  level5_reward_claimed: boolean;
  total_recharge_bonus: number;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null; level: number };
}

const InvitePage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [myCode, setMyCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [enterCode, setEnterCode] = useState("");
  const [hasReferrer, setHasReferrer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async (uid: string) => {
    const [{ data: code }, { data: refs }, { data: incoming }] = await Promise.all([
      supabase.from("referral_codes").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_id", uid).order("created_at", { ascending: false }),
      supabase.from("referrals").select("id").eq("referred_id", uid).maybeSingle(),
    ]);
    if (code) setMyCode(code as ReferralCode);
    setHasReferrer(!!incoming);

    if (refs && refs.length > 0) {
      const ids = refs.map((r) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url, level")
        .in("id", ids);
      const enriched = refs.map((r) => ({
        ...r,
        profile: profiles?.find((p) => p.id === r.referred_id) as any,
      }));
      setReferrals(enriched as ReferralRow[]);
    } else {
      setReferrals([]);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await refresh(user.id);
    })();
  }, [navigate]);

  const inviteUrl = myCode ? `${window.location.origin}/?ref=${myCode.code}` : "";

  const copyCode = async () => {
    if (!myCode) return;
    await navigator.clipboard.writeText(myCode.code);
    setCopied(true);
    toast.success("تم نسخ الكود ✅");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!inviteUrl) return;
    const text = `انضم لي على NOVA 🎤✨ واستخدم كود ${myCode?.code} لتاخد 500 كوينز هدية!\n${inviteUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "NOVA", text, url: inviteUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("تم نسخ رابط الدعوة ✅");
    }
  };

  const submitCode = async () => {
    if (!userId || !enterCode.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("apply_referral_code", {
        _user_id: userId,
        _code: enterCode.trim().toUpperCase(),
      });
      if (error) throw error;
      toast.success("🎉 كسبت 500 كوينز!");
      setEnterCode("");
      await refresh(userId);
    } catch (e: any) {
      const msg = e.message || "حدث خطأ";
      if (msg.includes("Invalid")) toast.error("كود غير صحيح");
      else if (msg.includes("Already")) toast.error("استخدمت كود قبل كده");
      else if (msg.includes("yourself")) toast.error("مش ممكن تستخدم كودك بنفسك");
      else toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span>ادعُ صديق</span>
            </h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-4">
          {/* Hero with code */}
          <div
            className="rounded-3xl p-5 text-center"
            style={{
              background: "linear-gradient(135deg, hsl(280 70% 35% / 0.4), hsl(260 60% 25% / 0.4))",
              border: "1px solid hsl(280 60% 50% / 0.4)",
            }}
          >
            <p className="text-xs text-muted-foreground mb-1">كود الدعوة الخاص بك</p>
            <p className="text-4xl font-black tracking-widest glow-neon-text mb-3 select-all">
              {myCode?.code || "------"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex-1 py-2.5 rounded-xl bg-secondary/60 font-bold text-sm flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "اتنسخ" : "نسخ"}
              </button>
              <button
                onClick={shareLink}
                className="flex-1 py-2.5 rounded-xl gradient-neon font-bold text-sm text-primary-foreground flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" /> مشاركة
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-3 bg-secondary/30 border border-border/30 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">عدد المدعوين</p>
              <p className="text-2xl font-black text-foreground">{myCode?.uses_count ?? 0}</p>
            </div>
            <div className="rounded-2xl p-3 bg-secondary/30 border border-border/30 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">كسبت إجمالي</p>
              <p className="text-2xl font-black text-accent flex items-center justify-center gap-1">
                <CurrencyIcon type="gold" size="sm" /> {(myCode?.total_earned_coins ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Rewards explainer */}
          <div className="rounded-2xl p-4 bg-secondary/30 border border-border/30 space-y-2.5">
            <p className="text-xs font-bold flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-accent" /> مكافأتك من كل دعوة
            </p>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">1</span>
              <p className="text-muted-foreground"><b className="text-foreground">500 كوينز فوراً</b> للصديق لما يستخدم كودك</p>
            </div>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold flex-shrink-0">2</span>
              <p className="text-muted-foreground"><b className="text-foreground">1000 كوينز للطرفين</b> لما يوصل level 5</p>
            </div>
            <div className="flex items-start gap-2 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold flex-shrink-0">3</span>
              <p className="text-muted-foreground"><b className="text-foreground">5% من كل شحنة</b> يعملها الصديق طول ما هو نشط</p>
            </div>
          </div>

          {/* Enter code (only if no referrer yet) */}
          {!hasReferrer && (
            <div className="rounded-2xl p-4 bg-primary/10 border border-primary/30">
              <p className="text-xs font-bold mb-2">عندك كود دعوة؟ استخدمه واخد 500 كوينز هدية!</p>
              <div className="flex gap-2">
                <input
                  value={enterCode}
                  onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="ABC123"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-background/60 border border-border text-center font-black tracking-widest text-sm uppercase"
                />
                <button
                  onClick={submitCode}
                  disabled={!enterCode.trim() || submitting}
                  className="px-4 py-2.5 rounded-xl gradient-neon font-bold text-sm text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "..." : "تطبيق"}
                </button>
              </div>
            </div>
          )}

          {/* My referrals list */}
          {referrals.length > 0 && (
            <div className="rounded-2xl p-4 bg-secondary/30 border border-border/30">
              <p className="text-xs font-bold mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> الأشخاص اللي دعيتهم ({referrals.length})
              </p>
              <div className="space-y-2 max-h-72 overflow-auto">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-background/30">
                    <img loading="lazy" decoding="async" src={r.profile?.avatar_url || "https://i.pravatar.cc/60"}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{r.profile?.display_name || "مستخدم"}</p>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-muted-foreground">Lv {r.profile?.level ?? 1}</span>
                        {r.level5_reward_claimed && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">✓ Lv5</span>
                        )}
                        {r.total_recharge_bonus > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                            💰 +{r.total_recharge_bonus}
                          </span>
                        )}
                      </div>
                    </div>
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

export default InvitePage;
