import { useState, useEffect, useRef } from "react";
import { Shield, Ban, Users, Crown, Search, Zap, Building2, Globe, Settings, ArrowRightLeft, Gift, Image, Upload, Trash2, Plus, BarChart3, Phone, DollarSign } from "lucide-react";
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
  const [rechargeAgents, setRechargeAgents] = useState<any[]>([]);
  const [agentReport, setAgentReport] = useState<{ today_total: number; today_count: number; week_total: number; week_count: number; week_start: string } | null>(null);
  const [newAgentId, setNewAgentId] = useState("");
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentWhatsapp, setNewAgentWhatsapp] = useState("");
  const [payrollReport, setPayrollReport] = useState<any>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Gift & Store management
  const [giftsList, setGiftsList] = useState<any[]>([]);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [newGift, setNewGift] = useState({ name: "", price: "", tier: "normal", duration_ms: "3500" });
  const [giftPreviewUrl, setGiftPreviewUrl] = useState<string | null>(null);
  const [giftMediaType, setGiftMediaType] = useState<"image" | "lottie" | "video">("image");
  const [newStoreItem, setNewStoreItem] = useState({ name: "", price_coins: "", type: "frame", tier_type: "none", tier_required: "0" });
  const [newBanner, setNewBanner] = useState({ title: "" });
  const [uploading, setUploading] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const giftFileRef = useRef<HTMLInputElement>(null);
  const giftThumbRef = useRef<HTMLInputElement>(null);
  const storeFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [videoCheckResult, setVideoCheckResult] = useState<{ ok: boolean; msg: string } | null>(null);

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
  const fetchRechargeAgents = async () => {
    const { data } = await supabase.from("recharge_agents" as any).select("*").order("created_at", { ascending: false });
    const agents = (data as any[]) || [];

    // Fetch the rich daily/weekly report (BOSS-only RPC)
    const { data: reportData } = await supabase.rpc("get_agent_transfer_stats" as any);
    const report = (reportData as any) || null;
    if (report) {
      setAgentReport({
        today_total: Number(report.today_total || 0),
        today_count: Number(report.today_count || 0),
        week_total: Number(report.week_total || 0),
        week_count: Number(report.week_count || 0),
        week_start: report.week_start,
      });
    }
    const perAgentMap = new Map<string, any>(
      ((report?.per_agent as any[]) || []).map((p) => [p.user_id, p]),
    );

    // Merge profile info + per-agent stats from RPC
    const enriched = await Promise.all(
      agents.map(async (a: any) => {
        const { data: prof } = await supabase
          .from("profiles")
          .select("coins, display_name, user_id, avatar_url")
          .eq("id", a.user_id)
          .maybeSingle();
        const stats = perAgentMap.get(a.user_id) || {};
        const lifetimeAmount = Number(stats.lifetime_amount || 0);
        const lifetimeCount = Number(stats.lifetime_transfers || 0);
        // Fetch unique recipients separately (RPC doesn't aggregate uniques)
        const { data: logs } = await supabase
          .from("agent_transfer_log" as any)
          .select("recipient_id")
          .eq("agent_id", a.user_id);
        const uniqueRecipients = new Set(((logs as any[]) || []).map((l) => l.recipient_id)).size;
        return {
          ...a,
          current_coins: Number(prof?.coins ?? stats.current_balance ?? 0),
          profile_user_id: prof?.user_id || null,
          profile_display_name: prof?.display_name || a.agent_name,
          transfers_count: lifetimeCount,
          total_sent: lifetimeAmount,
          unique_recipients: uniqueRecipients,
          today_amount: Number(stats.today_amount || 0),
          today_transfers: Number(stats.today_transfers || 0),
          week_amount: Number(stats.week_amount || 0),
          week_transfers: Number(stats.week_transfers || 0),
        };
      })
    );
    setRechargeAgents(enriched);
  };
  const addRechargeAgent = async () => {
    if (!newAgentId.trim() || !newAgentName.trim() || !newAgentWhatsapp.trim()) {
      toast.error("املأ جميع الحقول");
      return;
    }
    // Find user by user_id (display ID, not uuid)
    const { data: prof } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("user_id", newAgentId.trim()).maybeSingle();
    if (!prof) { toast.error("المستخدم غير موجود"); return; }
    const wa = newAgentWhatsapp.trim().replace(/[^0-9+]/g, "");
    const { error } = await supabase.from("recharge_agents" as any).insert({
      user_id: prof.id,
      agent_name: newAgentName.trim(),
      whatsapp_number: wa,
      avatar_url: prof.avatar_url,
    });
    if (error) { toast.error("فشل: " + error.message); return; }
    toast.success("تم إضافة وكيل الشحن ✅");
    setNewAgentId(""); setNewAgentName(""); setNewAgentWhatsapp("");
    fetchRechargeAgents();
  };
  const deleteRechargeAgent = async (id: string) => {
    const { error } = await supabase.from("recharge_agents" as any).delete().eq("id", id);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف");
    fetchRechargeAgents();
  };
  const toggleRechargeAgent = async (id: string, current: boolean) => {
    await supabase.from("recharge_agents" as any).update({ is_active: !current }).eq("id", id);
    fetchRechargeAgents();
  };

  const fetchNovaStats = async () => {
    // Count users per NOVA P level (0-6)
    const counts = await Promise.all(
      [0, 1, 2, 3, 4, 5, 6].map(async (lvl) => {
        const { count } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("nova_p_level", lvl);
        return { level: lvl, label: lvl === 0 ? "بدون" : `P${lvl}`, count: count || 0 };
      })
    );
    setNovaStats(counts);
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

      await Promise.all([fetchGifts(), fetchStoreItems(), fetchBanners(), fetchNovaStats(), fetchRechargeAgents()]);
      setLoading(false);
    };
    checkBoss();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "payroll" && isBoss && !payrollReport) {
      fetchPayrollReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isBoss]);

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

  // Validate video dimensions for fullscreen suitability
  // Recommended: aspect ratio between 0.5 (portrait) and 2.0 (landscape), and min 480px on shorter side
  const checkVideoFullscreenFit = (file: File): Promise<{ ok: boolean; msg: string; w: number; h: number; duration: number }> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => {
        const w = video.videoWidth;
        const h = video.videoHeight;
        const duration = video.duration;
        URL.revokeObjectURL(url);
        if (!w || !h) {
          resolve({ ok: false, msg: "⚠️ تعذّر قراءة أبعاد الفيديو", w: 0, h: 0, duration: 0 });
          return;
        }
        const ratio = w / h;
        const minSide = Math.min(w, h);
        if (minSide < 360) {
          resolve({ ok: false, msg: `⚠️ دقة الفيديو منخفضة (${w}×${h}). الحد الأدنى الموصى به 360 بكسل لجودة ملء الشاشة.`, w, h, duration });
        } else if (ratio < 0.4 || ratio > 2.5) {
          resolve({ ok: false, msg: `⚠️ نسبة أبعاد الفيديو (${ratio.toFixed(2)}) غير متناسقة مع ملء الشاشة. استخدم نسبة بين 1:2 و 2:1.`, w, h, duration });
        } else if (duration > 15) {
          resolve({ ok: false, msg: `⚠️ مدة الفيديو طويلة (${duration.toFixed(1)} ث). يفضّل أقل من 15 ث.`, w, h, duration });
        } else {
          resolve({ ok: true, msg: `✅ الفيديو مناسب لملء الشاشة (${w}×${h} • ${duration.toFixed(1)}ث)`, w, h, duration });
        }
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ ok: false, msg: "⚠️ تعذّر تحميل الفيديو للفحص", w: 0, h: 0, duration: 0 });
      };
      video.src = url;
    });
  };

  // Gift management - now supports Lottie JSON & transparent video + thumbnail
  const handleAddGift = async () => {
    if (!newGift.name || !newGift.price) {
      toast.error("املأ الاسم والسعر");
      return;
    }
    const file = giftFileRef.current?.files?.[0];
    const thumbFile = giftThumbRef.current?.files?.[0];
    let imageUrl: string | null = null;
    let lottieUrl: string | null = null;
    let videoUrl: string | null = null;

    // For video, run a final check before upload
    if (file && giftMediaType === "video") {
      const check = await checkVideoFullscreenFit(file);
      if (!check.ok) {
        const proceed = confirm(`${check.msg}\n\nهل تريد المتابعة بأي حال؟`);
        if (!proceed) return;
      }
    }

    if (file) {
      const uploaded = await uploadFile(file, "gifts");
      if (giftMediaType === "lottie") lottieUrl = uploaded;
      else if (giftMediaType === "video") videoUrl = uploaded;
      else imageUrl = uploaded;
    }

    // Upload thumbnail (used as poster/fallback when media is video or lottie)
    if (thumbFile && (giftMediaType === "video" || giftMediaType === "lottie")) {
      imageUrl = await uploadFile(thumbFile, "gifts");
    }

    const { error } = await supabase.from("gifts").insert({
      name: newGift.name,
      price: parseInt(newGift.price),
      image_url: imageUrl,
      lottie_url: lottieUrl,
      video_url: videoUrl,
      tier: newGift.tier,
      duration_ms: parseInt(newGift.duration_ms) || 3500,
    } as any);
    if (error) { toast.error("فشل في إضافة الهدية: " + error.message); return; }
    toast.success("تمت إضافة الهدية ✅");
    setNewGift({ name: "", price: "", tier: "normal", duration_ms: "3500" });
    setGiftPreviewUrl(null);
    setGiftMediaType("image");
    setVideoCheckResult(null);
    if (giftFileRef.current) giftFileRef.current.value = "";
    if (giftThumbRef.current) giftThumbRef.current.value = "";
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
      tier_type: newStoreItem.tier_type,
      tier_required: parseInt(newStoreItem.tier_required) || 0,
    });
    if (error) { toast.error("فشل في إضافة العنصر"); return; }
    toast.success("تمت إضافة العنصر ✅");
    setNewStoreItem({ name: "", price_coins: "", type: "frame", tier_type: "none", tier_required: "0" });
    if (storeFileRef.current) storeFileRef.current.value = "";
    await fetchStoreItems();
  };

  const deleteStoreItem = async (id: string) => {
    const { error } = await supabase.from("store_items").delete().eq("id", id);
    if (error) { toast.error("فشل في حذف العنصر"); return; }
    toast.success("تم حذف العنصر");
    await fetchStoreItems();
  };

  // Bulk import store items from JSON
  const handleBulkImport = async (defaultTierType: "none" | "nova_p" | "vip") => {
    if (!bulkJson.trim()) { toast.error("الصق قائمة JSON أولاً"); return; }
    let parsed: any;
    try { parsed = JSON.parse(bulkJson); }
    catch { toast.error("صيغة JSON غير صحيحة"); return; }
    const items = Array.isArray(parsed) ? parsed : [parsed];
    if (items.length === 0) { toast.error("القائمة فارغة"); return; }

    setBulkImporting(true);
    const rows = items.map((it: any) => ({
      name: String(it.name || "بدون اسم"),
      type: String(it.type || "frame"),
      price_coins: parseInt(it.price_coins ?? it.price ?? 0) || 0,
      price_diamonds: parseInt(it.price_diamonds ?? 0) || 0,
      image_url: it.image_url || it.image || null,
      tier_type: it.tier_type || defaultTierType,
      tier_required: parseInt(it.tier_required ?? it.tier ?? 0) || 0,
      data: it.data || {},
    }));

    const { error } = await supabase.from("store_items").insert(rows);
    setBulkImporting(false);
    if (error) { toast.error("فشل الاستيراد: " + error.message); return; }
    toast.success(`تم استيراد ${rows.length} عنصر ✅`);
    setBulkJson("");
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
    { id: "nova", label: "NOVA P", icon: BarChart3 },
    { id: "nova_items", label: "عناصر NOVA P", icon: Crown },
    { id: "vip_items", label: "عناصر VIP", icon: Crown },
    { id: "gifts", label: "الهدايا", icon: Gift },
    { id: "store", label: "المتجر", icon: Image },
    { id: "banners", label: "البانرات", icon: Image },
    { id: "agencies", label: "الوكالات", icon: Building2 },
    { id: "payroll", label: "رواتب الوكالات", icon: DollarSign },
    { id: "recharge_agents", label: "وكلاء الشحن", icon: Phone },
    { id: "pricing", label: "الأسعار", icon: Globe },
    { id: "settings", label: "الإعدادات", icon: Settings },
  ];

  const fetchPayrollReport = async () => {
    setPayrollLoading(true);
    const { data, error } = await supabase.rpc("get_boss_monthly_payroll" as any);
    if (error) { toast.error("فشل تحميل تقرير الرواتب"); setPayrollLoading(false); return; }
    setPayrollReport(data);
    setPayrollLoading(false);
  };

  // Reusable tier item form (used by NOVA P / VIP / generic store tabs)
  const renderTierItemForm = (defaultTierType: "none" | "nova_p" | "vip", title: string, accentColor: string) => {
    const tierMax = defaultTierType === "nova_p" ? 6 : defaultTierType === "vip" ? 7 : 0;
    const filteredItems = storeItems.filter((s) => (s.tier_type || "none") === defaultTierType);
    return (
      <div className="space-y-4">
        <div className="card-nova p-4 space-y-3">
          <h3 className={`font-bold text-sm flex items-center gap-2 ${accentColor}`}>
            <Crown className="w-4 h-4" /> {title}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="اسم العنصر" value={newStoreItem.name} onChange={(e) => setNewStoreItem({ ...newStoreItem, name: e.target.value, tier_type: defaultTierType })}
              className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
            <input placeholder="السعر (عملات)" type="number" value={newStoreItem.price_coins} onChange={(e) => setNewStoreItem({ ...newStoreItem, price_coins: e.target.value, tier_type: defaultTierType })}
              className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={newStoreItem.type} onChange={(e) => setNewStoreItem({ ...newStoreItem, type: e.target.value, tier_type: defaultTierType })}
              className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none">
              <option value="frame">إطار 🖼️</option>
              <option value="badge">شارة 🏅</option>
              <option value="entrance">تأثير دخول ✨</option>
              <option value="bubble">فقاعة دردشة 💬</option>
              <option value="name_style">ستايل اسم 🎨</option>
              <option value="vehicle">مركبة 🏎️</option>
            </select>
            {tierMax > 0 ? (
              <select value={newStoreItem.tier_required} onChange={(e) => setNewStoreItem({ ...newStoreItem, tier_required: e.target.value, tier_type: defaultTierType })}
                className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none">
                <option value="0">أي مستوى</option>
                {Array.from({ length: tierMax }, (_, i) => i + 1).map((lvl) => (
                  <option key={lvl} value={lvl}>{defaultTierType === "nova_p" ? `P${lvl}` : `VIP ${lvl}`} وما فوق</option>
                ))}
              </select>
            ) : (
              <div className="bg-secondary/30 rounded-xl px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-center">عام (متاح للجميع)</div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input ref={storeFileRef} type="file" accept="image/*" className="text-xs flex-1" />
            <button onClick={handleAddStoreItem} disabled={uploading} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
              {uploading ? "جارٍ الرفع..." : "إضافة"}
            </button>
          </div>
        </div>

        {/* Bulk JSON Import */}
        <div className="card-nova p-4 space-y-2 border border-accent/30">
          <h3 className="font-bold text-xs flex items-center gap-2 text-accent">
            <Upload className="w-3.5 h-3.5" /> استيراد جماعي (JSON)
          </h3>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            الصق مصفوفة من العناصر. الحقول: name, type (frame/badge/entrance/bubble/name_style/vehicle), price_coins, image_url, tier_required.
          </p>
          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            placeholder='[{"name":"Gold Frame","type":"frame","price_coins":5000,"image_url":"https://...","tier_required":3}]'
            rows={5}
            className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-[10px] font-mono border border-border focus:outline-none"
            dir="ltr"
          />
          <button
            onClick={() => handleBulkImport(defaultTierType)}
            disabled={bulkImporting}
            className="w-full py-2 rounded-xl gradient-gold text-accent-foreground font-bold text-xs"
          >
            {bulkImporting ? "جارٍ الاستيراد..." : "استيراد جماعي"}
          </button>
        </div>

        <div className="space-y-2">
          {filteredItems.map(s => (
            <div key={s.id} className="card-nova p-3 flex items-center gap-3">
              {s.image_url ? <img src={s.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <span className="text-2xl">🖼️</span>}
              <div className="flex-1">
                <p className="font-bold text-sm">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.type} • {s.price_coins} عملة
                  {s.tier_required > 0 && (
                    <span className={`ml-2 ${accentColor} font-bold`}>
                      • {s.tier_type === "nova_p" ? `P${s.tier_required}+` : `VIP ${s.tier_required}+`}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => deleteStoreItem(s.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {filteredItems.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">لا توجد عناصر بعد - أضف من الأعلى</p>}
        </div>
      </div>
    );
  };

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

          {/* NOVA P STATS TAB */}
          {activeTab === "nova" && (
            <div className="space-y-4">
              <div className="card-nova p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-accent" />
                  <h3 className="font-bold text-sm">إحصائيات NOVA P — توزيع المستويات</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {novaStats.filter(s => s.level >= 1).map(s => {
                    const asset = NOVA_ASSETS.byLevel[s.level];
                    return (
                      <div key={s.level} className={`rounded-xl p-2 text-center bg-gradient-to-br ${asset?.gradient || ''} border border-white/20`}>
                        <p className="text-[10px] font-bold opacity-80">👑 {s.label}</p>
                        <p className="text-lg font-black">{s.count.toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={novaStats.filter(s => s.level >= 1)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {novaStats.filter(s => s.level >= 1).map((s) => {
                          const colors: Record<number, string> = {
                            1: "hsl(280 90% 60%)",
                            2: "hsl(200 90% 60%)",
                            3: "hsl(180 90% 60%)",
                            4: "hsl(20 90% 55%)",
                            5: "hsl(320 90% 60%)",
                            6: "hsl(45 95% 55%)",
                          };
                          return <Cell key={s.level} fill={colors[s.level] || "hsl(var(--primary))"} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card-nova p-4">
                <h3 className="font-bold text-sm mb-3">ملخص</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">إجمالي مستخدمي NOVA P</span>
                    <span className="font-black text-accent">
                      {novaStats.filter(s => s.level >= 1).reduce((sum, s) => sum + s.count, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">مستخدمون بدون NOVA P</span>
                    <span className="font-bold">{(novaStats.find(s => s.level === 0)?.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">أعلى مستوى نشط (P5+P6)</span>
                    <span className="font-black text-amber-400">
                      {((novaStats.find(s => s.level === 5)?.count || 0) + (novaStats.find(s => s.level === 6)?.count || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button onClick={fetchNovaStats} className="w-full mt-3 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
                  تحديث الإحصائيات
                </button>
              </div>
            </div>
          )}

          {/* GIFTS TAB */}
          {activeTab === "gifts" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><Gift className="w-4 h-4 text-accent" /> إضافة هدية جديدة (Lottie / فيديو شفاف / صورة)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="اسم الهدية" value={newGift.name} onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                  <input placeholder="السعر (Gold)" type="number" value={newGift.price} onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={newGift.tier} onChange={(e) => setNewGift({ ...newGift, tier: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none">
                    <option value="normal">عادية</option>
                    <option value="rare">نادرة</option>
                    <option value="epic">ملحمية</option>
                    <option value="legendary">أسطورية</option>
                    <option value="mythic">خرافية</option>
                  </select>
                  <input placeholder="مدة العرض (ms)" type="number" value={newGift.duration_ms} onChange={(e) => setNewGift({ ...newGift, duration_ms: e.target.value })}
                    className="bg-secondary/50 rounded-xl px-3 py-2 text-xs border border-border focus:outline-none" />
                </div>
                <div className="flex gap-1">
                  {(["image", "lottie", "video"] as const).map((t) => (
                    <button key={t} onClick={() => setGiftMediaType(t)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                        giftMediaType === t ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                      {t === "image" ? "🖼️ صورة" : t === "lottie" ? "✨ Lottie JSON" : "🎬 فيديو شفاف"}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {giftMediaType === "lottie" && "ملف .json من lottiefiles.com — خفيف وسريع"}
                  {giftMediaType === "video" && "ملف .webm أو .mp4 بخلفية شفافة (alpha channel) — تأثير سينمائي"}
                  {giftMediaType === "image" && "ملف .png / .gif — للهدايا البسيطة"}
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    ref={giftFileRef}
                    type="file"
                    accept={giftMediaType === "lottie" ? "application/json,.json" : giftMediaType === "video" ? "video/*" : "image/*"}
                    className="text-xs flex-1"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      setVideoCheckResult(null);
                      if (!f) { setGiftPreviewUrl(null); return; }
                      if (giftMediaType === "image") {
                        setGiftPreviewUrl(URL.createObjectURL(f));
                      } else if (giftMediaType === "video") {
                        setGiftPreviewUrl(null);
                        const check = await checkVideoFullscreenFit(f);
                        setVideoCheckResult({ ok: check.ok, msg: check.msg });
                        if (check.ok) toast.success(check.msg);
                        else toast.error(check.msg, { duration: 6000 });
                      } else {
                        setGiftPreviewUrl(null);
                      }
                    }}
                  />
                  <button onClick={handleAddGift} disabled={uploading} className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-xs">
                    {uploading ? "جارٍ الرفع..." : "إضافة"}
                  </button>
                </div>

                {/* Video fit feedback */}
                {videoCheckResult && (
                  <div className={`text-[11px] p-2 rounded-lg border ${
                    videoCheckResult.ok
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}>
                    {videoCheckResult.msg}
                  </div>
                )}

                {/* Optional thumbnail/cover image for video & lottie */}
                {(giftMediaType === "video" || giftMediaType === "lottie") && (
                  <div className="space-y-1 p-2 rounded-xl bg-background/40 border border-border/30">
                    <p className="text-[10px] font-bold text-foreground">🖼️ صورة الهدية (اختيارية)</p>
                    <p className="text-[10px] text-muted-foreground">
                      تظهر في قائمة الهدايا وكصورة احتياطية إذا فشل تشغيل {giftMediaType === "video" ? "الفيديو" : "الـ Lottie"}.
                    </p>
                    <input
                      ref={giftThumbRef}
                      type="file"
                      accept="image/*"
                      className="text-xs w-full"
                    />
                  </div>
                )}

                {giftPreviewUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-xl bg-background/40 border border-border/30">
                    <img src={giftPreviewUrl} alt="معاينة الهدية" className="w-16 h-16 rounded-lg object-contain bg-secondary/40" />
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground">معاينة</p>
                      <p className="text-xs font-bold">{newGift.name || "بدون اسم"}</p>
                    </div>
                    <button
                      onClick={() => {
                        setGiftPreviewUrl(null);
                        if (giftFileRef.current) giftFileRef.current.value = "";
                      }}
                      className="text-destructive text-xs"
                    >
                      إزالة
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {giftsList.map((g: any) => (
                  <div key={g.id} className="card-nova p-3 flex items-center gap-3">
                    {g.image_url ? <img src={g.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" /> : <span className="text-2xl">{g.video_url ? "🎬" : g.lottie_url ? "✨" : "🎁"}</span>}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {g.price} عملة · {g.tier || "normal"} · {g.duration_ms || 3500}ms
                        {g.lottie_url && " · Lottie"}
                        {g.video_url && " · فيديو"}
                      </p>
                    </div>
                    {g.video_url && (
                      <button
                        onClick={async () => {
                          // Stop any other gift audio currently playing.
                          const { stopGiftAudio, registerGiftAudio } = await import("@/lib/giftAudioManager");
                          stopGiftAudio();
                          const audio = new Audio(g.video_url);
                          audio.volume = 1;
                          registerGiftAudio(audio);
                          audio.play().catch(() => toast.error("تعذّر تشغيل صوت الهدية"));
                          toast.success(`🔊 يعزف صوت: ${g.name}`);
                        }}
                        title="اختبار صوت الهدية فقط"
                        className="text-xs px-2 py-1 rounded-lg bg-primary/20 text-primary font-bold hover:bg-primary/30 transition"
                      >
                        🔊 اختبر الصوت
                      </button>
                    )}
                    <button onClick={() => deleteGift(g.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {giftsList.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">لا توجد هدايا - أضف من الأعلى</p>}
              </div>
            </div>
          )}

          {/* NOVA P ITEMS TAB */}
          {activeTab === "nova_items" && renderTierItemForm("nova_p", "إضافة عنصر NOVA P (إطار/شارة/دخول/مركبة)", "text-purple-300")}

          {/* VIP ITEMS TAB */}
          {activeTab === "vip_items" && renderTierItemForm("vip", "إضافة عنصر VIP (إطار/شارة/دخول/مركبة)", "text-amber-300")}

          {/* STORE TAB - generic items */}
          {activeTab === "store" && renderTierItemForm("none", "إضافة عنصر متجر عام (إطار/شارة/دخول)", "text-primary")}

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

          {/* RECHARGE AGENTS TAB */}
          {activeTab === "recharge_agents" && (
            <div className="space-y-4">
              <div className="card-nova p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                  <Phone className="w-4 h-4" /> إضافة وكيل شحن
                </h3>
                <input
                  value={newAgentId}
                  onChange={(e) => setNewAgentId(e.target.value)}
                  placeholder="ID المستخدم (مثل 123456)"
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none"
                />
                <input
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="اسم الوكيل المعروض"
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none"
                />
                <input
                  value={newAgentWhatsapp}
                  onChange={(e) => setNewAgentWhatsapp(e.target.value)}
                  placeholder="رقم الواتساب (بصيغة دولية مثل 201xxxxxxxxx)"
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none"
                  dir="ltr"
                />
                <button
                  onClick={addRechargeAgent}
                  className="w-full py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova"
                >
                  ➕ إضافة وكيل
                </button>
              </div>

              {/* Daily / Weekly transfer report */}
              {agentReport && (
                <div className="card-nova p-4 space-y-3 border border-primary/30">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm">تقرير التحويلات</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/40 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground">اليوم</p>
                      <div className="flex items-center gap-1">
                        <CurrencyIcon type="gold" size="sm" />
                        <p className="text-lg font-extrabold text-primary">{agentReport.today_total.toLocaleString()}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{agentReport.today_count} عملية</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        الأسبوع (من السبت {agentReport.week_start})
                      </p>
                      <div className="flex items-center gap-1">
                        <CurrencyIcon type="gold" size="sm" />
                        <p className="text-lg font-extrabold text-accent">{agentReport.week_total.toLocaleString()}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{agentReport.week_count} عملية</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Aggregate summary */}
              {rechargeAgents.length > 0 && (
                <div className="card-nova p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">إجمالي الوكلاء</p>
                    <p className="text-lg font-extrabold text-primary">{rechargeAgents.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">إجمالي الرصيد</p>
                    <div className="flex items-center justify-center gap-1">
                      <CurrencyIcon type="gold" size="sm" />
                      <p className="text-lg font-extrabold">{rechargeAgents.reduce((s, a) => s + (a.current_coins || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">إجمالي التحويلات</p>
                    <p className="text-lg font-extrabold text-accent">{rechargeAgents.reduce((s, a) => s + (a.transfers_count || 0), 0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">إجمالي المُرسل</p>
                    <div className="flex items-center justify-center gap-1">
                      <CurrencyIcon type="gold" size="sm" />
                      <p className="text-lg font-extrabold">{rechargeAgents.reduce((s, a) => s + (a.total_sent || 0), 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-xs text-muted-foreground">الوكلاء الحاليون ({rechargeAgents.length})</h4>
                {rechargeAgents.map((a) => (
                  <div key={a.id} className="card-nova p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.agent_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{a.agent_name}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {a.profile_user_id ? `ID: ${a.profile_user_id} • ` : ""}{a.whatsapp_number}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleRechargeAgent(a.id, a.is_active)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold ${a.is_active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}
                      >
                        {a.is_active ? "نشط" : "موقوف"}
                      </button>
                      <button onClick={() => deleteRechargeAgent(a.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Per-agent stats */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground">الرصيد الحالي</p>
                        <div className="flex items-center justify-center gap-1">
                          <CurrencyIcon type="gold" size="sm" />
                          <p className="text-xs font-extrabold text-primary">{(a.current_coins || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground">عدد التحويلات</p>
                        <p className="text-xs font-extrabold text-accent">{a.transfers_count || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground">عدد المستفيدين</p>
                        <p className="text-xs font-extrabold">{a.unique_recipients || 0}</p>
                      </div>
                    </div>
                    {/* Daily / Weekly per-agent */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-primary/10 rounded-lg px-3 py-2 space-y-0.5">
                        <p className="text-[9px] text-muted-foreground">اليوم</p>
                        <div className="flex items-center gap-1">
                          <CurrencyIcon type="gold" size="sm" />
                          <span className="text-xs font-extrabold text-primary">{(a.today_amount || 0).toLocaleString()}</span>
                          <span className="text-[9px] text-muted-foreground ml-auto">({a.today_transfers || 0})</span>
                        </div>
                      </div>
                      <div className="bg-accent/10 rounded-lg px-3 py-2 space-y-0.5">
                        <p className="text-[9px] text-muted-foreground">الأسبوع</p>
                        <div className="flex items-center gap-1">
                          <CurrencyIcon type="gold" size="sm" />
                          <span className="text-xs font-extrabold text-accent">{(a.week_amount || 0).toLocaleString()}</span>
                          <span className="text-[9px] text-muted-foreground ml-auto">({a.week_transfers || 0})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-1.5">
                      <span className="text-[10px] text-muted-foreground">إجمالي المُرسل</span>
                      <div className="flex items-center gap-1">
                        <CurrencyIcon type="gold" size="sm" />
                        <span className="text-xs font-extrabold">{(a.total_sent || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {rechargeAgents.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-8">لا يوجد وكلاء بعد</p>
                )}
              </div>
            </div>
          )}

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
