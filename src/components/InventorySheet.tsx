import { useEffect, useMemo, useState } from "react";
import { X, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FRAME_MAP } from "@/lib/frameConfig";
import EquippedBadge from "./EquippedBadge";
import BDFrame from "./BDFrame";
import RechargeAgentFrame from "./RechargeAgentFrame";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TABS = [
  { id: "all", label: "الكل" },
  { id: "frame", label: "إطارات" },
  { id: "badge", label: "شارات" },
  { id: "gift", label: "هدايا" },
  { id: "vip", label: "VIP" },
  { id: "special", label: "مميزات" },
];

export default function InventorySheet({ open, onClose }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [userId, setUserId] = useState<string>("");
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);
  const [isBD, setIsBD] = useState(false);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (cancelled) return;
      setUserId(user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("equipped_frame, equipped_badge, is_bd")
        .eq("id", user.id)
        .single();
      setEquippedFrame(prof?.equipped_frame || null);
      setEquippedBadge((prof as any)?.equipped_badge || null);
      setIsBD(!!(prof as any)?.is_bd);

      const { data: agentRow } = await supabase
        .from("recharge_agents" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      setIsAgent(!!agentRow);

      const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user.id)
        .order("acquired_at", { ascending: false });
      if (!cancelled) {
        setItems(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const allItems = useMemo(() => {
    const virtuals: any[] = [];
    if (isBD) {
      virtuals.push({
        id: "virtual-frame-bd",
        item_type: "frame",
        item_name: "BD",
        item_data: { virtual: "bd" },
      });
    }
    if (isAgent) {
      virtuals.push({
        id: "virtual-frame-agent",
        item_type: "frame",
        item_name: "وكيل الشحن",
        item_data: { virtual: "agent" },
      });
    }
    return [...virtuals, ...items];
  }, [items, isBD, isAgent]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return allItems;
    return allItems.filter((it) => it.item_type === activeTab);
  }, [allItems, activeTab]);

  const equipFrame = async (frameUrl: string | null) => {
    await supabase.from("profiles").update({ equipped_frame: frameUrl }).eq("id", userId);
    setEquippedFrame(frameUrl);
    toast.success(frameUrl ? "تم تفعيل الإطار! 🖼️" : "تم إزالة الإطار");
  };

  const equipBadge = async (name: string | null) => {
    await supabase.from("profiles").update({ equipped_badge: name } as any).eq("id", userId);
    setEquippedBadge(name);
    toast.success(name ? "تم تفعيل الشارة! 🏅" : "تم إزالة الشارة");
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: allItems.length };
    for (const it of allItems) c[it.item_type] = (c[it.item_type] || 0) + 1;
    return c;
  }, [allItems]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] bg-background/80 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
          dir="rtl"
        >
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-3xl bg-gradient-to-b from-[#1a1230] via-[#0f0a1f] to-[#0a0816] border-t border-purple-500/20 p-4 pb-8"
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-base bg-gradient-to-r from-fuchsia-200 to-purple-200 bg-clip-text text-transparent">
                  الحقيبة
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-thin">
              {TABS.map((t) => {
                const isActive = activeTab === t.id;
                const c = counts[t.id] || 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_hsl(280_85%_55%/0.6)]"
                        : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{t.label}</span>
                    {c > 0 && (
                      <span className={`text-[9px] px-1.5 py-px rounded-full ${isActive ? "bg-white/25" : "bg-foreground/10"}`}>
                        {c}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">جارٍ التحميل…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-2 opacity-40">🎒</div>
                <p className="text-sm text-muted-foreground">لا يوجد عناصر في هذه الخانة</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filtered.map((it) => {
                  const isFrame = it.item_type === "frame";
                  const isBadge = it.item_type === "badge";
                  const virtual = it.item_data?.virtual as string | undefined;
                  const frameUrl = it.item_data?.frame_url || FRAME_MAP[it.item_name as keyof typeof FRAME_MAP];

                  // Equipped check
                  const equipped =
                    (isFrame && (
                      (virtual === "bd" && equippedFrame === "BD_FRAME") ||
                      (virtual === "agent" && equippedFrame === "AGENT_FRAME") ||
                      (!virtual && equippedFrame === frameUrl)
                    )) ||
                    (isBadge && equippedBadge === it.item_name);

                  return (
                    <div
                      key={it.id}
                      className={`relative aspect-square rounded-2xl border p-2 flex flex-col items-center justify-center gap-1 transition-all ${
                        equipped
                          ? "bg-gradient-to-br from-fuchsia-500/20 to-purple-600/20 border-fuchsia-400/60 shadow-[0_0_18px_-4px_hsl(280_85%_55%/0.6)]"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {/* Preview */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden">
                        {isFrame && virtual === "bd" ? (
                          <BDFrame size={48}><div className="w-full h-full rounded-full bg-purple-500/40" /></BDFrame>
                        ) : isFrame && virtual === "agent" ? (
                          <RechargeAgentFrame size={48}><div className="w-full h-full rounded-full bg-amber-500/40" /></RechargeAgentFrame>
                        ) : isFrame && frameUrl ? (
                          <img src={frameUrl} alt={it.item_name} className="w-full h-full object-contain" loading="lazy" />
                        ) : isBadge ? (
                          <EquippedBadge badgeName={it.item_name} />
                        ) : it.item_data?.image_url ? (
                          <img src={it.item_data.image_url} alt={it.item_name} className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-3xl">
                            {it.item_type === "gift" ? "🎁" : it.item_type === "vip" ? "👑" : "✨"}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-center truncate w-full">{it.item_name}</p>

                      {/* Equip controls */}
                      {(isFrame || isBadge) && (
                        <button
                          onClick={() => {
                            if (isFrame) {
                              if (equipped) equipFrame(null);
                              else if (virtual === "bd") equipFrame("BD_FRAME");
                              else if (virtual === "agent") equipFrame("AGENT_FRAME");
                              else equipFrame(frameUrl || null);
                            } else if (isBadge) {
                              if (equipped) equipBadge(null);
                              else equipBadge(it.item_name);
                            }
                          }}
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-all ${
                            equipped
                              ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/40"
                              : "bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-400/40"
                          }`}
                        >
                          {equipped ? "✓ مرتدى" : "ارتداء"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
