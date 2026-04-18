import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface SenderEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
}

interface Top3RoomSendersProps {
  roomId: string;
  hostId: string;
}

// Renders the top 3 gift senders for the current host within the last 24 hours.
// Yalla / Soulmatch style gold podium chip that floats above mic seats.
export default function Top3RoomSenders({ roomId, hostId }: Top3RoomSendersProps) {
  const [top, setTop] = useState<SenderEntry[]>([]);

  const fetchTop = async () => {
    if (!hostId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: txs } = await supabase
      .from("gift_transactions")
      .select("sender_id, gold_amount")
      .eq("receiver_id", hostId)
      .gte("created_at", since)
      .limit(500);

    const totals: Record<string, number> = {};
    txs?.forEach((t: any) => {
      totals[t.sender_id] = (totals[t.sender_id] || 0) + Number(t.gold_amount || 0);
    });
    const ids = Object.keys(totals);
    if (ids.length === 0) {
      setTop([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", ids);
    const list = (profs || [])
      .map((p: any) => ({ ...p, total: totals[p.id] || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    setTop(list);
  };

  useEffect(() => {
    fetchTop();
    // Refresh whenever a new gift comes into this room
    const ch = supabase
      .channel(`top3-room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions", filter: `receiver_id=eq.${hostId}` }, () => fetchTop())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, hostId]);

  if (top.length === 0) return null;

  const colors = [
    "from-amber-400 to-yellow-600",
    "from-slate-300 to-slate-500",
    "from-orange-400 to-orange-700",
  ];
  const ranks = ["🥇", "🥈", "🥉"];

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-md border border-accent/30"
    >
      <span className="text-[9px] font-black text-accent">TOP</span>
      {top.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1">
          <div className="relative">
            <div className={`w-6 h-6 rounded-full overflow-hidden ring-1 ring-offset-1 ring-offset-background bg-gradient-to-br ${colors[i]}`}>
              <img src={s.avatar_url || "https://i.pravatar.cc/40"} alt="" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -top-1 -right-1 text-[10px]">{ranks[i]}</span>
          </div>
          <span className={`text-[9px] font-black bg-gradient-to-r ${colors[i]} bg-clip-text text-transparent`}>
            {s.total >= 1000 ? `${(s.total / 1000).toFixed(1)}K` : s.total.toLocaleString()}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
