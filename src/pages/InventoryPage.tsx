import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import { FRAME_MAP, FRAME_ANIMATION, REMOVED_FRAME_KEYS } from "@/lib/frameConfig";
import EquippedBadge from "@/components/EquippedBadge";
import BDFrame from "@/components/BDFrame";
import RechargeAgentFrame from "@/components/RechargeAgentFrame";
import VipFrame from "@/components/VipFrame";
import VipBadge from "@/components/VipBadge";

const InventoryPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [isBD, setIsBD] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [profilePreview, setProfilePreview] = useState<{ displayName: string; avatarUrl: string | null }>({ displayName: "أنت", avatarUrl: null });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url, equipped_frame, equipped_badge, is_bd").eq("id", user.id).single();
      setEquippedFrame(prof?.equipped_frame || null);
      setEquippedBadge((prof as any)?.equipped_badge || null);
      setIsBD(!!(prof as any)?.is_bd);
      setProfilePreview({ displayName: prof?.display_name || "أنت", avatarUrl: prof?.avatar_url || null });

      // Check active recharge agent status
      const { data: agentRow } = await supabase
        .from("recharge_agents" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      setIsAgent(!!agentRow);

      const { data } = await supabase.from("inventory").select("*").eq("user_id", user.id).order("acquired_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const equipFrame = async (frameUrl: string | null) => {
    await supabase.from("profiles").update({ equipped_frame: frameUrl }).eq("id", userId);
    setEquippedFrame(frameUrl);
    toast.success(frameUrl ? "✨ Style Updated — تم تفعيل الإطار" : "تم إزالة الإطار");
  };

  const equipBadge = async (badgeName: string | null) => {
    await supabase.from("profiles").update({ equipped_badge: badgeName } as any).eq("id", userId);
    setEquippedBadge(badgeName);
    toast.success(badgeName ? "✨ Style Updated — تم تفعيل الشارة" : "تم إزالة الشارة");
  };

  const tabs = [
    { id: "all", label: "الكل" },
    { id: "frame", label: "إطارات" },
    { id: "badge", label: "شارات" },
    { id: "gift", label: "هدايا" },
    { id: "vip", label: "VIP" },
    { id: "special", label: "مميزات" },
  ];

  // Inject role-based virtual frames (BD / Recharge Agent) so they appear
  // in the bag and the user can choose to wear them or any other frame.
  const allItems = useMemo(() => {
    const virtuals: any[] = [];
    if (isBD) {
      virtuals.push({
        id: "virtual-frame-bd",
        item_type: "frame",
        item_name: "إطار BD",
        acquired_at: new Date().toISOString(),
        item_data: { frame_url: "frame-bd", special: "bd" },
      });
    }
    if (isAgent) {
      virtuals.push({
        id: "virtual-frame-recharge-agent",
        item_type: "frame",
        item_name: "إطار وكيل شحن",
        acquired_at: new Date().toISOString(),
        item_data: { frame_url: "frame-recharge-agent", special: "agent" },
      });
    }
    // Hide retired legendary/mythic frames so they no longer appear in the bag
    const cleaned = items.filter((i) => {
      if (i.item_type !== "frame") return true;
      const key = i.item_data?.frame_url;
      return !key || !REMOVED_FRAME_KEYS.has(key);
    });
    return [...virtuals, ...cleaned];
  }, [items, isBD, isAgent]);

  const filtered = activeTab === "all" ? allItems : allItems.filter((i) => i.item_type === activeTab);
  const badgeItems = useMemo(() => allItems.filter((i) => i.item_type === "badge"), [allItems]);

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
                  <img loading="lazy" decoding="async" src={profilePreview.avatarUrl || "/placeholder.svg"}
                    alt={profilePreview.displayName}
                    className="w-14 h-14 rounded-full object-cover border border-border" />
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
                const special = item.item_data?.special as "bd" | "agent" | undefined;
                const frameKey = item.item_data?.frame_url || item.item_data?.image_url || null;
                const frameImg = !special && item.item_data?.frame_url
                  ? FRAME_MAP[item.item_data.frame_url] || item.item_data?.image_url || item.item_data?.frame_url
                  : item.item_data?.image_url || null;
                const isFrameEquipped = isFrame && equippedFrame === frameKey;
                const isBadgeEquipped = isBadge && equippedBadge === item.item_name;
                const highlighted = isFrameEquipped || isBadgeEquipped;

                return (
                  <div key={item.id} className={`card-nova p-3 text-center ${highlighted ? "border border-primary/50" : ""}`}>
                    {special === "bd" ? (
                      <div className="w-16 h-16 mx-auto">
                        <BDFrame size={64}>
                          <img src={profilePreview.avatarUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        </BDFrame>
                      </div>
                    ) : special === "agent" ? (
                      <div className="w-16 h-16 mx-auto">
                        <RechargeAgentFrame size={64}>
                          <img src={profilePreview.avatarUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        </RechargeAgentFrame>
                      </div>
                    ) : special === "vip" && item.item_data?.vip_level ? (
                      <div className="w-20 h-20 mx-auto">
                        <VipFrame level={item.item_data.vip_level} size={56} reducedMotion>
                          <img src={profilePreview.avatarUrl || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                        </VipFrame>
                      </div>
                    ) : item.item_type === "vip" && item.item_data?.vip_level ? (
                      <div className="w-16 h-16 mx-auto flex items-center justify-center">
                        <VipBadge level={item.item_data.vip_level} size="md" />
                      </div>
                    ) : frameImg ? (
                      <img src={frameImg} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" loading="lazy" decoding="async" />
                    ) : isBadge && item.item_data?.image_url ? (
                      <img src={item.item_data.image_url} alt={item.item_name} className="w-16 h-16 mx-auto object-contain" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-3xl">{item.item_type === "gift" ? "🎁" : item.item_type === "vip" ? "👑" : isBadge ? "🏅" : "✨"}</span>
                    )}
                    <p className="font-bold text-[11px] mt-1 line-clamp-1">{item.item_name}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {special ? "إطار خاص" : new Date(item.acquired_at).toLocaleDateString("ar")}
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
