import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { FRAME_MAP, FRAME_ANIMATION } from "@/lib/frameConfig";
import EquippedBadge from "@/components/EquippedBadge";

const InventoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [profilePreview, setProfilePreview] = useState<{ displayName: string; avatarUrl: string | null }>({ displayName: "أنت", avatarUrl: null });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url, equipped_frame, equipped_badge").eq("id", user.id).single();
      setEquippedFrame(prof?.equipped_frame || null);
      setEquippedBadge((prof as any)?.equipped_badge || null);
      setProfilePreview({ displayName: prof?.display_name || "أنت", avatarUrl: prof?.avatar_url || null });
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

  const equipBadge = async (badgeName: string | null) => {
    await supabase.from("profiles").update({ equipped_badge: badgeName } as any).eq("id", userId);
    setEquippedBadge(badgeName);
    toast.success(badgeName ? "تم تفعيل الشارة! 🏅" : "تم إزالة الشارة");
  };

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "frame", label: "إطارات" },
    { id: "badge", label: "شارات" },
    { id: "gift", label: "هدايا" },
    { id: "vip", label: "VIP" },
    { id: "special", label: "مميزات" },
  ];

  const filtered = activeTab === "all" ? items : items.filter((i) => i.item_type === activeTab);
  const badgeItems = useMemo(() => items.filter((i) => i.item_type === "badge"), [items]);

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
          {(activeTab === "all" || activeTab === "badge") && badgeItems.length > 0 && (
            <section className="card-nova p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-sm">معاينة الشارة على البروفايل</h2>
                  <p className="text-[10px] text-muted-foreground">اختَر أي شارة من الأسفل لتظهر فورًا هنا قبل التجهيز</p>
                </div>
                <div className="text-[10px] text-muted-foreground">الشارات: {badgeItems.length}</div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={profilePreview.avatarUrl || "/placeholder.svg"}
                    alt={profilePreview.displayName}
                    className="w-14 h-14 rounded-full object-cover border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm truncate">{profilePreview.displayName}</p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <EquippedBadge badgeName={equippedBadge} size="md" />
                      {!equippedBadge && <span className="text-[10px] text-muted-foreground">لا توجد شارة مجهزة</span>}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

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
                const isBadge = item.item_type === "badge";
                const frameKey = item.item_data?.frame_url || item.item_data?.image_url || null;
                const frameImg = item.item_data?.frame_url
                  ? FRAME_MAP[item.item_data.frame_url] || item.item_data?.image_url || item.item_data?.frame_url
                  : item.item_data?.image_url || null;
                const isFrameEquipped = isFrame && equippedFrame === frameKey;
                const isBadgeEquipped = isBadge && equippedBadge === item.item_name;
                const highlighted = isFrameEquipped || isBadgeEquipped;

                return (
                  <div key={item.id} className={`card-nova p-3 text-center ${highlighted ? "border border-primary/50" : ""}`}>
                     {frameImg ? (
                      <img src={frameImg} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" />
                     ) : isBadge && item.item_data?.image_url ? (
                       <img src={item.item_data.image_url} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" />
                    ) : (
                      <span className="text-3xl">{item.item_type === "gift" ? "🎁" : item.item_type === "vip" ? "👑" : isBadge ? "🏅" : "✨"}</span>
                    )}
                    <p className="font-bold text-[11px] mt-1 line-clamp-1">{item.item_name}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(item.acquired_at).toLocaleDateString("ar")}
                    </p>
                    {isFrame && frameKey && (
                      <button
                        onClick={() => equipFrame(isFrameEquipped ? null : frameKey)}
                        className={`mt-1 w-full py-1 rounded-lg text-[10px] font-bold ${
                          isFrameEquipped ? "bg-destructive/20 text-destructive" : "gradient-neon text-primary-foreground"
                        }`}
                      >
                        {isFrameEquipped ? "إزالة" : "ارتداء"}
                      </button>
                    )}
                    {isBadge && (
                      <button
                        onClick={() => equipBadge(isBadgeEquipped ? null : item.item_name)}
                        className={`mt-1 w-full py-1 rounded-lg text-[10px] font-bold ${
                          isBadgeEquipped ? "bg-destructive/20 text-destructive" : "gradient-gold text-accent-foreground"
                        }`}
                      >
                        {isBadgeEquipped ? "إزالة" : "ارتداء"}
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
