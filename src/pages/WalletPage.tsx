import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRightLeft, Send, User, Users, Search, Loader2 } from "lucide-react";
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
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState(100);
  const [loading, setLoading] = useState(false);

  // Tabs: 'self' = exchange diamonds → coins for me, 'other' = transfer diamonds to another user
  const [mode, setMode] = useState<"self" | "other">("self");

  // Transfer-to-other state
  const [recipientCode, setRecipientCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);

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

  const handleTransferToUser = async () => {
    if (!profile || !found) return;
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("أدخل كمية صحيحة"); return; }
    if (profile.diamonds < amount) { toast.error("رصيد الماس غير كافٍ!"); return; }
    setTransferring(true);
    const { data, error } = await supabase.rpc("transfer_diamonds_to_user", {
      _recipient_user_id: found.user_id,
      _amount: amount,
    });
    setTransferring(false);
    if (error) {
      toast.error(error.message || "فشل في التحويل");
      return;
    }
    setProfile({ ...profile, diamonds: profile.diamonds - amount });
    setTransferAmount("");
    toast.success(`💎 تم تحويل ${amount.toLocaleString()} ماسة إلى ${found.display_name}!`);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);
      const { data: setting } = await supabase.from("system_settings").select("value").eq("key", "exchange_rate").single();
      if (setting) setExchangeRate(parseInt(setting.value));
    };
    load();
  }, []);

  const handleExchange = async () => {
    if (!profile || !exchangeAmount) return;
    const amount = parseInt(exchangeAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (profile.diamonds < amount) {
      toast.error("رصيد الماس غير كافٍ!");
      return;
    }
    setLoading(true);
    const goldReceived = Math.floor((amount * exchangeRate) / 100);
    const { error } = await supabase.rpc("exchange_diamonds_to_coins", {
      _user_id: profile.id,
      _diamond_amount: amount,
      _coin_amount: goldReceived,
    });
    if (error) {
      toast.error("فشل في التبديل");
      setLoading(false);
      return;
    }
    setProfile({ ...profile, diamonds: profile.diamonds - amount, coins: profile.coins + goldReceived });
    setExchangeAmount("");
    toast.success(`تم تحويل ${amount} ماسة إلى ${goldReceived} ذهبة! 💰`);
    setLoading(false);
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
      const { data: newConv } = await supabase.from("conversations").insert({ user1_id: profile.id, user2_id: boss.id }).select("id").single();
      convId = newConv?.id;
    }
    if (convId) {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: profile.id,
        content: `📧 طلب تحويل\n🆔 ID: ${profile.user_id}\n💰 المبلغ: ${exchangeAmount || "—"}\n📅 ${new Date().toLocaleDateString("ar")}`,
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
              <ArrowRightLeft className="w-4 h-4 text-primary" /> تبديل الماس بـ NOVA Coins
            </h3>
            <p className="text-[10px] text-muted-foreground">
              نسبة التبديل: كل 1000 ماسة = {(1000 * exchangeRate / 100).toLocaleString()} NOVA Coin
            </p>
            <div className="flex gap-2">
              <input type="number" placeholder="عدد الماسات" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)}
                className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
              <button onClick={handleExchange} disabled={loading}
                className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">تبديل</button>
            </div>
            {exchangeAmount && parseInt(exchangeAmount) > 0 && (
              <p className="text-xs text-accent text-center">
                ستحصل على {Math.floor((parseInt(exchangeAmount) * exchangeRate) / 100).toLocaleString()} NOVA Coin
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

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default WalletPage;
