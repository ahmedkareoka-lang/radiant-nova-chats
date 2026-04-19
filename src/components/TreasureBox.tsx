import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TreasureBoxProps {
  roomId: string | null;
  isHost: boolean;
  currentUserId: string | null;
}

const DAILY_THRESHOLD = 300_000;
const WINNERS_COUNT = 7;
const REWARD_PER_WINNER = 5_000; // gold coins

/**
 * Watches the room's daily gift gold totals.
 * When it reaches 300,000, the host's client picks 7 random current members,
 * awards each REWARD_PER_WINNER gold coins (added to their inventory as a "treasure" item),
 * and broadcasts a banner to everyone in the room.
 */
const TreasureBox = ({ roomId, isHost, currentUserId }: TreasureBoxProps) => {
  const [banner, setBanner] = useState<{ winners: string[]; reward: number } | null>(null);
  const triggeredToday = useRef(false);
  const dailyTotal = useRef(0);

  // Listen to broadcast banner (everyone in room)
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`treasure-${roomId}`)
      .on("broadcast", { event: "treasure-drop" }, (payload) => {
        const data = payload.payload as { winners: string[]; reward: number };
        setBanner(data);
        setTimeout(() => setBanner(null), 8000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Host computes daily gift total and may trigger the drop
  useEffect(() => {
    if (!roomId || !isHost || !currentUserId) return;

    const computeDailyTotal = async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      // We don't have a room_id on gift_transactions, so we fetch members and sum gifts received by them today.
      const { data: members } = await supabase
        .from("room_members")
        .select("user_id")
        .eq("room_id", roomId);
      const memberIds = members?.map((m) => m.user_id) || [];
      if (memberIds.length === 0) return;
      const { data: gifts } = await supabase
        .from("gift_transactions")
        .select("gold_amount")
        .in("receiver_id", memberIds)
        .gte("created_at", startOfDay.toISOString());
      const total = (gifts || []).reduce((s, g) => s + Number(g.gold_amount || 0), 0);
      dailyTotal.current = total;

      if (total >= DAILY_THRESHOLD && !triggeredToday.current) {
        triggeredToday.current = true;
        await triggerDrop(memberIds);
      }
    };

    const triggerDrop = async (memberIds: string[]) => {
      // pick 7 random unique winners
      const pool = [...memberIds];
      const winners: string[] = [];
      for (let i = 0; i < WINNERS_COUNT && pool.length > 0; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }
      // Insert treasure rewards into each winner's inventory
      const rows = winners.map((uid) => ({
        user_id: uid,
        item_type: "gift" as const,
        item_name: "🎁 صندوق الكنز",
        item_data: { reward_gold: REWARD_PER_WINNER, source: "daily_treasure", room_id: roomId },
      }));
      await supabase.from("inventory").insert(rows);
      // Fetch winner names for the banner
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", winners);
      const names = (profs || []).map((p) => p.display_name);
      // Broadcast to all room members
      await supabase.channel(`treasure-${roomId}`)
        .send({ type: "broadcast", event: "treasure-drop", payload: { winners: names, reward: REWARD_PER_WINNER } });
    };

    // Reset daily flag at midnight by checking date
    const today = new Date().toDateString();
    if ((window as any).__treasureDay !== today) {
      (window as any).__treasureDay = today;
      triggeredToday.current = false;
    }

    computeDailyTotal();
    const interval = setInterval(computeDailyTotal, 30_000);
    return () => clearInterval(interval);
  }, [roomId, isHost, currentUserId]);

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ y: -80, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-[9999] pointer-events-none px-4"
        >
          <div className="mx-auto max-w-lg rounded-2xl p-4 pointer-events-auto"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 30% / 0.95), hsl(35 95% 45% / 0.95), hsl(15 90% 35% / 0.95))",
              border: "2px solid hsl(45 95% 60%)",
              boxShadow: "0 0 40px hsl(45 95% 55% / 0.7)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <motion.span
                animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-4xl"
              >🎁</motion.span>
              <div className="flex-1">
                <p className="font-black text-sm text-white">🌟 صندوق الكنز انفتح!</p>
                <p className="text-[11px] text-white/80">7 فائزين حصلوا على {banner.reward.toLocaleString()} كوينز</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {banner.winners.map((name, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/30 text-yellow-200 border border-yellow-300/40">
                  🏆 {name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TreasureBox;
