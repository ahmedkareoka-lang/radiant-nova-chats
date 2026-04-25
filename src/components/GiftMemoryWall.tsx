import { motion } from "framer-motion";
import { Gift, ArrowLeft, ArrowRight } from "lucide-react";
import CurrencyIcon from "@/components/CurrencyIcon";
import { useGiftMemories } from "@/hooks/useGiftMemories";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Props {
  myId: string | null;
  partnerId: string | null;
  partnerName?: string | null;
}

/**
 * Memory wall — timeline of gifts exchanged between two users.
 * Shows totals + a scrollable list with directional arrows.
 */
const GiftMemoryWall = ({ myId, partnerId, partnerName }: Props) => {
  const { memories, totalGold, loading } = useGiftMemories(myId, partnerId, 30);

  if (loading) {
    return (
      <div className="rounded-2xl p-6 text-center border border-border/30 bg-background/30">
        <div className="text-sm text-muted-foreground">جارٍ تحميل الذكريات...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 border border-pink-400/20 bg-background/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-foreground flex items-center gap-2">
          <Gift className="w-4 h-4 text-pink-400" />
          جدار الذكريات
        </h3>
        <div className="flex items-center gap-1 text-xs font-bold text-yellow-300">
          {totalGold.toLocaleString()} <CurrencyIcon type="gold" size="xs" />
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-3xl mb-2">🎁</div>
          <p className="text-xs text-muted-foreground">
            لم تتبادلا أي هدايا بعد. أرسل هدية لشريكك في أي غرفة لتبدأ الذكريات.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {memories.map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, x: g.direction === "sent" ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 p-2 rounded-xl ${
                g.direction === "sent"
                  ? "bg-pink-500/10 border border-pink-400/20"
                  : "bg-purple-500/10 border border-purple-400/20"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                g.direction === "sent" ? "bg-pink-500/30" : "bg-purple-500/30"
              }`}>
                {g.direction === "sent" ? <ArrowRight className="w-4 h-4 text-pink-300" /> : <ArrowLeft className="w-4 h-4 text-purple-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">
                  {g.direction === "sent" ? `أرسلت ${g.gift_name}` : `${partnerName ?? "شريكك"} أهداك ${g.gift_name}`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: ar })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-yellow-300">
                {g.gold_amount.toLocaleString()} <CurrencyIcon type="gold" size="xs" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GiftMemoryWall;
