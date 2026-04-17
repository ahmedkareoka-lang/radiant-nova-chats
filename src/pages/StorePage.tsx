import { useState, useEffect } from "react";
import { ArrowLeft, ShoppingBag, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";
import { FRAME_MAP, FRAME_ANIMATION } from "@/lib/frameConfig";
import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import lionFrame from "@/assets/lion-frame.png";
import bossFrame from "@/assets/boss-frame.png";
import frameFire from "@/assets/frame-fire.png";
import frameIce from "@/assets/frame-ice.png";
import frameRainbow from "@/assets/frame-rainbow.png";
import frameDragon from "@/assets/frame-dragon.png";

const STORE_FRAMES = [
  {
    id: "frame-purple-wings",
    name: "إطار الأجنحة البنفسجية",
    type: "frame",
    price_coins: 25000,
    image: framePurpleWings,
    data: { rarity: "legendary", frame_url: "frame-purple-wings" },
  },
  {
    id: "frame-royal-crown",
    name: "إطار التاج الملكي",
    type: "frame",
    price_coins: 50000,
    image: frameRoyalCrown,
    data: { rarity: "mythic", frame_url: "frame-royal-crown" },
  },
  {
    id: "lion-frame",
    name: "إطار الأسد",
    type: "frame",
    price_coins: 75000,
    image: lionFrame,
    data: { rarity: "mythic", frame_url: "lion-frame" },
  },
  {
    id: "boss-frame",
    name: "إطار البوس",
    type: "frame",
    price_coins: 100000,
    image: bossFrame,
    data: { rarity: "legendary", frame_url: "boss-frame" },
  },
  {
    id: "frame-fire",
    name: "إطار النار 🔥",
    type: "frame",
    price_coins: 150000,
    image: frameFire,
    data: { rarity: "mythic", frame_url: "frame-fire", animated: true },
    vipRequired: 3,
  },
  {
    id: "frame-ice",
    name: "إطار الجليد ❄️",
    type: "frame",
    price_coins: 150000,
    image: frameIce,
    data: { rarity: "mythic", frame_url: "frame-ice", animated: true },
    vipRequired: 3,
  },
  {
    id: "frame-rainbow",
    name: "إطار قوس قزح 🌈",
    type: "frame",
    price_coins: 200000,
    image: frameRainbow,
    data: { rarity: "mythic", frame_url: "frame-rainbow", animated: true },
    vipRequired: 5,
  },
  {
    id: "frame-dragon",
    name: "إطار التنين الذهبي 🐉",
    type: "frame",
    price_coins: 300000,
    image: frameDragon,
    data: { rarity: "mythic", frame_url: "frame-dragon", animated: true },
    vipRequired: 7,
  },
];

const StorePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [ownedFrames, setOwnedFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminItems, setAdminItems] = useState<any[]>([]);

  const fetchAdminItems = async () => {
    const { data } = await supabase
      .from("store_items")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setAdminItems(data || []);
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

      const { data: inv } = await supabase.from("inventory").select("item_name").eq("user_id", user.id).eq("item_type", "frame");
      setOwnedFrames((inv || []).map((i: any) => i.item_name));
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
    const vipReq = (frame as any).vipRequired;
    if (vipReq && (profile.vip_level || 0) < vipReq) {
      toast.error(`يتطلب VIP مستوى ${vipReq} أو أعلى! 👑`);
      return;
    }
    if (!profile) return;
    if (ownedFrames.includes(frame.name)) {
      toast.info("لديك هذا الإطار بالفعل!");
      return;
    }
    if (profile.coins < frame.price_coins) {
      toast.error("رصيدك غير كافٍ!");
      return;
    }

    const newCoins = profile.coins - frame.price_coins;
    // Deduct coins via secure RPC
    const { error } = await supabase.rpc("deduct_coins", { _user_id: profile.id, _amount: frame.price_coins });
    if (error) { toast.error("فشل في الشراء"); return; }
    // Update equipped frame (safe field)
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
          {pricing && (
            <div className="card-nova p-3 text-center">
              <p className="text-[10px] text-muted-foreground">الأسعار بعملة: <span className="font-bold text-primary">{pricing.currency}</span></p>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="text-xs flex items-center gap-1"><CurrencyIcon type="gold" size="xs" /> 1000 = {pricing.coin_price} {pricing.currency}</span>
                <span className="text-xs flex items-center gap-1"><CurrencyIcon type="diamond" size="xs" /> 1000 = {pricing.diamond_price} {pricing.currency}</span>
              </div>
            </div>
          )}

          <h2 className="font-bold text-sm">🖼️ الإطارات</h2>

          <div className="grid grid-cols-2 gap-3">
            {STORE_FRAMES.map((frame) => {
              const owned = ownedFrames.includes(frame.name);
              const equipped = profile?.equipped_frame === frame.data.frame_url;
              return (
                <div key={frame.id} className={`card-nova p-4 text-center space-y-2 ${equipped ? "border border-primary/50 glow-neon" : ""}`}>
                  <div className="relative w-24 h-24 mx-auto">
                    <img src={frame.image} alt={frame.name} className={`w-full h-full object-contain ${FRAME_ANIMATION[frame.id] || ""}`} />
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
                    <div className="flex items-center justify-center gap-1 text-xs text-green-400">
                      <Check className="w-3 h-3" /> مملوك {equipped && "• مفعّل"}
                    </div>
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
          </div>

          {/* NOVA P exclusive items (grouped by tier) */}
          {[1, 2, 3, 4, 5, 6].map((tier) => {
            const items = adminItems.filter((it) => it.tier_type === "nova_p" && (it.tier_required || 0) === tier);
            if (items.length === 0) return null;
            const userTier = profile?.nova_p_level || 0;
            return (
              <div key={`nova-${tier}`} className="space-y-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-purple-300">
                  👑 عناصر NOVA P{tier}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => {
                    const locked = userTier < tier;
                    return (
                      <div key={item.id} className={`card-nova p-4 text-center space-y-2 ${locked ? "opacity-60" : "border border-purple-400/40 shadow-[0_0_20px_hsl(280_90%_60%/0.3)]"}`}>
                        {item.image_url && (
                          <div className="w-24 h-24 mx-auto"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /></div>
                        )}
                        <p className="font-bold text-xs">{item.name}</p>
                        <p className="text-[9px] text-purple-300 font-bold">يتطلب NOVA P{tier}+</p>
                        <div className="flex items-center justify-center gap-1">
                          <CurrencyIcon type="gold" size="xs" />
                          <span className="text-xs font-bold text-accent">{Number(item.price_coins).toLocaleString()}</span>
                        </div>
                        {locked && <p className="text-[9px] text-destructive">🔒 مقفل</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* VIP exclusive items (grouped by tier) */}
          {[1, 2, 3, 4, 5, 6, 7].map((tier) => {
            const items = adminItems.filter((it) => it.tier_type === "vip" && (it.tier_required || 0) === tier);
            if (items.length === 0) return null;
            const userTier = profile?.vip_level || 0;
            return (
              <div key={`vip-${tier}`} className="space-y-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-amber-300">
                  💎 عناصر VIP {tier}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {items.map((item) => {
                    const locked = userTier < tier;
                    return (
                      <div key={item.id} className={`card-nova p-4 text-center space-y-2 ${locked ? "opacity-60" : "border border-amber-400/40 shadow-[0_0_20px_hsl(45_95%_55%/0.3)]"}`}>
                        {item.image_url && (
                          <div className="w-24 h-24 mx-auto"><img src={item.image_url} alt={item.name} className="w-full h-full object-contain" /></div>
                        )}
                        <p className="font-bold text-xs">{item.name}</p>
                        <p className="text-[9px] text-amber-300 font-bold">يتطلب VIP {tier}+</p>
                        <div className="flex items-center justify-center gap-1">
                          <CurrencyIcon type="gold" size="xs" />
                          <span className="text-xs font-bold text-accent">{Number(item.price_coins).toLocaleString()}</span>
                        </div>
                        {locked && <p className="text-[9px] text-destructive">🔒 مقفل</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Generic admin store items (Entrance / Badges / etc.) */}
          {adminItems.filter((it) => (it.tier_type || "none") === "none").length > 0 && (
            <>
              <h2 className="font-bold text-sm pt-2">✨ عناصر المتجر</h2>
              <div className="grid grid-cols-2 gap-3">
                {adminItems.filter((it) => (it.tier_type || "none") === "none").map((item) => (
                  <div key={item.id} className="card-nova p-4 text-center space-y-2">
                    {item.image_url && (
                      <div className="w-24 h-24 mx-auto">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <p className="font-bold text-xs">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{item.type}</p>
                    <div className="flex items-center justify-center gap-1">
                      <CurrencyIcon type="gold" size="xs" />
                      <span className="text-xs font-bold text-accent">{Number(item.price_coins).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
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
      </div>
    </PageTransition>
  );
};

export default StorePage;
