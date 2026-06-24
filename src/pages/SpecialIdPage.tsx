import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flame, Sparkles, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import VanityIdPill from "@/components/VanityIdPill";

const SUGGESTED = ["0000", "1111", "2222", "3333", "7777", "8888", "9999", "1122", "2233", "1234", "6969", "1000"];

const PRICES = {
  7: 125000,
  30: 1000000,
} as const;

const SpecialIdPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [digits, setDigits] = useState("");
  const [duration, setDuration] = useState<7 | 30>(7);
  const [busy, setBusy] = useState(false);
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<"unknown" | "free" | "taken" | "mine">("unknown");

  const valid = /^[0-9]{4}$/.test(digits);
  const price = PRICES[duration];
  const canBuy = valid && availability !== "taken" && (profile?.coins ?? 0) >= price && !busy;

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("id, display_name, coins, avatar_url, vanity_id, vanity_id_expiry")
        .eq("id", user.id)
        .single();
      setProfile(p);
      const { data: taken } = await supabase
        .from("vanity_ids")
        .select("digits, user_id, expires_at")
        .in("digits", SUGGESTED);
      const map: Record<string, boolean> = {};
      const now = Date.now();
      (taken || []).forEach((t: any) => {
        if (new Date(t.expires_at).getTime() > now && t.user_id !== p?.id) map[t.digits] = true;
      });
      setTakenMap(map);
    };
    load();
  }, []);

  // Live availability check when user types
  useEffect(() => {
    if (!valid) { setAvailability("unknown"); return; }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("vanity_ids")
        .select("user_id, expires_at")
        .eq("digits", digits)
        .maybeSingle();
      if (!data || new Date(data.expires_at).getTime() < Date.now()) setAvailability("free");
      else if (data.user_id === profile?.id) setAvailability("mine");
      else setAvailability("taken");
      setChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [digits, valid, profile?.id]);

  const purchase = async () => {
    if (!canBuy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_vanity_id", {
      _digits: digits,
      _duration_days: duration,
    });
    setBusy(false);
    if (error) { toast.error("فشل الشراء، حاول مجددًا"); return; }
    const res = data as any;
    if (!res?.success) {
      const map: Record<string, string> = {
        invalid_digits: "يجب أن يكون المعرّف 4 أرقام فقط",
        invalid_duration: "مدة غير صالحة",
        taken: "هذا المعرّف محجوز بالفعل!",
        insufficient_coins: "رصيدك غير كافٍ من NOVA Coins",
        not_authenticated: "سجّل دخول أولًا",
      };
      toast.error(map[res?.error] || "تعذر إتمام الشراء");
      return;
    }
    toast.success(`🔥 تم تفعيل المعرّف المميز ID ${digits}!`);
    setProfile((prev: any) => ({
      ...prev,
      coins: prev.coins - price,
      vanity_id: digits,
      vanity_id_expiry: res.expires_at,
    }));
    setAvailability("mine");
  };

  const activeExpiry = profile?.vanity_id_expiry && new Date(profile.vanity_id_expiry).getTime() > Date.now()
    ? profile.vanity_id_expiry : null;

  const daysLeft = useMemo(() => {
    if (!activeExpiry) return 0;
    return Math.max(0, Math.ceil((new Date(activeExpiry).getTime() - Date.now()) / 86400000));
  }, [activeExpiry]);

  return (
    <PageTransition>
      <div
        className="min-h-screen pb-28 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, hsl(20 90% 18%) 0%, hsl(15 80% 8%) 45%, hsl(260 25% 5%) 100%)",
        }}
      >
        {/* Ambient ember particles */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full blur-3xl"
               style={{ background: "radial-gradient(circle, hsl(25 100% 55% / 0.55), transparent 70%)" }} />
          <div className="absolute top-1/3 -left-10 w-[280px] h-[280px] rounded-full blur-3xl"
               style={{ background: "radial-gradient(circle, hsl(15 100% 50% / 0.4), transparent 70%)" }} />
          <div className="absolute top-1/2 -right-10 w-[260px] h-[260px] rounded-full blur-3xl"
               style={{ background: "radial-gradient(circle, hsl(35 100% 55% / 0.35), transparent 70%)" }} />
        </div>

        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/40 border-b border-orange-500/20">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-orange-200" /></button>
            <Flame className="w-5 h-5 text-orange-400 drop-shadow-[0_0_10px_hsl(25_100%_55%)]" />
            <h1 className="font-black text-lg bg-gradient-to-r from-amber-200 via-orange-300 to-red-400 bg-clip-text text-transparent">
              متجر الـ ID المميز
            </h1>
            <div className="ml-auto flex items-center gap-1 bg-orange-500/15 border border-orange-400/40 rounded-full px-2.5 py-1">
              <CurrencyIcon type="gold" size="xs" />
              <span className="text-xs font-bold text-orange-100">{(profile?.coins || 0).toLocaleString()}</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-5 max-w-lg mx-auto space-y-5 relative">
          {/* Hero */}
          <section
            className="rounded-3xl p-5 text-center space-y-3 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(20 80% 20% / 0.85), hsl(15 70% 12% / 0.9))",
              border: "1.5px solid hsl(30 100% 60% / 0.55)",
              boxShadow:
                "0 0 24px hsl(20 100% 50% / 0.45), 0 0 60px hsl(15 100% 45% / 0.3), inset 0 1px 0 hsl(45 100% 80% / 0.3)",
            }}
          >
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-orange-200/90 uppercase">
              <Sparkles className="w-3 h-3" /> Legendary 4-Digit ID <Sparkles className="w-3 h-3" />
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-b from-amber-100 via-orange-300 to-red-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_hsl(25_100%_55%/0.7)]">
              اختر معرّفك الأسطوري 🔥
            </h2>
            <p className="text-xs text-orange-100/70 leading-relaxed">
              معرّف من 4 أرقام يلمع بلون البرتقالي الناري على بروفايلك،
              يجعل اسمك يتميز في كل غرفة وقائمة.
            </p>

            {activeExpiry && profile?.vanity_id && (
              <div className="pt-2 flex flex-col items-center gap-1.5">
                <VanityIdPill digits={profile.vanity_id} expiresAt={activeExpiry} size="lg" />
                <p className="text-[10px] text-orange-200/80">
                  ⏳ متبقي {daysLeft} يوم
                </p>
              </div>
            )}
          </section>

          {/* Input */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold text-orange-100 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> أدخل 4 أرقام من اختيارك
            </label>
            <div className="relative">
              <input
                inputMode="numeric"
                maxLength={4}
                value={digits}
                onChange={(e) => setDigits(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="مثال: 7777"
                className="w-full text-center text-4xl font-black tracking-[0.6em] py-5 rounded-2xl bg-black/40 text-orange-100 placeholder:text-orange-100/30 outline-none transition-all"
                style={{
                  border: "1.5px solid hsl(30 100% 55% / 0.5)",
                  boxShadow:
                    "inset 0 0 24px hsl(15 100% 40% / 0.35), 0 0 22px hsl(25 100% 50% / 0.45)",
                  textShadow: valid
                    ? "0 0 12px hsl(35 100% 65%), 0 0 22px hsl(20 100% 50%)"
                    : "none",
                }}
              />
              {valid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checking ? (
                    <span className="text-[10px] text-orange-200/70">جاري التحقق…</span>
                  ) : availability === "free" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/40 rounded-full px-2 py-0.5">
                      <Check className="w-3 h-3" /> متاح
                    </span>
                  ) : availability === "mine" ? (
                    <span className="text-[10px] font-bold text-orange-200">معرّفك الحالي</span>
                  ) : availability === "taken" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/15 border border-red-400/40 rounded-full px-2 py-0.5">
                      <X className="w-3 h-3" /> محجوز
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Suggested numbers */}
            <p className="text-[11px] text-orange-100/60 pt-1">أرقام مميزة مقترحة:</p>
            <div className="grid grid-cols-4 gap-2">
              {SUGGESTED.map((s) => {
                const taken = takenMap[s];
                return (
                  <button
                    key={s}
                    disabled={taken}
                    onClick={() => setDigits(s)}
                    className={`py-2 rounded-xl font-black text-sm tracking-widest transition-all ${
                      taken
                        ? "bg-black/40 text-orange-100/30 border border-orange-500/10 line-through cursor-not-allowed"
                        : digits === s
                          ? "text-white"
                          : "bg-black/40 text-orange-100 border border-orange-400/30 hover:border-orange-400/70"
                    }`}
                    style={
                      digits === s && !taken
                        ? {
                            background: "linear-gradient(135deg, hsl(20 95% 52%), hsl(35 100% 55%))",
                            boxShadow: "0 0 18px hsl(25 100% 55% / 0.8)",
                          }
                        : undefined
                    }
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Duration */}
          <section className="space-y-2.5">
            <label className="text-xs font-bold text-orange-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" /> اختر مدة الاشتراك
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { d: 7 as const, title: "أسبوع", price: PRICES[7], badge: "اقتصادي" },
                { d: 30 as const, title: "شهر كامل", price: PRICES[30], badge: "الأفضل قيمة 🔥" },
              ].map((opt) => {
                const active = duration === opt.d;
                return (
                  <button
                    key={opt.d}
                    onClick={() => setDuration(opt.d)}
                    className="relative p-4 rounded-2xl text-center transition-all"
                    style={{
                      background: active
                        ? "linear-gradient(160deg, hsl(20 90% 28%), hsl(15 85% 16%))"
                        : "hsl(260 22% 9% / 0.7)",
                      border: active
                        ? "1.5px solid hsl(35 100% 60%)"
                        : "1.5px solid hsl(30 50% 30% / 0.4)",
                      boxShadow: active
                        ? "0 0 24px hsl(25 100% 55% / 0.8), inset 0 1px 0 hsl(45 100% 80% / 0.4)"
                        : "none",
                    }}
                  >
                    <p className={`text-[10px] font-bold mb-1 ${active ? "text-amber-200" : "text-orange-100/50"}`}>{opt.badge}</p>
                    <p className={`text-base font-black ${active ? "text-white" : "text-orange-100/90"}`}>{opt.title}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <CurrencyIcon type="gold" size="xs" />
                      <span className={`text-sm font-black ${active ? "text-amber-200" : "text-orange-100"}`}>
                        {opt.price.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Preview */}
          {valid && (
            <section
              className="rounded-2xl p-4 text-center space-y-2"
              style={{
                background: "linear-gradient(160deg, hsl(260 25% 8%), hsl(15 60% 10%))",
                border: "1px solid hsl(30 80% 45% / 0.4)",
              }}
            >
              <p className="text-[10px] text-orange-100/60">معاينة على بروفايلك:</p>
              <div className="flex items-center justify-center gap-3 py-2">
                <img
                  src={profile?.avatar_url || "/placeholder.svg"}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-400/60"
                />
                <div className="text-start">
                  <p className="font-bold text-sm text-white">{profile?.display_name}</p>
                  <VanityIdPill digits={digits} size="sm" />
                </div>
              </div>
            </section>
          )}

          {/* Buy button */}
          <button
            onClick={purchase}
            disabled={!canBuy}
            className="w-full py-4 rounded-2xl font-black text-base relative overflow-hidden transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, hsl(20 95% 52%) 0%, hsl(35 100% 58%) 50%, hsl(15 100% 50%) 100%)",
              color: "#fff7ed",
              boxShadow:
                "0 0 24px hsl(25 100% 55% / 0.85), 0 0 60px hsl(15 100% 48% / 0.55), inset 0 1px 0 hsl(45 100% 85% / 0.6)",
              textShadow: "0 1px 2px hsl(15 90% 20% / 0.7)",
            }}
          >
            {busy
              ? "جاري التفعيل…"
              : !valid
                ? "أدخل 4 أرقام أولًا"
                : availability === "taken"
                  ? "هذا المعرّف محجوز"
                  : (profile?.coins ?? 0) < price
                    ? "رصيد NOVA Coins غير كافٍ"
                    : `🔥 شراء ID ${digits} — ${price.toLocaleString()}`}
          </button>
          <p className="text-[10px] text-orange-100/50 text-center leading-relaxed">
            ينتهي تلقائيًا بعد {duration} يوم. يمكنك تجديده أو تغييره في أي وقت.
            {" "}كل معرّف فريد — لا يمكن لشخصين امتلاك نفس الأرقام في نفس الوقت.
          </p>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default SpecialIdPage;
