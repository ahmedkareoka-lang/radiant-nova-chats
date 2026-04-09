import { useState, useEffect } from "react";
import { ArrowLeft, Package, Frame, Gift, Crown, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

const InventoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("inventory").select("*").eq("user_id", user.id).order("acquired_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "frame", label: "إطارات" },
    { id: "gift", label: "هدايا" },
    { id: "vip", label: "VIP" },
    { id: "special", label: "مميزات" },
  ];

  const filtered = activeTab === "all" ? items : items.filter((i) => i.item_type === activeTab);

  const getIcon = (type: string) => {
    switch (type) {
      case "frame": return "🖼️";
      case "gift": return "🎁";
      case "vip": return "👑";
      default: return "✨";
    }
  };

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
              {filtered.map((item) => (
                <div key={item.id} className="card-nova p-3 text-center">
                  <span className="text-3xl">{getIcon(item.item_type)}</span>
                  <p className="font-bold text-[11px] mt-1">{item.item_name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(item.acquired_at).toLocaleDateString("ar")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default InventoryPage;
