import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft, Check, Sparkles, Phone, MessageCircle, Copy, Loader2,
  Wallet, Users, Ticket, ShieldCheck, Clock, X, ArrowRightLeft, Star
} from "lucide-react";
import { isTelegramMiniApp } from "@/lib/telegramWebApp";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CurrencyIcon from "@/components/CurrencyIcon";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BinancePayModal from "@/components/BinancePayModal";

/**
 * NOVA Recharge — 3 ways only:
 *  1) Binance Pay (USDT TRC20) — show wallet + QR, user submits TX-ID for admin approval
 *  2) Official Agents — list of recharge agents, jump to WhatsApp / agent profile
 *  3) Redeem Codes — instant top-up on valid code
 *
 * Visa / cards intentionally REMOVED.
 */

type Method = "binance" | "agents" | "redeem" | "wallet" | "stars";

const STARS_PER_USD = 50; // 1 USD ≈ 50 Telegram Stars (mirrors edge function default)

// Each package now ships with its own dedicated Binance Pay link
// so the user is redirected directly to the locked-amount checkout.
const packages = [
  { usdt: 1,   coins: 1400,    diamonds: 1000,   bonus: 0,  payUrl: "https://s.binance.com/vfZvdFse" },
  { usdt: 2,   coins: 2800,    diamonds: 2000,   bonus: 0,  payUrl: "https://s.binance.com/0v9WkEP2" },
  { usdt: 4,   coins: 5600,    diamonds: 4000,   bonus: 0,  payUrl: "https://s.binance.com/08dvPCYg" },
  { usdt: 7,   coins: 9800,    diamonds: 7000,   bonus: 5,  payUrl: "https://s.binance.com/V3FFZBnR" },
  { usdt: 14,  coins: 19600,   diamonds: 14000,  bonus: 10, payUrl: "https://s.binance.com/oplr3iAB" },
  { usdt: 28,  coins: 39200,   diamonds: 28000,  bonus: 15, popular: true, payUrl: "https://s.binance.com/Rz9IhCSk" },
  { usdt: 100, coins: 140000,  diamonds: 100000, bonus: 20, payUrl: "https://s.binance.com/iZZDvYpU" },
  { usdt: 128, coins: 179200,  diamonds: 128000, bonus: 25, payUrl: "https://s.binance.com/3alyDtOe" },
];

const formatNum = (n: number) => n.toLocaleString();

const TopUpPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>("binance");
  const [profile, setProfile] = useState<any>(null);

  // Binance state
  const [settings, setSettings] = useState<{ usdt_wallet_address: string; usdt_network: string; usdt_qr_url: string | null } | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Agents
  const [agents, setAgents] = useState<any[]>([]);

  // Redeem
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Wallet (diamond → coin exchange, self only — quick inline)
  const [exchangeRate, setExchangeRate] = useState(100); // 100 = 1 diamond → 1 coin
  const [exchangeAmount, setExchangeAmount] = useState("");
  const [exchanging, setExchanging] = useState(false);

  // Telegram Stars
  const [starsLoadingIdx, setStarsLoadingIdx] = useState<number | null>(null);
  const inTelegram = useMemo(() => isTelegramMiniApp(), []);

  const payWithStars = async (idx: number) => {
    if (!inTelegram) {
      toast("معاينة فقط — افتح NOVA من داخل Telegram لإتمام الدفع بالـ Stars");
    }
    setStarsLoadingIdx(idx);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-stars-invoice", {
        body: { package_index: idx },
      });
      if (error || !data?.invoice_url) {
        toast.error("تعذّر إنشاء فاتورة Stars");
        return;
      }
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.openInvoice) {
        tg.openInvoice(data.invoice_url, (status: string) => {
          if (status === "paid") {
            toast.success("تم الدفع بنجاح ⭐ — جاري تحديث الرصيد");
            setTimeout(refreshBalance, 1500);
          } else if (status === "failed") toast.error("فشل الدفع");
          else if (status === "cancelled") toast("تم إلغاء الدفع");
        });
      } else {
        window.open(data.invoice_url, "_blank");
      }
    } catch (e: any) {
      toast.error(e?.message || "خطأ");
    } finally {
      setStarsLoadingIdx(null);
    }
  };


  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("coins, diamonds, user_id, display_name")
          .eq("id", user.id).single();
        setProfile(data);
      }

      const [{ data: s }, { data: a }, { data: rate }] = await Promise.all([
        supabase.from("recharge_settings" as any).select("usdt_wallet_address, usdt_network, usdt_qr_url").limit(1).maybeSingle(),
        supabase.from("recharge_agents" as any).select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("system_settings" as any).select("value").eq("key", "exchange_rate").maybeSingle(),
      ]);
      setSettings((s as any) || { usdt_wallet_address: "", usdt_network: "TRC20", usdt_qr_url: null });
      setAgents((a as any) || []);
      if (rate && (rate as any).value) setExchangeRate(parseInt((rate as any).value));
    };
    load();
  }, []);

  const selectedPackage = useMemo(
    () => (selectedPkg !== null ? packages[selectedPkg] : null),
    [selectedPkg]
  );

  const refreshBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("profiles").select("coins, diamonds, user_id, display_name").eq("id", user.id).single();
    setProfile(data);
  };

  const copyWallet = async () => {
    if (!settings?.usdt_wallet_address) return;
    try {
      await navigator.clipboard.writeText(settings.usdt_wallet_address);
      toast.success("تم نسخ عنوان المحفظة ✨");
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const submitUsdt = async (orderId: string) => {
    if (!selectedPackage) { toast.error("اختر باقة أولاً"); return; }
    if (orderId.trim().length < 6) { toast.error("أدخل Order ID صحيح"); return; }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_usdt_recharge" as any, {
      _amount_usdt: selectedPackage.usdt,
      _transaction_id: orderId.trim(),
      _coins: selectedPackage.coins,
      _diamonds: selectedPackage.diamonds,
      _network: settings?.usdt_network || "TRC20",
    });
    setSubmitting(false);
    const res = (data as any) || {};
    if (error || !res.success) {
      const code = res.error || error?.message;
      const map: Record<string,string> = {
        duplicate_txid: "هذا الـ Order ID مُستخدم من قبل",
        invalid_txid: "Order ID غير صحيح",
        invalid_amount: "مبلغ غير صحيح",
      };
      toast.error(map[code as string] || "فشل إرسال الطلب");
      return;
    }
    toast.success("تم إرسال طلبك! سيتم اعتماده وإضافة الرصيد قريباً ⏳");
    setPayOpen(false);
    setSelectedPkg(null);
  };

  const redeemNow = async () => {
    if (code.trim().length < 3) { toast.error("أدخل كود صحيح"); return; }
    setRedeeming(true);
    const { data, error } = await supabase.rpc("redeem_code" as any, { _code: code.trim() });
    setRedeeming(false);
    const res = (data as any) || {};
    if (error || !res.success) {
      const map: Record<string,string> = {
        invalid_code: "الكود غير صحيح",
        inactive: "الكود غير مفعّل",
        expired: "انتهت صلاحية الكود",
        exhausted: "تم استخدام الكود بالكامل",
        already_used: "لقد استخدمت هذا الكود من قبل",
        unauthorized: "يجب تسجيل الدخول",
      };
      toast.error(map[res.error as string] || "فشل تفعيل الكود");
      return;
    }
    toast.success(`🎉 تم! +${formatNum(res.coins || 0)} كوينز · +${formatNum(res.diamonds || 0)} ماسة`);
    setCode("");
    refreshBalance();
  };

  // Diamond → Coin self-exchange (matches WalletPage.submit "self" mode)
  const parsedExchange = parseInt(exchangeAmount) || 0;
  const exchangeCoinsOut = Math.floor((parsedExchange * exchangeRate) / 100);

  const doExchange = async () => {
    if (!profile) return;
    if (parsedExchange <= 0) { toast.error("أدخل كمية صحيحة"); return; }
    if (profile.diamonds < parsedExchange) { toast.error("رصيد الماس غير كافٍ!"); return; }
    if (exchangeCoinsOut <= 0) { toast.error("الكمية أقل من الحد الأدنى"); return; }
    setExchanging(true);
    const { error } = await supabase.rpc("exchange_diamonds_to_coins" as any, {
      _user_id: profile.id,
      _diamond_amount: parsedExchange,
      _coin_amount: exchangeCoinsOut,
    });
    setExchanging(false);
    if (error) { toast.error("فشل في التبديل"); return; }
    setProfile({ ...profile, diamonds: profile.diamonds - parsedExchange, coins: profile.coins + exchangeCoinsOut });
    toast.success(`تم تحويل ${formatNum(parsedExchange)} ماسة إلى ${formatNum(exchangeCoinsOut)} 💰`);
    setExchangeAmount("");
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 bg-gradient-to-b from-background via-background to-purple-950/20">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-yellow-500/10">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-accent transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-lg bg-gradient-to-r from-yellow-300 via-amber-200 to-purple-300 bg-clip-text text-transparent">
              ⚡ شحن NOVA
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary/70 rounded-full px-2.5 py-1 border border-yellow-500/20">
                <CurrencyIcon type="gold" size="xs" />
                <span className="text-xs font-bold text-yellow-300">{profile ? formatNum(profile.coins) : "..."}</span>
              </div>
              <div className="flex items-center gap-1 bg-secondary/70 rounded-full px-2.5 py-1 border border-purple-500/20">
                <CurrencyIcon type="diamond" size="xs" />
                <span className="text-xs font-bold text-purple-300">{profile ? formatNum(profile.diamonds) : "..."}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-5">
          {/* Method Tabs */}
          <div className="grid grid-cols-5 gap-1.5 p-1 rounded-2xl bg-secondary/40 border border-border/40">
            <MethodTab
              active={method === "wallet"}
              onClick={() => setMethod("wallet")}
              icon={<Wallet className="w-4 h-4" />} label="محفظة" sub="رصيدي"
              gradient="from-emerald-400 to-teal-500"
            />
            <MethodTab
              active={method === "binance"}
              onClick={() => setMethod("binance")}
              icon={<Sparkles className="w-4 h-4" />} label="USDT" sub="Binance"
              gradient="from-yellow-400 to-amber-500"
            />
            <MethodTab
              active={method === "stars"}
              onClick={() => setMethod("stars")}
              icon={<Star className="w-4 h-4" />} label="Stars" sub="Telegram"
              gradient="from-sky-400 to-blue-500"
            />
            <MethodTab
              active={method === "agents"}
              onClick={() => setMethod("agents")}
              icon={<Users className="w-4 h-4" />} label="وكلاء" sub={`${agents.length}`}
              gradient="from-purple-500 to-fuchsia-500"
            />
            <MethodTab
              active={method === "redeem"}
              onClick={() => setMethod("redeem")}
              icon={<Ticket className="w-4 h-4" />} label="كود" sub="فوري"
              gradient="from-pink-500 to-purple-500"
            />
          </div>

          {/* === WALLET === */}
          {method === "wallet" && (
            <div className="space-y-4">
              {/* Balances */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 text-center">
                  <CurrencyIcon type="gold" size="lg" className="mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">NOVA Coins</p>
                  <p className="font-black text-xl text-yellow-300">{formatNum(profile?.coins || 0)}</p>
                </div>
                <div className="rounded-2xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 text-center">
                  <CurrencyIcon type="diamond" size="lg" className="mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground">الماس</p>
                  <p className="font-black text-xl text-purple-300">{formatNum(profile?.diamonds || 0)}</p>
                </div>
              </div>

              {/* Exchange box */}
              <div className="rounded-3xl p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-yellow-500/10 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <p className="font-extrabold text-emerald-200">تبديل الماس إلى NOVA Coins</p>
                    <p className="text-[10px] text-muted-foreground">
                      كل 1000 ماسة = {formatNum(1000 * exchangeRate / 100)} كوين
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="عدد الماسات"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(e.target.value)}
                    className="flex-1 bg-background/60 rounded-xl px-3 py-2.5 text-sm border border-emerald-500/20 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={doExchange}
                    disabled={exchanging || !parsedExchange}
                    className="px-4 rounded-xl font-black text-sm flex items-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-black disabled:opacity-50"
                  >
                    {exchanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                    تبديل
                  </button>
                </div>

                {parsedExchange > 0 && (
                  <p className="text-xs text-center text-emerald-200">
                    ستحصل على <b>{formatNum(exchangeCoinsOut)}</b> NOVA Coin
                  </p>
                )}

                <button
                  onClick={() => navigate("/wallet")}
                  className="w-full py-2 rounded-xl text-xs font-bold border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
                >
                  المزيد من خيارات المحفظة (تحويل لمستخدم آخر…)
                </button>
              </div>
            </div>
          )}

          {method === "binance" && (
            <div className="space-y-4">
              {/* Wallet card */}
              <div className="rounded-3xl p-4 border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-purple-500/10 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-yellow-400/10 blur-3xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-yellow-200">Binance Pay · USDT</p>
                      <p className="text-[10px] text-muted-foreground">شبكة {settings?.usdt_network || "TRC20"} فقط</p>
                    </div>
                  </div>

                  {settings?.usdt_qr_url && (
                    <div className="flex justify-center">
                      <div className="p-2 rounded-2xl bg-white">
                        <img loading="lazy" decoding="async" src={settings.usdt_qr_url} alt="USDT QR" className="w-40 h-40 object-contain" />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-background/60 border border-yellow-500/20 p-3 space-y-2">
                    <p className="text-[10px] text-muted-foreground">عنوان المحفظة</p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-mono text-[11px] break-all text-yellow-100" dir="ltr">
                        {settings?.usdt_wallet_address || "لم يتم تعيين عنوان بعد — تواصل مع الإدارة"}
                      </p>
                      <button
                        onClick={copyWallet}
                        disabled={!settings?.usdt_wallet_address}
                        className="p-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 disabled:opacity-40"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div>
                <h2 className="text-sm font-bold mb-2 text-yellow-200">اختر باقتك</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {packages.map((pkg, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedPkg(i);
                        setPayOpen(true);
                      }}
                      className={`relative rounded-2xl p-3 text-left border transition-all ${
                        selectedPkg === i
                          ? "border-yellow-400 bg-gradient-to-br from-yellow-500/20 to-purple-500/20 shadow-[0_0_20px_hsl(45_95%_55%/0.4)] scale-[1.02]"
                          : "border-border/40 bg-secondary/30 hover:border-yellow-500/40"
                      } ${pkg.popular ? "ring-1 ring-purple-400/40" : ""}`}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-[9px] font-black text-black flex items-center gap-0.5 whitespace-nowrap">
                          <Sparkles className="w-2.5 h-2.5" /> الأكثر شعبية
                        </div>
                      )}
                      {pkg.bonus > 0 && (
                        <div className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[9px] font-black text-white">
                          +{pkg.bonus}%
                        </div>
                      )}
                      <p className="font-black text-lg text-yellow-200">${pkg.usdt}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <CurrencyIcon type="gold" size="xs" />
                        <span className="text-[11px] font-bold text-yellow-300">{formatNum(pkg.coins)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <CurrencyIcon type="diamond" size="xs" />
                        <span className="text-[10px] text-purple-300">{formatNum(pkg.diamonds)}</span>
                      </div>
                      {selectedPkg === i && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-yellow-300" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hint */}
              <div className="rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-emerald-200/90 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  اختر باقة أعلاه لفتح صفحة الدفع المؤمّنة. المبلغ يُقفل تلقائياً
                  ويُفتح تطبيق Binance مباشرة من زر <b>"ادفع الآن"</b>.
                </span>
              </div>
            </div>
          )}

          {/* === TELEGRAM STARS === */}
          {method === "stars" && (
            <div className="space-y-4">
              <div className="rounded-3xl p-4 border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-blue-500/5 to-purple-500/10 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-sky-400/10 blur-3xl" />
                <div className="relative flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" fill="currentColor" />
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-sm text-sky-200">الدفع داخل Telegram ⭐</p>
                    <p className="text-[10px] text-muted-foreground">
                      ادفع بـ Telegram Stars مباشرة — الرصيد يُضاف فوراً بعد الدفع
                    </p>
                  </div>
                </div>
              </div>

              {!inTelegram && (
                <div className="rounded-2xl p-3 border border-amber-500/30 bg-amber-500/10 text-[11px] text-amber-100">
                  هذه الطريقة متاحة فقط داخل تطبيق Telegram. افتح NOVA من البوت الرسمي ثم عُد إلى هذه الصفحة.
                </div>
              )}

              <div>
                <h2 className="text-sm font-bold mb-2 text-sky-200">اختر باقتك بالـ Stars</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {packages.map((pkg, i) => {
                    const stars = pkg.usdt * STARS_PER_USD;
                    const loading = starsLoadingIdx === i;
                    return (
                      <button
                        key={i}
                        onClick={() => payWithStars(i)}
                        disabled={loading}
                        className={`relative rounded-2xl p-3 text-left border transition-all bg-secondary/30 hover:border-sky-400/50 ${
                          pkg.popular ? "ring-1 ring-sky-400/40" : "border-border/40"
                        } disabled:opacity-50`}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 text-[9px] font-black text-white flex items-center gap-0.5 whitespace-nowrap">
                            <Sparkles className="w-2.5 h-2.5" /> الأكثر شعبية
                          </div>
                        )}
                        {pkg.bonus > 0 && (
                          <div className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[9px] font-black text-white">
                            +{pkg.bonus}%
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-sky-300" fill="currentColor" />
                          <p className="font-black text-lg text-sky-200">{formatNum(stars)}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground -mt-0.5">≈ ${pkg.usdt}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <CurrencyIcon type="gold" size="xs" />
                          <span className="text-[11px] font-bold text-yellow-300">{formatNum(pkg.coins)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CurrencyIcon type="diamond" size="xs" />
                          <span className="text-[10px] text-purple-300">{formatNum(pkg.diamonds)}</span>
                        </div>
                        {loading && (
                          <div className="absolute inset-0 bg-background/60 rounded-2xl flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-sky-300" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl p-3 border border-sky-500/20 bg-sky-500/5 text-[11px] text-sky-100/90 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  اضغط أي باقة لفتح نافذة الدفع الرسمية من Telegram. السعر يطابق
                  باقات USDT تماماً — لا فروقات.
                </span>
              </div>
            </div>
          )}



          {/* === AGENTS === */}
          {method === "agents" && (
            <div className="space-y-3">
              <div className="rounded-3xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-500/15 to-fuchsia-500/10">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-5 h-5 text-purple-300" />
                  <p className="font-extrabold text-purple-200">الوكلاء المعتمدون</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  اختر وكيلاً وسيتم توجيهك مباشرة لمحادثة واتساب لإتمام الشحن يدوياً.
                </p>
              </div>

              {agents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm rounded-2xl border border-dashed border-border/40">
                  لا يوجد وكلاء شحن متاحون حالياً
                </div>
              )}

              <div className="space-y-2.5">
                {agents.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl p-3 border border-yellow-500/20 bg-gradient-to-r from-secondary/60 to-purple-950/20 flex items-center gap-3"
                  >
                    <button
                      onClick={() => navigate(`/user?id=${a.user_id}`)}
                      className="shrink-0"
                    >
                      {a.avatar_url ? (
                        <img
                          loading="lazy" decoding="async"
                          src={a.avatar_url} alt={a.agent_name}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-yellow-400/50"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500/30 to-purple-500/30 flex items-center justify-center ring-2 ring-yellow-400/50">
                          <Users className="w-6 h-6 text-yellow-300" />
                        </div>
                      )}
                    </button>

                    <button
                      onClick={() => navigate(`/user?id=${a.user_id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-extrabold text-sm truncate text-foreground">{a.agent_name}</p>
                      <p className="text-[10px] text-muted-foreground" dir="ltr">📱 {a.whatsapp_number}</p>
                      <p className="text-[10px] text-yellow-300/80">عرض الملف الشخصي</p>
                    </button>

                    <a
                      href={`https://wa.me/${a.whatsapp_number.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `مرحباً، أريد شحن رصيد NOVA — ID: ${profile?.user_id || ""}`
                      )}`}
                      target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-[0_4px_20px_hsl(140_70%_45%/0.5)] hover:bg-emerald-400 transition"
                    >
                      <MessageCircle className="w-4 h-4" /> واتساب
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === REDEEM === */}
          {method === "redeem" && (
            <div className="space-y-4">
              <div className="rounded-3xl p-5 border border-pink-500/30 bg-gradient-to-br from-pink-500/15 via-purple-500/10 to-yellow-500/10 relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-pink-400/20 blur-3xl" />
                <div className="relative space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-extrabold text-pink-200">كود شحن (Redeem)</p>
                      <p className="text-[10px] text-muted-foreground">الرصيد يُضاف فوراً عند التفعيل</p>
                    </div>
                  </div>

                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="NOVA-XXXX-XXXX"
                    className="w-full rounded-xl bg-background/70 border border-pink-500/30 px-4 py-3 text-center text-base font-mono font-bold tracking-widest text-yellow-200 placeholder:text-muted-foreground/50 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                    dir="ltr"
                  />

                  <button
                    onClick={redeemNow}
                    disabled={redeeming || code.trim().length < 3}
                    className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 text-white
                      bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400
                      shadow-[0_8px_30px_hsl(280_85%_60%/0.5)] disabled:opacity-40 disabled:shadow-none"
                  >
                    {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    تفعيل الكود
                  </button>

                  <p className="text-[10px] text-center text-muted-foreground">
                    احصل على أكواد شحن من العروض والمسابقات الرسمية لـ NOVA.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conversion footer */}
          <div className="rounded-2xl p-3 text-center border border-border/30 bg-secondary/30">
            <p className="text-[10px] text-muted-foreground mb-1">سعر الصرف</p>
            <div className="flex items-center justify-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <CurrencyIcon type="gold" size="xs" />
                <span className="font-bold text-yellow-300">10,000</span>
              </div>
              <span className="text-muted-foreground">=</span>
              <div className="flex items-center gap-1">
                <CurrencyIcon type="diamond" size="xs" />
                <span className="font-bold text-purple-300">5,000</span>
              </div>
            </div>
          </div>
        </main>

        {/* Binance Pay modal — locked amount, deep links, order id */}
        <BinancePayModal
          open={payOpen}
          onClose={() => setPayOpen(false)}
          pkg={selectedPackage}
          walletAddress={settings?.usdt_wallet_address || ""}
          network={settings?.usdt_network || "TRC20"}
          qrUrl={settings?.usdt_qr_url || null}
          payUrl={selectedPackage?.payUrl || null}
          submitting={submitting}
          onSubmit={submitUsdt}
        />

        <BottomNav />
      </div>
    </PageTransition>
  );
};

const MethodTab = ({
  active, onClick, icon, label, sub, gradient,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; sub: string; gradient: string;
}) => (
  <button
    onClick={onClick}
    className={`relative rounded-xl px-2 py-2.5 transition-all ${
      active
        ? `bg-gradient-to-br ${gradient} text-black shadow-lg`
        : "bg-transparent text-muted-foreground hover:text-foreground"
    }`}
  >
    <div className="flex items-center justify-center gap-1.5">
      {icon}
      <span className="text-xs font-extrabold">{label}</span>
    </div>
    <p className={`text-[9px] mt-0.5 ${active ? "text-black/70" : "text-muted-foreground"}`}>{sub}</p>
  </button>
);

export default TopUpPage;
