import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, X } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { motion, AnimatePresence } from "framer-motion";

interface NovaCupProps {
  roomId: string;
}

interface LeaderEntry {
  sender_id: string;
  total: number;
  display_name: string;
  avatar_url: string | null;
}

const NovaCup = ({ roomId }: NovaCupProps) => {
  const [totalGold, setTotalGold] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTotal = useCallback(async () => {
    // Get total gold spent in this room by checking gift_transactions
    // We need to match room context - we'll use messages table for room_id correlation
    // Since gift_transactions don't have room_id, we'll track via a different approach:
    // For now, sum all gifts in the room by checking room members' gift activity
    const { data } = await supabase
      .from("gift_transactions")
      .select("gold_amount")
      .order("created_at", { ascending: false });
    
    // For room-specific, we'd need room_id on gift_transactions
    // For now show global as placeholder - will be room-scoped when column exists
    const sum = data?.reduce((acc, g) => acc + Number(g.gold_amount), 0) || 0;
    setTotalGold(sum);
  }, [roomId]);

  useEffect(() => {
    fetchTotal();
    const channel = supabase
      .channel(`nova-cup-${roomId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, () => {
        fetchTotal();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, fetchTotal]);

  const fetchLeaders = useCallback(async () => {
    setLoading(true);
    let dateFilter = new Date();
    if (activeTab === "daily") dateFilter.setHours(0, 0, 0, 0);
    else if (activeTab === "weekly") dateFilter.setDate(dateFilter.getDate() - 7);
    else dateFilter.setMonth(dateFilter.getMonth() - 1);

    const { data: txns } = await supabase
      .from("gift_transactions")
      .select("sender_id, gold_amount")
      .gte("created_at", dateFilter.toISOString());

    if (!txns || txns.length === 0) { setLeaders([]); setLoading(false); return; }

    const map: Record<string, number> = {};
    txns.forEach(t => { map[t.sender_id] = (map[t.sender_id] || 0) + Number(t.gold_amount); });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 20);
    const ids = sorted.map(s => s[0]);

    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
    const pMap: Record<string, any> = {};
    profiles?.forEach(p => { pMap[p.id] = p; });

    setLeaders(sorted.map(([sid, total]) => ({
      sender_id: sid,
      total,
      display_name: pMap[sid]?.display_name || "User",
      avatar_url: pMap[sid]?.avatar_url || null,
    })));
    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    if (showLeaderboard) fetchLeaders();
  }, [showLeaderboard, activeTab, fetchLeaders]);

  const medals = ["🥇", "🥈", "🥉"];
  const tabs = [
    { key: "daily" as const, label: "يومي" },
    { key: "weekly" as const, label: "أسبوعي" },
    { key: "monthly" as const, label: "شهري" },
  ];

  return (
    <>
      {/* Cup Button */}
      <button
        onClick={() => setShowLeaderboard(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-accent/30 to-accent/10 border border-accent/40 hover:border-accent/60 transition-all animate-nova-float"
      >
        <span className="text-lg">🏆</span>
        <span className="text-[10px] font-bold text-accent flex items-center gap-0.5">
          <CurrencyIcon type="gold" size="xs" />
          {totalGold.toLocaleString()}
        </span>
      </button>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end justify-center" onClick={() => setShowLeaderboard(false)}>
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              className="w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-t-3xl border-t border-border p-4 pb-8 max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm glow-neon-text flex items-center gap-2">🏆 كأس نوفا</h3>
                <button onClick={() => setShowLeaderboard(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeTab === t.key ? "gradient-gold text-accent-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-auto space-y-2">
                {loading ? (
                  <p className="text-center text-xs text-muted-foreground py-4">جارٍ التحميل...</p>
                ) : leaders.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">لا توجد بيانات بعد</p>
                ) : (
                  leaders.map((l, i) => (
                    <div key={l.sender_id} className={`flex items-center gap-3 p-2.5 rounded-xl ${i < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' : 'bg-secondary/50'}`}>
                      <span className="text-sm font-bold w-6 text-center">{i < 3 ? medals[i] : i + 1}</span>
                      <img src={l.avatar_url || "https://i.pravatar.cc/100"} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <span className="flex-1 text-xs font-bold truncate">{l.display_name}</span>
                      <span className="text-xs font-bold text-accent flex items-center gap-0.5">
                        <CurrencyIcon type="gold" size="xs" />{l.total.toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NovaCup;
