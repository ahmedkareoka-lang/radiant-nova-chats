import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRightLeft, Send, User, Users, Search, Loader2, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";

type FoundUser = { id: string; user_id: string; display_name: string; avatar_url: string | null };

const WalletPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState(100); // 100 = 1 diamond → 1 coin

  // Unified mode for diamond → coin exchange
  const [mode, setMode] = useState<"self" | "other">("self");
  const [amount, setAmount] = useState(""); // diamonds to convert

  // Recipient (only used in 'other' mode)
  const [recipientCode, setRecipientCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      const { data: setting } = await supabase
        .from("system_settings").select("value").eq("key", "exchange_rate").single();
      if (setting) setExchangeRate(parseInt(setting.value));
    };
    load();
  }, []);

  // Reset recipient/amount when switching tabs
  useEffect(() => {
    setAmount("");
    setFound(null);
    setRecipientCode("");
  }, [mode]);

  const parsedAmount = parseInt(amount) || 0;
  const goldReceived = Math.floor((parsedAmount * exchangeRate) / 100);
  const fee = 0; // No platform fee for now — surface in UI for transparency
  const netGold = goldReceived - fee;

  const searchRecipient = async () => {
    const code = recipientCode.trim();
    if (!code) { toast.error("أدخل ID المستخدم"); return; }
    setSearching(true);
    setFound(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,display_name,avatar_url")
      .eq("user_id", code)
      .maybeSingle();
    setSearching(false);
    if (error || !data) {
      toast.error("لم يتم العثور على مستخدم بهذا المعرف");
      return;
    }
    if (data.id === profile?.id) {
      toast.error("لا يمكنك التحويل إلى نفسك");
      return;
    }
    setFound(data as FoundUser);
  };

  const openConfirm = () => {
    if (!profile || parsedAmount <= 0) { toast.error("أدخل كمية صحيحة"); return; }
    if (profile.diamonds < parsedAmount) { toast.error("رصيد الماس غير كافٍ!"); return; }
    if (mode === "other" && !found) { toast.error("ابحث عن المستلم أولاً"); return; }
    if (netGold <= 0) { toast.error("الكمية أقل من الحد الأدنى"); return; }
    setConfirmOpen(true);
  };

  const submit = async () => {
    if (!profile) return;
    setSubmitting(true);

    if (mode === "self") {
      const { error } = await supabase.rpc("exchange_diamonds_to_coins", {
        _user_id: profile.id,
        _diamond_amount: parsedAmount,
        _coin_amount: netGold,
      });
      setSubmitting(false);
      if (error) { toast.error("فشل في التبديل"); return; }
      setProfile({ ...profile, diamonds: profile.diamonds - parsedAmount, coins: profile.coins + netGold });
      toast.success(`تم تحويل ${parsedAmount.toLocaleString()} ماسة إلى ${netGold.toLocaleString()} 💰`);
    } else {
      if (!found) return;
      const { error } = await supabase.rpc("gift_diamonds_as_coins_to_user", {
        _recipient_user_id: found.user_id,
        _diamond_amount: parsedAmount,
      });
      setSubmitting(false);
      if (error) { toast.error(error.message || "فشل في التحويل"); return; }
      setProfile({ ...profile, diamonds: profile.diamonds - parsedAmount });
      toast.success(`💰 وصل ${netGold.toLocaleString()} Coin إلى ${found.display_name}!`);
    }

    setAmount("");
    setFound(null);
    setRecipientCode("");
    setConfirmOpen(false);
  };

  const sendReceipt = async () => {
    const { data: boss } = await supabase.from("profiles").select("id").eq("is_boss", true).single();
    if (!boss || !profile) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${profile.id},user2_id.eq.${boss.id}),and(user1_id.eq.${boss.id},user2_id.eq.${profile.id})`)
      .single();
    let convId = existing?.id;
    if (!convId) {
      const { data: newConv } = await supabase
        .from("conversations").insert({ user1_id: profile.id, user2_id: boss.id })
        .select("id").single();
      convId = newConv?.id;
    }
    if (convId) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: profile.id,
        content: `📧 طلب تحويل\n🆔 ID: ${profile.user_id}\n💰 المبلغ: ${amount || "—"}\n📅 ${new Date().toLocaleDateString("ar")}`,
      });
      toast.success("تم إرسال إيصال التحويل إلى BOSS! 📧");
      navigate("/chat");
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">المحفظة</h1>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-nova p-4 text-center">
              <CurrencyIcon type="gold" size="lg" className="mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">NOVA Coins</p>
              <p className="font-black text-xl text-accent">{(profile?.coins || 0).toLocaleString()}</p>
            </div>
            <div className="card-nova p-4 text-center">
              <CurrencyIcon type="diamond" size="lg" className="mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">الماس</p>
              <p className="font-black text-xl text-primary">{(profile?.diamonds || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="card-nova p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" /> تبديل الماس إلى NOVA Coins
            </h3>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-secondary/40 border border-border">
              <button
                onClick={() => setMode("self")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all ${
                  mode === "self"
                    ? "gradient-neon text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" /> لنفسي
              </button>
              <button
                onClick={() => setMode("other")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all ${
                  mode === "other"
                    ? "gradient-neon text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" /> للآخرين
              </button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              نسبة التبديل: كل 1000 ماسة = {(1000 * exchangeRate / 100).toLocaleString()} NOVA Coin
            </p>

            {/* Recipient picker (other only) */}
            {mode === "other" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    value={recipientCode}
                    onChange={(e) => setRecipientCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") searchRecipient(); }}
                    placeholder="ID المستخدم (6 أرقام)"
                    inputMode="numeric"
                    className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={searchRecipient}
                    disabled={searching}
                    className="px-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 gradient-neon text-primary-foreground btn-nova disabled:opacity-50"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>

                {found && (
                  <div className="rounded-2xl bg-background/40 border border-border/30 p-2.5 flex items-center gap-3">
                    <img
                      loading="lazy" decoding="async"
                      src={found.avatar_url || "https://i.pravatar.cc/100?img=3"}
                      alt={found.display_name}
                      className="w-9 h-9 rounded-full object-cover border border-border/40"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{found.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">ID: {found.user_id}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Amount + action */}
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="عدد الماسات"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={openConfirm}
                disabled={!parsedAmount || (mode === "other" && !found)}
                className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova disabled:opacity-50"
              >
                {mode === "self" ? "تبديل" : "إرسال"}
              </button>
            </div>

            {parsedAmount > 0 && (
              <p className="text-xs text-accent text-center">
                {mode === "self" ? "ستحصل على " : "سيستلم المستخدم "}
                {netGold.toLocaleString()} NOVA Coin
              </p>
            )}
          </div>

          <button onClick={sendReceipt}
            className="w-full py-3 rounded-full border border-primary/50 text-primary font-bold text-sm btn-nova flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> إرسال إيصال التحويل إلى BOSS
          </button>

          <button onClick={() => navigate("/top-up")}
            className="w-full py-3 rounded-full gradient-neon text-primary-foreground font-bold btn-nova glow-neon flex items-center justify-center gap-2">
            <CurrencyIcon type="gold" size="sm" /> شحن رصيد
          </button>
        </main>

        {/* Confirmation modal */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => !submitting && setConfirmOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card shadow-[0_20px_60px_hsl(var(--primary)/0.35)] p-5 space-y-4 animate-in slide-in-from-bottom-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> تأكيد العملية
                </h4>
                <button
                  onClick={() => !submitting && setConfirmOpen(false)}
                  className="p-1 rounded-full hover:bg-secondary/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mode === "other" && found && (
                <div className="rounded-2xl bg-background/40 border border-border/40 p-3 flex items-center gap-3">
                  <img loading="lazy" decoding="async"
                    src={found.avatar_url || "https://i.pravatar.cc/100?img=3"}
                    alt={found.display_name}
                    className="w-10 h-10 rounded-full object-cover border border-border/40" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">المستلم</p>
                    <p className="font-bold text-sm truncate">{found.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {found.user_id}</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 divide-y divide-border/40 overflow-hidden">
                <Row label="الكمية المخصومة" value={
                  <span className="flex items-center gap-1 font-black text-primary">
                    {parsedAmount.toLocaleString()} <CurrencyIcon type="diamond" size="sm" />
                  </span>
                } />
                <Row label="نسبة التبديل" value={`1000 💎 = ${(1000 * exchangeRate / 100).toLocaleString()} 💰`} />
                <Row label="الإجمالي قبل الرسوم" value={
                  <span className="font-bold">{goldReceived.toLocaleString()} 💰</span>
                } />
                <Row label="رسوم المنصة" value={
                  <span className="text-emerald-400 font-bold">
                    {fee === 0 ? "بدون رسوم" : `${fee.toLocaleString()} 💰`}
                  </span>
                } />
                <Row label={mode === "self" ? "الصافي لك" : "الصافي للمستلم"} value={
                  <span className="flex items-center gap-1 font-black text-accent text-base">
                    {netGold.toLocaleString()} <CurrencyIcon type="gold" size="sm" />
                  </span>
                } highlight />
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                {mode === "self"
                  ? "سيتم تحويل الماس إلى Coins في رصيدك مباشرة."
                  : "سيتم خصم الماس من رصيدك وإيداع Coins فوراً في حساب المستلم."}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={submitting}
                  className="py-3 rounded-2xl font-black text-sm border border-border text-foreground hover:bg-secondary/60 disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="py-3 rounded-2xl font-black text-sm gradient-neon text-primary-foreground btn-nova flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  تأكيد التحويل
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </PageTransition>
  );
};

const Row = ({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div className={`flex items-center justify-between px-3 py-2.5 text-sm ${highlight ? "bg-primary/5" : ""}`}>
    <span className="text-muted-foreground text-xs">{label}</span>
    <div>{value}</div>
  </div>
);

export default WalletPage;
