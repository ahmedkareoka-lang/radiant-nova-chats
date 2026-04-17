import { useState, useEffect, useRef } from "react";
import { Shield, Ban, Users, Crown, Search, Zap, Building2, Globe, Settings, ArrowRightLeft, Gift, Image, Upload, Trash2, Plus, BarChart3 } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { NOVA_ASSETS } from "@/lib/novaAssets";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [searchId, setSearchId] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [coinAmount, setCoinAmount] = useState("");
  const [diamondAmount, setDiamondAmount] = useState("");
  const [vipLevel, setVipLevel] = useState("");
  const [agencies, setAgencies] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [conversionRate, setConversionRate] = useState("50");
  const [exchangeRate, setExchangeRate] = useState("100");
  const [newCountry, setNewCountry] = useState({ code: "", name: "", currency: "", coin_price: "", diamond_price: "" });
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalRooms: 0 });
  const [novaStats, setNovaStats] = useState<{ level: number; label: string; count: number }[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);

  // Gift & Store management
  const [giftsList, setGiftsList] = useState<any[]>([]);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [newGift, setNewGift] = useState({ name: "", price: "" });
  const [newStoreItem, setNewStoreItem] = useState({ name: "", price_coins: "", type: "frame" });
  const [newBanner, setNewBanner] = useState({ title: "" });
  const [uploading, setUploading] = useState(false);
  const giftFileRef = useRef<HTMLInputElement>(null);
  const storeFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Fetch functions
  const fetchGifts = async () => {
    const { data } = await supabase.from("gifts").select("*").order("price");
    setGiftsList(data || []);
  };
  const fetchStoreItems = async () => {
    const { data } = await supabase.from("store_items").select("*").order("created_at", { ascending: false });
    setStoreItems(data || []);
  };
  const fetchBanners = async () => {
    const { data } = await supabase.from("banners").select("*").order("sort_order");
    setBanners(data || []);
  };

  useEffect(() => {
    const checkBoss = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setAdminId(user.id);
      const { data } = await supabase.from("profiles").select("is_boss").eq("id", user.id).single();
      if (!data?.is_boss) { navigate("/"); return; }
      setIsBoss(true);

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

      await Promise.all([fetchGifts(), fetchStoreItems(), fetchBanners()]);
      setLoading(false);
    };
    checkBoss();
  }, [navigate]);

  // Realtime subscriptions for gifts, store_items, banners
  useEffect(() => {
    const giftsChannel = supabase
      .channel(`admin-gifts-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gifts' }, () => { fetchGifts(); })
      .subscribe();

    const storeChannel = supabase
      .channel(`admin-store-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_items' }, () => { fetchStoreItems(); })
      .subscribe();

    const bannersChannel = supabase
      .channel(`admin-banners-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => { fetchBanners(); })
      .subscribe();

    return () => {
      supabase.removeChannel(giftsChannel);
      supabase.removeChannel(storeChannel);
      supabase.removeChannel(bannersChannel);
    };
  }, []);

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", searchId.trim()).single();
    if (data) setTargetUser(data);
    else { toast.error("المستخدم غير موجود"); setTargetUser(null); }
  };

  const promoteUser = async (role: "admin" | "super_admin", vl: number) => {
    if (!targetUser || !adminId) return;
    await supabase.from("user_roles").upsert({ user_id: targetUser.id, role }, { onConflict: "user_id,role" });
    await supabase.rpc("admin_update_profile", { _admin_id: adminId, _target_id: targetUser.id, _vip_level: vl });
    toast.success(`تمت الترقية إلى ${role === "super_admin" ? "سوبر أدمن" : "أدمن"}`);
  };

  const distributeCoins = async () => {
    if (!targetUser || !adminId) return;
    const coins = parseInt(coinAmount) || 0;
    const diamonds = parseInt(diamondAmount) || 0;
    const vip = parseInt(vipLevel) || undefined;
    if (coins <= 0 && diamonds <= 0 && !vip) return;
    await supabase.rpc("admin_update_profile", {
      _admin_id: adminId,
      _target_id: targetUser.id,
      ...(coins > 0 ? { _coins: (targetUser.coins || 0) + coins } : {}),
      ...(diamonds > 0 ? { _diamonds: (targetUser.diamonds || 0) + diamonds } : {}),
      ...(vip ? { _vip_level: vip } : {}),
    });
    toast.success("تم التحديث بنجاح ✅");
    setTargetUser({ ...targetUser, coins: (targetUser.coins || 0) + coins, diamonds: (targetUser.diamonds || 0) + diamonds });
    setCoinAmount(""); setDiamondAmount(""); setVipLevel("");
  };

  const banUser = async () => {
    if (!targetUser || !adminId) return;
    await supabase.rpc("admin_update_profile", { _admin_id: adminId, _target_id: targetUser.id, _coins: 0, _diamonds: 0, _vip_level: 0 });
    toast.success("تم حظر المستخدم وتصفير رصيده");
  };

  const toggleAgency = async (id: string, field: string, value: boolean) => {
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
    await supabase.from("pricing_plans").upsert({
      country_code: newCountry.code, country_name: newCountry.name,
      currency: newCountry.currency || "USD",
      coin_price: parseFloat(newCountry.coin_price) || 1,
      diamond_price: parseFloat(newCountry.diamond_price) || 2,
    }, { onConflict: "country_code" });
    toast.success("تم إضافة/تحديث السعر");
    const { data } = await supabase.from("pricing_plans").select("*").order("country_name");
    setPricingPlans(data || []);
    setNewCountry({ code: "", name: "", currency: "", coin_price: "", diamond_price: "" });
  };

  // Upload file to storage
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(fileName, file);
    setUploading(false);
    if (error) { toast.error("فشل في رفع الملف"); return null; }
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  // Gift management
  const handleAddGift = async () => {
    if (!newGift.name || !newGift.price) return;
    const file = giftFileRef.current?.files?.[0];
    let imageUrl: string | null = null;
    if (file) imageUrl = await uploadFile(file, "gifts");

    const { error } = await supabase.from("gifts").insert({
      name: newGift.name,
      price: parseInt(newGift.price),
      image_url: imageUrl,
    });
    if (error) { toast.error("فشل في إضافة الهدية"); return; }
    toast.success("تمت إضافة الهدية ✅");
    setNewGift({ name: "", price: "" });
    if (giftFileRef.current) giftFileRef.current.value = "";
    await fetchGifts();
  };

  const deleteGift = async (id: string) => {
    const { error } = await supabase.from("gifts").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف الهدية"); return; }
    toast.success("تم حذف الهدية");
    await fetchGifts();
  };

  // Store item management
  const handleAddStoreItem = async () => {
    if (!newStoreItem.name || !newStoreItem.price_coins) return;
    const file = storeFileRef.current?.files?.[0];
    let imageUrl: string | null = null;
    if (file) imageUrl = await uploadFile(file, "store");

    const { error } = await supabase.from("store_items").insert({
      name: newStoreItem.name,
      price_coins: parseInt(newStoreItem.price_coins),
      type: newStoreItem.type,
      image_url: imageUrl,
    });
    if (error) { toast.error("فشل في إضافة العنصر"); return; }
    toast.success("تمت إضافة العنصر ✅");
    setNewStoreItem({ name: "", price_coins: "", type: "frame" });
    if (storeFileRef.current) storeFileRef.current.value = "";
    await fetchStoreItems();
  };

  const deleteStoreItem = async (id: string) => {
    const { error } = await supabase.from("store_items").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف العنصر"); return; }
    toast.success("تم حذف العنصر");
    await fetchStoreItems();
  };

  // Banner management
  const handleAddBanner = async () => {
    const file = bannerFileRef.current?.files?.[0];
    if (!file) { toast.error("اختر صورة للبانر"); return; }
    const imageUrl = await uploadFile(file, "banners");
    if (!imageUrl) return;

    const { error } = await supabase.from("banners").insert({
      title: newBanner.title || "",
      image_url: imageUrl,
      sort_order: banners.length,
    });
    if (error) { toast.error("فشل في إضافة البانر"); return; }
    toast.success("تمت إضافة البانر ✅");
    setNewBanner({ title: "" });
    if (bannerFileRef.current) bannerFileRef.current.value = "";
    await fetchBanners();
  };

  const deleteBanner = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف البانر"); return; }
    toast.success("تم حذف البانر");
    await fetchBanners();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  if (!isBoss) return null;

  const tabs = [
    { id: "users", label: "المستخدمين", icon: Users },
    { id: "gifts", label: "الهدايا", icon: Gift },
    { id: "store", label: "المتجر", icon: Image },
    { id: "banners", label: "البانرات", icon: Image },
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
              <h1 className="font-black text-lg boss-fire-text">لوحة التحكم الرئيسية</h1>
            </div>
            <button onClick={() => navigate("/profile")} className="text-sm text-muted-foreground">رجوع</button>
          </div>
        </header>

        {/* Stats */}
        <div className="px-4 max-w-lg mx-auto mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "المستخدمين", value: stats.totalUsers, color: "text-primary" },
            { label: "متصل الآن", value: stats.onlineUsers, color: "text-green-400" },
            { label: "الغرف النشطة", value: stats.totalRooms, color: "text-accent" },
          ].map(s => (
            <div key={s.label} className="card-nova p-3 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs - scrollable */}
        <div className="px-4 max-w-lg mx-auto mt-4 flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 py-2 px-3 rounded-xl text-[10px] font-bold transition-all ${activeTab === tab.id ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              <tab.icon className="w-3 h-3 inline mr-1" />{tab.label}
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
                      <p className="text-xs text-muted-foreground">ID: {targetUser.user_id} • VIP {targetUser.vip_level}</p>
                      <p className="text-[10px] text-muted-foreground">💰 {targetUser.coins?.toLocaleString()} • 💎 {targetUser.diamonds?.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => promoteUser("super_admin", 6)} className="py-2.5 rounded-2xl text-xs font-bold border border-destructive/50 text-destructive hover:bg-destructive/10">
                      <Crown className="w-3.5 h-3.5 inline mr-1" /> سوبر أدمن
                    </button>
                    <button onClick={() => promoteUser("admin", 5)} className="py-2.5 rounded-2xl text-xs font-bold border border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                      <Shield className="w-3.5 h-3.5 inline mr-1" /> أدمن
                    </button>
                  </div>

                  {/* Manual grants */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold">منح يدوي</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" placeholder="عملات" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)}
                        className="bg-secondary/50 rounded-xl px-2 py-2 text-xs border border-border focus:outline-none" />
                      <input type="number" placeholder="ماس" value={diamondAmount} onChange={(e) => setDiamondAmount(e.target.value)}
                        className="bg-secondary/50 rounded-xl px-2 py-2 text-xs border border-border focus:outline-none" />
                      <input type="number" placeholder="VIP" value={vipLevel} onChange={(e) => setVipLevel(e.target.value)}
                        className="bg-secondary/50 rounded-xl px-2 py-2 text-xs border border-border focus:outline-none" />
                    </div>
                    <button onClick={distributeCoins} className="w-full py-2 rounded-xl gradient-gold text-accent-foreground font-bold text-sm btn-nova">
                      <Zap className="w-3.5 h-3.5 inline mr-1" /> تطبيق
                    </button>
                  </div>

                  <button onClick={banUser} className="w-full py-2.5 rounded-2xl bg-destructive/20 text-destructive font-bold text-sm flex items-center justify-center gap-2">
                    <Ban className="w-4 h-4" /> طرد نهائي
                  </button>
                </motion.div>
              )}
            </>
          )}

          {/* GIFTS TAB */}
          {activeTab === "gifts" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-accent" /> إضافة هدية جديدة</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="اسم الهدية" value={newGift.name} onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="السعر" type="number" value={newGift.price} onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                </div>
                <div className="flex gap-2 items-center">
                  <input ref={giftFileRef} type="file" accept="image/*,video/*" className="text-xs flex-1" />
                  <button onClick={handleAddGift} disabled={uploading} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
                    {uploading ? "جارٍ الرفع..." : "إضافة"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {giftsList.map(g => (
                  <div key={g.id} className="card-nova p-3 flex items-center gap-3">
                    {g.image_url ? <img src={g.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <span className="text-2xl">🎁</span>}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.price} عملة</p>
                    </div>
                    <button onClick={() => deleteGift(g.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {giftsList.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">لا توجد هدايا - أضف من الأعلى</p>}
              </div>
            </div>
          )}

          {/* STORE TAB */}
          {activeTab === "store" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> إضافة عنصر متجر</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="الاسم" value={newStoreItem.name} onChange={(e) => setNewStoreItem({ ...newStoreItem, name: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="السعر (عملات)" type="number" value={newStoreItem.price_coins} onChange={(e) => setNewStoreItem({ ...newStoreItem, price_coins: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                </div>
                <select value={newStoreItem.type} onChange={(e) => setNewStoreItem({ ...newStoreItem, type: e.target.value })}
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none">
                  <option value="frame">إطار</option>
                  <option value="badge">شارة</option>
                  <option value="entrance">تأثير دخول</option>
                </select>
                <div className="flex gap-2 items-center">
                  <input ref={storeFileRef} type="file" accept="image/*" className="text-xs flex-1" />
                  <button onClick={handleAddStoreItem} disabled={uploading} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
                    {uploading ? "جارٍ الرفع..." : "إضافة"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {storeItems.map(s => (
                  <div key={s.id} className="card-nova p-3 flex items-center gap-3">
                    {s.image_url ? <img src={s.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <span className="text-2xl">🖼️</span>}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.type} • {s.price_coins} عملة</p>
                    </div>
                    <button onClick={() => deleteStoreItem(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANNERS TAB */}
          {activeTab === "banners" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><Image className="w-4 h-4 text-accent" /> إضافة بانر</h3>
                <input placeholder="عنوان (اختياري)" value={newBanner.title} onChange={(e) => setNewBanner({ title: e.target.value })}
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                <div className="flex gap-2 items-center">
                  <input ref={bannerFileRef} type="file" accept="image/*" className="text-xs flex-1" />
                  <button onClick={handleAddBanner} disabled={uploading} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
                    {uploading ? "جارٍ الرفع..." : "رفع البانر"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {banners.map(b => (
                  <div key={b.id} className="card-nova p-3">
                    <img src={b.image_url} className="w-full h-24 object-cover rounded-xl mb-2" alt="" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">{b.title || "بدون عنوان"}</p>
                      <button onClick={() => deleteBanner(b.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {banners.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">لا توجد بانرات</p>}
              </div>
            </div>
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
                  <input placeholder="كود (SA)" value={newCountry.code} onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="الاسم" value={newCountry.name} onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="العملة (SAR)" value={newCountry.currency} onChange={(e) => setNewCountry({ ...newCountry, currency: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="سعر الذهب" type="number" value={newCountry.coin_price} onChange={(e) => setNewCountry({ ...newCountry, coin_price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="سعر الماس" type="number" value={newCountry.diamond_price} onChange={(e) => setNewCountry({ ...newCountry, diamond_price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <button onClick={addPricing} className="py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">حفظ</button>
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
