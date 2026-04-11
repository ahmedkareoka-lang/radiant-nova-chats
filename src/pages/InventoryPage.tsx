import { useState, useEffect } from "react";
import { ArrowLeft, Package, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import lionFrame from "@/assets/lion-frame.png";
import bossFrame from "@/assets/boss-frame.png";

const FRAME_MAP: Record<string, string> = {
  "frame-purple-wings": framePurpleWings,
  "frame-royal-crown": frameRoyalCrown,
  "lion-frame": lionFrame,
  "boss-frame": bossFrame,
};

const InventoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("equipped_frame").eq("id", user.id).single();
      setEquippedFrame(prof?.equipped_frame || null);
      const { data } = await supabase.from("inventory").select("*").eq("user_id", user.id).order("acquired_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const equipFrame = async (frameUrl: string | null) => {
    await supabase.from("profiles").update({ equipped_frame: frameUrl }).eq("id", userId);
    setEquippedFrame(frameUrl);
    toast.success(frameUrl ? "تم تفعيل الإطار! 🖼️" : "تم إزالة الإطار");
  };

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "frame", label: "إطارات" },
    { id: "gift", label: "هدايا" },
    { id: "vip", label: "VIP" },
    { id: "special", label: "مميزات" },
  ];

  const filtered = activeTab === "all" ? items : items.filter((i) => i.item_type === activeTab);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
            <Package className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">الحقيبة</h1>
            <span className="ml-auto text-xs text-muted-foreground">{items.length} عنصر</span>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">الحقيبة فارغة</p>
              <button onClick={() => navigate("/store")} className="mt-3 text-primary font-bold text-sm">
                تسوّق الآن →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((item) => {
                const isFrame = item.item_type === "frame";
                const frameKey = item.item_data?.frame_url;
                const frameImg = frameKey ? FRAME_MAP[frameKey] : null;
                const isEquipped = isFrame && equippedFrame === frameKey;

                return (
                  <div key={item.id} className={`card-nova p-3 text-center ${isEquipped ? "border border-primary/50" : ""}`}>
                    {frameImg ? (
                      <img src={frameImg} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" />
                    ) : (
                      <span className="text-3xl">{item.item_type === "gift" ? "🎁" : item.item_type === "vip" ? "👑" : "✨"}</span>
                    )}
                    <p className="font-bold text-[11px] mt-1">{item.item_name}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(item.acquired_at).toLocaleDateString("ar")}
                    </p>
                    {isFrame && frameKey && (
                      <button
                        onClick={() => equipFrame(isEquipped ? null : frameKey)}
                        className={`mt-1 w-full py-1 rounded-lg text-[10px] font-bold ${
                          isEquipped ? "bg-destructive/20 text-destructive" : "gradient-neon text-primary-foreground"
                        }`}
                      >
                        {isEquipped ? "إزالة" : "ارتداء"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default InventoryPage;
