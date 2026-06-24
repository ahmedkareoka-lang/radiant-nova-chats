import { useState, useEffect, useMemo } from "react";
import storeCatalog from "@/lib/storeCatalog.json";
import { ArrowLeft, ShoppingBag, Check, Eye, Shirt, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DualBadge from "@/components/DualBadge";
import FramedAvatar from "@/components/FramedAvatar";
import { FRAME_MAP, FRAME_ANIMATION, FRAMES } from "@/lib/frameConfig";
import { applyVipDiscount, vipStoreDiscountPct, activeVipLevel } from "@/lib/vipBenefits";

// Dynamically derived from FRAMES — adding a frame to frameConfig.ts
// makes it appear in the store automatically (only ones flagged for sale).
const STORE_FRAMES = FRAMES.filter((f) => !!f.store).map((f) => ({
  id: f.key,
  name: f.name,
  type: "frame",
  price_coins: f.store!.price_coins,
  image: f.image,
  data: {
    rarity: f.store!.rarity,
    frame_url: f.key,
    animated: !!f.animation,
  },
  vipRequired: f.store!.vipRequired,
}));

const StorePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [ownedFrames, setOwnedFrames] = useState<string[]>([]);
  const [ownedItemNames, setOwnedItemNames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adminItems, setAdminItems] = useState<any[]>([]);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"frame" | "gift" | "entrance" | "badge" | "all">("all");

  const fetchAdminItems = async () => {
    const { data } = await supabase
      .from("store_items")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAdminItems(data || []);
  };

  const refreshInventory = async (uid: string) => {
    const { data: inv } = await supabase
      .from("inventory")
      .select("item_name,item_type,item_data")
      .eq("user_id", uid);
    setOwnedFrames((inv || []).filter((i: any) => i.item_type === "frame").map((i: any) => i.item_name));
    setOwnedItemNames(new Set((inv || []).map((i: any) => i.item_name)));
  };

  const isEquippedItem = (type: string, item: any) => {
    if (!profile) return false;
    if (type === "frame") {
      const frameKey = item?.data?.frame_url || item?.item_data?.frame_url || item?.image_url || item?.image || null;
      return profile.equipped_frame === frameKey;
    }
    if (type === "entrance") {
      const entranceKey = item?.item_data?.image_url || item?.image_url || item?.image || null;
      return profile.equipped_entrance_effect === entranceKey;
    }
    if (type === "badge") {
      return profile.equipped_badge === item.name;
    }
    return false;
  };

  const toggleEquipItem = async (type: string, item: any) => {
    if (!profile) return;
    const equipped = isEquippedItem(type, item);
    const updates: Record<string, string | null> = {};
    if (type === "frame") updates.equipped_frame = equipped ? null : item?.data?.frame_url || item?.item_data?.frame_url || item?.image_url || item?.image || null;
    if (type === "entrance") updates.equipped_entrance_effect = equipped ? null : item?.item_data?.image_url || item?.image_url || item?.image || null;
    if (type === "badge") updates.equipped_badge = equipped ? null : item.name;
    if (!Object.keys(updates).length) return;
    const { error } = await supabase.from("profiles").update(updates as any).eq("id", profile.id);
    if (error) {
      toast.error("تعذر تحديث التجهيز");
      return;
    }
    setProfile((prev: any) => ({ ...prev, ...updates }));
    toast.success(equipped ? "تم خلع العنصر" : "تم تجهيز العنصر فورًا");
  };

  const applyInstantEquip = async (type: string, item: any, itemData: any) => {
    if (!profile) return;
    const updates: Record<string, string | null> = {};
    if (type === "frame") updates.equipped_frame = itemData.frame_url || item.image_url || item.image || null;
    if (type === "entrance") updates.equipped_entrance_effect = itemData.image_url || item.image_url || item.image || null;
    if (type === "badge") updates.equipped_badge = item.name;
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates as any).eq("id", profile.id);
      setProfile((prev: any) => ({ ...prev, ...updates, coins: (prev?.coins || 0) - (Number(item.price_coins) || item.price || 0) }));
    } else {
      setProfile((prev: any) => ({ ...prev, coins: (prev?.coins || 0) - (Number(item.price_coins) || item.price || 0) }));
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);

      const countryCode = p?.country_code || "US";
      const { data: pr } = await supabase.from("pricing_plans").select("*").eq("country_code", countryCode).single();
      setPricing(pr || { currency: "USD", coin_price: 1, diamond_price: 2 });

      await refreshInventory(user.id);
      await fetchAdminItems();
      setLoading(false);
    };
    load();

    // Realtime: admin add/delete reflects instantly for everyone
    const channel = supabase
      .channel("store-items-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_items" }, () => fetchAdminItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const buyFrame = async (frame: typeof STORE_FRAMES[0]) => {
    if (!profile) return;
    if (ownedFrames.includes(frame.name)) {
      toast.info("لديك هذا الإطار بالفعل!");
      return;
    }
    const price = applyVipDiscount(frame.price_coins, profile);
    if (profile.coins < price) {
      toast.error("رصيدك غير كافٍ!");
      return;
    }

    const newCoins = profile.coins - price;
    const { error } = await supabase.rpc("deduct_coins", { _user_id: profile.id, _amount: price });
    if (error) { toast.error("فشل في الشراء"); return; }
    await supabase.from("profiles").update({ equipped_frame: frame.data.frame_url }).eq("id", profile.id);
    await supabase.from("inventory").insert({
      user_id: profile.id,
      item_type: "frame",
      item_name: frame.name,
      item_data: frame.data,
    });
    await supabase.from("notifications").insert({
      user_id: profile.id,
      title: "إطار جديد! 🖼️",
      message: `تم شراء ${frame.name} وتم تفعيله تلقائياً!`,
      type: "purchase",
    });
    setProfile({ ...profile, coins: newCoins, equipped_frame: frame.data.frame_url });
    setOwnedFrames([...ownedFrames, frame.name]);
    toast.success(`تم شراء ${frame.name} وتفعيله! 🎉`);
  };

  const RARITY_STYLES: Record<string, { border: string; glow: string; label: string; color: string }> = {
    common:    { border: "border-slate-400/40",   glow: "",                                          label: "عادي",     color: "text-slate-300" },
    rare:      { border: "border-blue-400/60",    glow: "shadow-[0_0_15px_hsl(220_90%_60%/0.4)]",   label: "نادر",     color: "text-blue-300" },
    epic:      { border: "border-purple-400/70",  glow: "shadow-[0_0_20px_hsl(280_90%_60%/0.5)]",   label: "ملحمي",    color: "text-purple-300" },
    legendary: { border: "border-amber-400/90",   glow: "shadow-[0_0_28px_hsl(45_95%_55%/0.7)] animate-pulse", label: "أسطوري", color: "text-amber-300" },
  };

  // Buy a catalog item (frame / gift / entrance) — anyone can buy, saved to inventory
  const buyCatalogItem = async (cat: "frame" | "gift" | "entrance", item: any) => {
    if (!profile) return;
    if (ownedItemNames.has(item.name)) { toast.info("لديك هذا العنصر بالفعل!"); return; }
    const price = applyVipDiscount(item.price, profile);
    if (profile.coins < price) { toast.error("رصيدك غير كافٍ!"); return; }
    const { error } = await supabase.rpc("deduct_coins", { _user_id: profile.id, _amount: price });
    if (error) { toast.error("فشل في الشراء"); return; }
    const itemData: any = {
      image_url: item.image,
      frame_url: cat === "frame" ? item.image : undefined,
      duration_seconds: item.duration,
      rarity: item.rarity,
    };
    await supabase.from("inventory").insert({
      user_id: profile.id,
      item_type: cat,
      item_name: item.name,
      item_data: itemData,
    });
    await applyInstantEquip(cat, { ...item, price_coins: price, price }, itemData);
    if (cat === "frame") setOwnedFrames([...ownedFrames, item.name]);
    setOwnedItemNames(new Set([...ownedItemNames, item.name]));
    await supabase.from("notifications").insert({
      user_id: profile.id,
      title: `${cat === "frame" ? "إطار" : cat === "gift" ? "هدية" : "دخولية"} جديدة! ✨`,
      message: `تم شراء ${item.name} وتفعيله مباشرة (${item.duration}s).`,
      type: "purchase",
    });
    toast.success(`تم شراء ${item.name} وتفعيله فورًا 🎉`);
  };

  const renderCatalogSection = (
    title: string,
    emoji: string,
    cat: "frame" | "gift" | "entrance",
    items: any[],
  ) => (
    <div className="space-y-2">
      <h2 className="font-bold text-sm flex items-center gap-2">
        <span>{emoji}</span> {title} <span className="text-muted-foreground text-[10px]">({items.length})</span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const owned = ownedItemNames.has(item.name);
          const rs = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
          return (
            <div key={item.id} className={`card-nova p-3 text-center space-y-2 border ${rs.border} ${rs.glow}`}>
              <div className="relative w-24 h-24 mx-auto">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                <span className={`absolute top-0 right-0 px-1.5 py-0.5 rounded-md bg-background/80 text-[8px] font-black ${rs.color}`}>
                  {rs.label}
                </span>
              </div>
              <p className="font-bold text-xs line-clamp-1">{item.name}</p>
              <p className="text-[9px] text-muted-foreground">⏱ {item.duration}s</p>
              <div className="flex items-center justify-center gap-1">
                <CurrencyIcon type="gold" size="xs" />
                <span className="text-xs font-bold text-accent">{item.price.toLocaleString()}</span>
              </div>
              {owned ? (
                <button
                  onClick={() => toggleEquipItem(cat, item)}
                  className={`w-full py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 ${isEquippedItem(cat, item) ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground border border-border"}`}
                >
                  {isEquippedItem(cat, item) ? <Check className="w-3 h-3" /> : <Shirt className="w-3 h-3" />}
                  {isEquippedItem(cat, item) ? "خلع" : "تجهيز"}
                </button>
              ) : (
                <button
                  onClick={() => buyCatalogItem(cat, item)}
                  className="w-full py-1.5 rounded-xl gradient-neon text-primary-foreground text-[10px] font-bold btn-nova"
                >
                  شراء
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Generic purchase for admin-added items (NOVA P / VIP / generic). Anyone can buy — no tier restriction.
  const buyAdminItem = async (item: any) => {
    if (!profile) return;
    if (ownedItemNames.has(item.name)) {
      toast.info("لديك هذا العنصر بالفعل في الحقيبة!");
      return;
    }
    const price = Number(item.price_coins) || 0;
    if (profile.coins < price) {
      toast.error("رصيدك غير كافٍ!");
      return;
    }
    const { error } = await supabase.rpc("deduct_coins", { _user_id: profile.id, _amount: price });
    if (error) { toast.error("فشل في الشراء"); return; }
    // For frame items, store key in item_data.frame_url so the profile picker can find them.
    // Admin items only have a direct image_url so we use that as the key.
    const frameKey = item.type === "frame" ? (item.image_url || item.id) : null;
    await supabase.from("inventory").insert({
      user_id: profile.id,
      item_type: item.type,
      item_name: item.name,
      item_data: { ...(item.data || {}), image_url: item.image_url, source_id: item.id, frame_url: frameKey },
    });
    await applyInstantEquip(item.type, { ...item, price }, { ...(item.data || {}), image_url: item.image_url, frame_url: frameKey });
    setOwnedItemNames(new Set([...ownedItemNames, item.name]));
    if (item.type === "frame") setOwnedFrames([...ownedFrames, item.name]);
    await supabase.from("notifications").insert({
      user_id: profile.id,
      title: "عنصر جديد ✨",
      message: `تم شراء ${item.name} وأضيف إلى الحقيبة!`,
      type: "purchase",
    });
    toast.success(`تم شراء ${item.name} وتفعيله فورًا 🎉`);
  };

  const adminNoneItems = useMemo(() => adminItems.filter((it) => (it.tier_type || "none") === "none"), [adminItems]);
  const filteredCatalogFrames = useMemo(() => activeTab === "all" || activeTab === "frame" ? storeCatalog.frames : [], [activeTab]);
  const filteredCatalogGifts = useMemo(() => activeTab === "all" || activeTab === "gift" ? storeCatalog.gifts : [], [activeTab]);
  const filteredCatalogEntrances = useMemo(() => activeTab === "all" || activeTab === "entrance" ? storeCatalog.entrances : [], [activeTab]);
  const filteredAdminNoneItems = useMemo(() => activeTab === "all" ? adminNoneItems : adminNoneItems.filter((it) => it.type === activeTab), [activeTab, adminNoneItems]);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">المتجر</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
                <CurrencyIcon type="gold" size="xs" />
                <span className="text-xs font-bold text-accent">{(profile?.coins || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
                <CurrencyIcon type="diamond" size="xs" />
                <span className="text-xs font-bold text-primary">{(profile?.diamonds || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">

          {/* Special 4-digit ID — luxury fiery orange entry */}
          <button
            onClick={() => navigate("/special-id")}
            className="w-full rounded-2xl p-4 text-start flex items-center gap-3 relative overflow-hidden active:scale-[0.98] transition-transform"
            style={{
              background:
                "linear-gradient(135deg, hsl(20 95% 28%) 0%, hsl(15 90% 18%) 60%, hsl(35 100% 35%) 100%)",
              border: "1.5px solid hsl(35 100% 60% / 0.85)",
              boxShadow:
                "0 0 22px hsl(25 100% 55% / 0.7), 0 0 50px hsl(15 100% 48% / 0.4), inset 0 1px 0 hsl(45 100% 85% / 0.5)",
            }}
          >
            <span aria-hidden className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-2xl"
              style={{ background: "radial-gradient(circle, hsl(35 100% 60% / 0.55), transparent 70%)" }} />
            <div
              className="w-12 h-12 rounded-xl grid place-items-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(25 100% 55%), hsl(15 100% 48%))",
                boxShadow: "0 0 16px hsl(25 100% 55% / 0.85)",
              }}
            >
              <Flame className="w-6 h-6 text-white drop-shadow-[0_0_8px_hsl(45_100%_75%)]" />
            </div>
            <div className="flex-1 relative">
              <p className="font-black text-base bg-gradient-to-r from-amber-100 via-orange-200 to-red-300 bg-clip-text text-transparent">
                🔥 متجر الـ ID المميز
              </p>
              <p className="text-[11px] text-orange-100/80 mt-0.5">
                معرّف من 4 أرقام يلمع بلون البرتقالي الناري على بروفايلك
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-black/40 text-orange-200 border border-orange-400/40">
                  أسبوع 125,000
                </span>
                <span className="px-2 py-0.5 rounded-full bg-black/40 text-amber-200 border border-amber-400/40">
                  شهر 1,000,000
                </span>
              </div>
            </div>
          </button>


          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "الكل" },
              { id: "frame", label: "الإطارات" },
              { id: "gift", label: "الهدايا" },
              { id: "entrance", label: "الدخوليات" },
              { id: "badge", label: "الشارات" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activeTab === "all" || activeTab === "frame") && <h2 className="font-bold text-sm">🖼️ الإطارات</h2>}

          {(activeTab === "all" || activeTab === "frame") && <div className="grid grid-cols-2 gap-3">
            {STORE_FRAMES.map((frame) => {
              const owned = ownedFrames.includes(frame.name);
              const equipped = profile?.equipped_frame === frame.data.frame_url;
              return (
                <div key={frame.id} className={`card-nova p-4 text-center space-y-2 ${equipped ? "border border-primary/50 glow-neon" : ""}`}>
                  <div className="relative w-24 h-24 mx-auto">
                    <img src={frame.image} alt={frame.name} className={`w-full h-full object-contain ${FRAME_ANIMATION[frame.id] || ""}`} loading="lazy" decoding="async" />
                  </div>
                  <p className="font-bold text-xs">{frame.name}</p>
                  {(frame as any).vipRequired && (
                    <p className="text-[9px] text-amber-400 font-bold">👑 VIP {(frame as any).vipRequired}+</p>
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <CurrencyIcon type="gold" size="xs" />
                    <span className="text-xs font-bold text-accent">{frame.price_coins.toLocaleString()}</span>
                  </div>
                  {owned ? (
                    <button
                      onClick={() => toggleEquipItem("frame", frame)}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${equipped ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground border border-border"}`}
                    >
                      {equipped ? <Check className="w-3 h-3" /> : <Shirt className="w-3 h-3" />}
                      {equipped ? "خلع" : "تجهيز"}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyFrame(frame)}
                      className="w-full py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-bold btn-nova"
                    >
                      شراء
                    </button>
                  )}
                </div>
              );
            })}
          </div>}

          {filteredCatalogFrames.length > 0 && renderCatalogSection("إطارات أسطورية", "🖼️", "frame", filteredCatalogFrames)}
          {filteredCatalogGifts.length > 0 && renderCatalogSection("هدايا فاخرة", "🎁", "gift", filteredCatalogGifts)}
          {filteredCatalogEntrances.length > 0 && renderCatalogSection("دخوليات أسطورية", "🚪", "entrance", filteredCatalogEntrances)}
          {/* NOVA P store items removed */}

          {/* VIP items (grouped by tier) — anyone can buy */}
          {[1, 2, 3, 4, 5, 6, 7].map((tier) => {
            const items = adminItems.filter((it) => it.tier_type === "vip" && (it.tier_required || 0) === tier);
            if (items.length === 0) return null;
            return (
              <div key={`vip-${tier}`} className="space-y-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-amber-300">
                  💎 عناصر VIP {tier}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => {
                    const owned = ownedItemNames.has(item.name);
                    const equipped = item.type === "frame" && profile?.equipped_frame === item.image_url;
                    return (
                    <div key={item.id} className={`card-nova p-4 text-center space-y-2 border ${equipped ? "border-amber-300 glow-gold" : "border-amber-400/40"} shadow-[0_0_20px_hsl(45_95%_55%/0.3)]`}>
                      {item.image_url && (
                        <div className="w-24 h-24 mx-auto"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain" loading="lazy" decoding="async" /></div>
                      )}
                      <p className="font-bold text-xs">{item.name}</p>
                      <p className="text-[9px] text-amber-300 font-bold">عنصر VIP {tier} 💎</p>
                      <div className="flex items-center justify-center gap-1">
                        <CurrencyIcon type="gold" size="xs" />
                        <span className="text-xs font-bold text-accent">{Number(item.price_coins).toLocaleString()}</span>
                      </div>
                      {owned ? (
                        <button
                          onClick={() => toggleEquipItem(item.type, item)}
                          className={`w-full py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 ${isEquippedItem(item.type, item) ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground border border-border"}`}
                        >
                          {isEquippedItem(item.type, item) ? <Check className="w-3 h-3" /> : <Shirt className="w-3 h-3" />}
                          {isEquippedItem(item.type, item) ? "خلع" : "تجهيز"}
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setPreviewItem({ ...item, _tierType: "vip", _tier: tier })}
                            className="py-1.5 rounded-xl border border-amber-400/50 text-amber-200 text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-amber-400/10 transition"
                          >
                            <Eye className="w-3 h-3" /> معاينة
                          </button>
                          <button
                            onClick={() => buyAdminItem(item)}
                            className="py-1.5 rounded-xl gradient-gold text-accent-foreground text-[10px] font-bold btn-nova"
                          >
                            شراء
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Generic admin store items (Entrance / Badges / etc.) — anyone can buy */}
          {filteredAdminNoneItems.length > 0 && (
            <>
              <h2 className="font-bold text-sm pt-2">✨ عناصر المتجر</h2>
              <div className="grid grid-cols-2 gap-3">
                {filteredAdminNoneItems.map((item) => {
                  const owned = ownedItemNames.has(item.name);
                  const equipped = item.type === "frame" && profile?.equipped_frame === item.image_url;
                  return (
                  <div key={item.id} className={`card-nova p-4 text-center space-y-2 ${equipped ? "border border-primary/50 glow-neon" : ""}`}>
                    {item.image_url && (
                      <div className="w-24 h-24 mx-auto">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                      </div>
                    )}
                    <p className="font-bold text-xs">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                    <div className="flex items-center justify-center gap-1">
                      <CurrencyIcon type="gold" size="xs" />
                      <span className="text-xs font-bold text-accent">{Number(item.price_coins).toLocaleString()}</span>
                    </div>
                    {owned ? (
                      <button
                        onClick={() => toggleEquipItem(item.type, item)}
                        className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${isEquippedItem(item.type, item) ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground border border-border"}`}
                      >
                        {isEquippedItem(item.type, item) ? <Check className="w-3 h-3" /> : <Shirt className="w-3 h-3" />}
                        {isEquippedItem(item.type, item) ? "خلع" : "تجهيز"}
                      </button>
                    ) : (
                      <button
                        onClick={() => buyAdminItem(item)}
                        className="w-full py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-bold btn-nova"
                      >
                        شراء
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </>
          )}

          <button
            onClick={() => navigate("/top-up")}
            className="w-full py-3 rounded-full border border-accent/50 text-accent font-bold text-sm btn-nova flex items-center justify-center gap-2"
          >
            <CurrencyIcon type="gold" size="sm" /> شحن رصيد
          </button>
        </main>

        <BottomNav />

        {/* Preview modal */}
        <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border">
            <DialogHeader>
              <DialogTitle className="text-center">معاينة على الملف الشخصي</DialogTitle>
              <DialogDescription className="text-center text-xs">
                هكذا سيظهر هذا العنصر على بروفايلك بعد الشراء
              </DialogDescription>
            </DialogHeader>
            {previewItem && (
              <div className="space-y-4 py-2">
                {/* Mock profile card */}
                <div className="card-nova p-5 text-center space-y-3">
                  <div className="mx-auto w-fit">
                    {previewItem.type === "frame" && previewItem.image_url ? (
                      <FramedAvatar
                        avatarUrl={profile?.avatar_url}
                        equippedFrame={previewItem.image_url}
                        size={112}
                      />
                    ) : (
                      <FramedAvatar
                        avatarUrl={profile?.avatar_url}
                        equippedFrame={profile?.equipped_frame}
                        size={112}
                        ringClassName="ring-2 ring-primary/40"
                      />
                    )}
                  </div>
                  <p className="font-bold text-base">{profile?.display_name || "أنت"}</p>
                  <div className="flex justify-center">
                    <DualBadge
                      vipLevel={previewItem._tierType === "vip" ? previewItem._tier : (profile?.vip_level || 0)}
                      size="md"
                    />
                  </div>
                  {/* Badge / entrance / other type preview */}
                  {previewItem.type !== "frame" && previewItem.image_url && (
                    <div className="flex justify-center">
                      <img loading="lazy" decoding="async" src={previewItem.image_url} alt={previewItem.name} className="w-20 h-20 object-contain" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{previewItem.name}</p>
                </div>

                <button
                  onClick={() => { buyAdminItem(previewItem); setPreviewItem(null); }}
                  className="w-full py-2.5 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova flex items-center justify-center gap-2"
                >
                  <CurrencyIcon type="gold" size="xs" />
                  شراء الآن — {Number(previewItem.price_coins).toLocaleString()}
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default StorePage;
