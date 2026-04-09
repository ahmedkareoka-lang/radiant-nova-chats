import { useState, useEffect } from "react";
import { ArrowLeft, Coins, Diamond, ShoppingBag, Crown, Sparkles, Frame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";

const StorePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("frames");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(p);

      // Get pricing for user's country
      const countryCode = p?.country_code || "US";
      const { data: pr } = await supabase.from("pricing_plans").select("*").eq("country_code", countryCode).single();
      setPricing(pr || { currency: "USD", coin_price: 1, diamond_price: 2 });

      const { data: items } = await supabase.from("store_items").select("*").eq("is_active", true);
      setStoreItems(items || []);
      setLoading(false);
    };
    load();
  }, []);

  const buyItem = async (item: any) => {
    if (!profile) return;
    const cost = item.price_coins;
    if (profile.coins < cost) {
      toast.error("رصيدك غير كافٍ!");
      return;
    }

    const newCoins = profile.coins - cost;
    await supabase.from("profiles").update({ coins: newCoins }).eq("id", profile.id);
    await supabase.from("inventory").insert({
      user_id: profile.id,
      item_type: item.type,
      item_name: item.name,
      item_data: item.data || {},
    });
    await supabase.from("notifications").insert({
      user_id: profile.id,
      title: "عملية شراء",
      message: `تم شراء ${item.name} بنجاح!`,
      type: "purchase",
    });
    setProfile({ ...profile, coins: newCoins });
    toast.success(`تم شراء ${item.name}! 🎉`);
  };

  const tabs = [
    { id: "frames", label: "إطارات", icon: "🖼️" },
    { id: "gifts", label: "هدايا", icon: "🎁" },
    { id: "vip", label: "VIP", icon: "👑" },
    { id: "special", label: "مميزات", icon: "✨" },
  ];

  const defaultItems = [
    { id: "f1", name: "إطار ذهبي", type: "frame", price_coins: 5000, image_url: "🖼️", data: { rarity: "gold" } },
    { id: "f2", name: "إطار ماسي", type: "frame", price_coins: 15000, image_url: "💎", data: { rarity: "diamond" } },
    { id: "f3", name: "إطار ملكي", type: "frame", price_coins: 50000, image_url: "👑", data: { rarity: "royal" } },
    { id: "g1", name: "وردة", type: "gift", price_coins: 100, image_url: "🌹", data: {} },
    { id: "g2", name: "سيارة فاخرة", type: "gift", price_coins: 10000, image_url: "🏎️", data: {} },
    { id: "g3", name: "قصر", type: "gift", price_coins: 100000, image_url: "🏰", data: {} },
    { id: "v1", name: "VIP 1 شهر", type: "vip", price_coins: 20000, image_url: "⭐", data: { vip_level: 1, duration: 30 } },
    { id: "v2", name: "VIP 3 شهور", type: "vip", price_coins: 50000, image_url: "🌟", data: { vip_level: 3, duration: 90 } },
    { id: "s1", name: "دخول سينمائي", type: "special", price_coins: 30000, image_url: "🎬", data: {} },
    { id: "s2", name: "اسم متوهج", type: "special", price_coins: 8000, image_url: "✨", data: {} },
  ];

  const items = storeItems.length > 0 ? storeItems : defaultItems;
  const filtered = items.filter((item) => {
    if (activeTab === "frames") return item.type === "frame";
    if (activeTab === "gifts") return item.type === "gift";
    if (activeTab === "vip") return item.type === "vip";
    return item.type === "special";
  });

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
                <Coins className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">{(profile?.coins || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
                <Diamond className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">{(profile?.diamonds || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          {/* Pricing info */}
          {pricing && (
            <div className="card-nova p-3 text-center">
              <p className="text-[10px] text-muted-foreground">الأسعار بعملة: <span className="font-bold text-primary">{pricing.currency}</span></p>
              <div className="flex items-center justify-center gap-4 mt-1">
                <span className="text-xs"><Coins className="w-3 h-3 inline text-accent" /> 1000 = {pricing.coin_price} {pricing.currency}</span>
                <span className="text-xs"><Diamond className="w-3 h-3 inline text-primary" /> 1000 = {pricing.diamond_price} {pricing.currency}</span>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all ${
                  activeTab === tab.id ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary text-muted-foreground"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="card-nova p-4 text-center space-y-2">
                <span className="text-4xl">{item.image_url}</span>
                <p className="font-bold text-sm">{item.name}</p>
                <div className="flex items-center justify-center gap-1">
                  <Coins className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold text-accent">{item.price_coins.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => buyItem(item)}
                  className="w-full py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-bold btn-nova"
                >
                  شراء
                </button>
              </div>
            ))}
          </div>

          {/* Top up link */}
          <button
            onClick={() => navigate("/top-up")}
            className="w-full py-3 rounded-full border border-accent/50 text-accent font-bold text-sm btn-nova"
          >
            <Coins className="w-4 h-4 inline mr-1" /> شحن رصيد
          </button>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default StorePage;
