import { useState, useEffect } from "react";
import { Shield, Ban, Users, Crown, Search, Zap, Building2, Globe, Settings, ArrowRightLeft } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [searchId, setSearchId] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [coinAmount, setCoinAmount] = useState("");
  const [agencies, setAgencies] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [conversionRate, setConversionRate] = useState("50");
  const [exchangeRate, setExchangeRate] = useState("100");
  const [newCountry, setNewCountry] = useState({ code: "", name: "", currency: "", coin_price: "", diamond_price: "" });
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalRooms: 0 });

  useEffect(() => {
    const checkBoss = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("is_boss").eq("id", user.id).single();
      if (!data?.is_boss) { navigate("/"); return; }
      setIsBoss(true);

      // Load data
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: onlineCount } = await supabase.from("user_presence").select("*", { count: "exact", head: true }).eq("is_online", true);
      const { count: roomCount } = await supabase.from("rooms").select("*", { count: "exact", head: true }).eq("is_active", true);
      setStats({ totalUsers: userCount || 0, onlineUsers: onlineCount || 0, totalRooms: roomCount || 0 });

      const { data: ag } = await supabase.from("agencies").select("*");
      setAgencies(ag || []);

      const { data: pp } = await supabase.from("pricing_plans").select("*").order("country_name");
      setPricingPlans(pp || []);

      const { data: cr } = await supabase.from("system_settings").select("value").eq("key", "gift_conversion_rate").single();
      if (cr) setConversionRate(cr.value);
      const { data: er } = await supabase.from("system_settings").select("value").eq("key", "exchange_rate").single();
      if (er) setExchangeRate(er.value);

      setLoading(false);
    };
    checkBoss();
  }, [navigate]);

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", searchId.trim()).single();
    if (data) setTargetUser(data);
    else { toast.error("المستخدم غير موجود"); setTargetUser(null); }
  };

  const promoteUser = async (role: "admin" | "super_admin", vipLevel: number) => {
    if (!targetUser) return;
    await supabase.from("user_roles").upsert({ user_id: targetUser.id, role }, { onConflict: "user_id,role" });
    await supabase.from("profiles").update({ vip_level: vipLevel }).eq("id", targetUser.id);
    toast.success(`تمت الترقية إلى ${role === "super_admin" ? "سوبر أدمن" : "أدمن"}`);
  };

  const distributeCoins = async () => {
    if (!targetUser || !coinAmount) return;
    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount <= 0) return;
    const newCoins = (targetUser.coins || 0) + amount;
    await supabase.from("profiles").update({ coins: newCoins }).eq("id", targetUser.id);
    toast.success(`تم إضافة ${amount.toLocaleString()} عملة`);
    setTargetUser({ ...targetUser, coins: newCoins });
    setCoinAmount("");
  };

  const banUser = async () => {
    if (!targetUser) return;
    await supabase.from("profiles").update({ vip_level: 0, coins: 0, diamonds: 0 }).eq("id", targetUser.id);
    toast.success("تم حظر المستخدم وتصفير رصيده");
  };

  const toggleAgency = async (id: string, field: "broadcast_enabled" | "recharge_enabled" | "is_active", value: boolean) => {
    await supabase.from("agencies").update({ [field]: value } as any).eq("id", id);
    setAgencies(agencies.map((a) => a.id === id ? { ...a, [field]: value } : a));
    toast.success("تم التحديث");
  };

  const saveConversionRates = async () => {
    await supabase.from("system_settings").update({ value: conversionRate }).eq("key", "gift_conversion_rate");
    await supabase.from("system_settings").update({ value: exchangeRate }).eq("key", "exchange_rate");
    toast.success("تم حفظ نسب التحويل!");
  };

  const addPricing = async () => {
    if (!newCountry.code || !newCountry.name) return;
    const { error } = await supabase.from("pricing_plans").upsert({
      country_code: newCountry.code,
      country_name: newCountry.name,
      currency: newCountry.currency || "USD",
      coin_price: parseFloat(newCountry.coin_price) || 1,
      diamond_price: parseFloat(newCountry.diamond_price) || 2,
    }, { onConflict: "country_code" });
    if (!error) {
      toast.success("تم إضافة/تحديث السعر");
      const { data } = await supabase.from("pricing_plans").select("*").order("country_name");
      setPricingPlans(data || []);
      setNewCountry({ code: "", name: "", currency: "", coin_price: "", diamond_price: "" });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  if (!isBoss) return null;

  const tabs = [
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "agencies", label: "الوكالات", icon: Building2 },
    { id: "pricing", label: "الأسعار", icon: Globe },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pb-8">
        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" />
              <h1 className="font-black text-lg boss-fire-text">لوحة الآلهة</h1>
            </div>
            <button onClick={() => navigate("/profile")} className="text-sm text-muted-foreground">رجوع</button>
          </div>
        </header>

        {/* Stats */}
        <div className="px-4 max-w-lg mx-auto mt-4 grid grid-cols-3 gap-2">
          <div className="card-nova p-3 text-center">
            <p className="text-lg font-black text-primary">{stats.totalUsers}</p>
            <p className="text-[9px] text-muted-foreground">المستخدمين</p>
          </div>
          <div className="card-nova p-3 text-center">
            <p className="text-lg font-black text-green-400">{stats.onlineUsers}</p>
            <p className="text-[9px] text-muted-foreground">متصل الآن</p>
          </div>
          <div className="card-nova p-3 text-center">
            <p className="text-lg font-black text-accent">{stats.totalRooms}</p>
            <p className="text-[9px] text-muted-foreground">الغرف النشطة</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 max-w-lg mx-auto mt-4 flex gap-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${activeTab === tab.id ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5 inline mr-1" />{tab.label}
            </button>
          ))}
        </div>

        <main className="px-4 max-w-lg mx-auto mt-4 space-y-4">
          {/* USERS TAB */}
          {activeTab === "users" && (
            <>
              <div className="card-nova p-4">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> بحث بالمعرف</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="أدخل ID" value={searchId} onChange={(e) => setSearchId(e.target.value)}
                    className="flex-1 bg-secondary/50 rounded-2xl px-3 py-2 text-sm focus:outline-none border border-border" />
                  <button onClick={searchUser} className="px-4 py-2 rounded-2xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">بحث</button>
                </div>
              </div>

              {targetUser && (
                <motion.div className="card-nova p-4 space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent">
                      <img src={targetUser.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{targetUser.display_name}</p>
                      <p className="text-xs text-muted-foreground">ID: {targetUser.user_id} • VIP {targetUser.vip_level} • {targetUser.gender === "female" ? "👩" : "👨"}</p>
                      <p className="text-[10px] text-muted-foreground">💰 {targetUser.coins?.toLocaleString()} • 💎 {targetUser.diamonds?.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => promoteUser("super_admin", 6)} className="py-3 rounded-2xl text-xs font-bold border border-destructive/50 text-destructive hover:bg-destructive/10">
                      <Crown className="w-4 h-4 inline mr-1" /> سوبر أدمن
                    </button>
                    <button onClick={() => promoteUser("admin", 5)} className="py-3 rounded-2xl text-xs font-bold border border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                      <Shield className="w-4 h-4 inline mr-1" /> أدمن
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold mb-2"><Coins className="w-3.5 h-3.5 text-accent inline mr-1" /> توزيع عملات</h4>
                    <div className="flex gap-2">
                      <input type="number" placeholder="الكمية" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)}
                        className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none" />
                      <button onClick={distributeCoins} className="px-4 py-2 rounded-xl gradient-gold text-accent-foreground font-bold text-sm btn-nova">إرسال</button>
                    </div>
                  </div>

                  <button onClick={banUser} className="w-full py-3 rounded-2xl bg-destructive/20 text-destructive font-bold text-sm flex items-center justify-center gap-2 btn-nova">
                    <Ban className="w-4 h-4" /> طرد نهائي (Ban)
                  </button>
                </motion.div>
              )}
            </>
          )}

          {/* AGENCIES TAB */}
          {activeTab === "agencies" && (
            <div className="space-y-3">
              {agencies.map((ag) => (
                <div key={ag.id} className="card-nova p-4">
                  <p className="font-bold text-sm mb-2">{ag.name}</p>
                  <div className="flex gap-2">
                    <button onClick={() => toggleAgency(ag.id, "broadcast_enabled", !ag.broadcast_enabled)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold ${ag.broadcast_enabled ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
                      البث: {ag.broadcast_enabled ? "مفعل" : "معطل"}
                    </button>
                    <button onClick={() => toggleAgency(ag.id, "recharge_enabled", !ag.recharge_enabled)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold ${ag.recharge_enabled ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
                      الشحن: {ag.recharge_enabled ? "مفعل" : "معطل"}
                    </button>
                    <button onClick={() => toggleAgency(ag.id, "is_active", !ag.is_active)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold ${ag.is_active ? "bg-green-500/20 text-green-400" : "bg-destructive/20 text-destructive"}`}>
                      {ag.is_active ? "نشط" : "معطل"}
                    </button>
                  </div>
                </div>
              ))}
              {agencies.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">لا توجد وكالات</p>}
            </div>
          )}

          {/* PRICING TAB */}
          {activeTab === "pricing" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm">إضافة/تعديل سعر دولة</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="كود الدولة (SA)" value={newCountry.code} onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="اسم الدولة" value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="العملة (SAR)" value={newCountry.currency} onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="سعر الذهب" type="number" value={newCountry.coin_price} onChange={(e) => setNewCountry({ ...newCountry, coin_price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="سعر الماس" type="number" value={newCountry.diamond_price} onChange={(e) => setNewCountry({ ...newCountry, diamond_price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <button onClick={addPricing} className="py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs btn-nova">حفظ</button>
                </div>
              </div>

              <div className="space-y-2">
                {pricingPlans.map((p) => (
                  <div key={p.id} className="card-nova p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{p.country_name} ({p.country_code})</p>
                      <p className="text-[10px] text-muted-foreground">{p.currency} • ذهب: {p.coin_price} • ماس: {p.diamond_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="card-nova p-4 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-primary" /> نسب التحويل</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">نسبة تحويل الهدايا (ذهب → ماس)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={conversionRate} onChange={(e) => setConversionRate(e.target.value)}
                      className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">نسبة تبديل الماس بالذهب</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
                      className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none" />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <button onClick={saveConversionRates} className="w-full py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
