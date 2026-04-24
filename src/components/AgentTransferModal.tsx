import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins as CoinsIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName?: string;
};

/**
 * Modal that lets an active recharge agent transfer coins to a specific user.
 * Calls the secure RPC `agent_transfer_coins` which enforces the agent role server-side.
 */
const AgentTransferModal = ({ open, onClose, recipientId, recipientName }: Props) => {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [myCoins, setMyCoins] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("profiles").select("coins").eq("id", auth.user.id).single();
      setMyCoins(Number(data?.coins || 0));
    })();
  }, [open]);

  const submit = async () => {
    const n = parseInt(amount, 10);
    if (!n || n <= 0) { toast.error("أدخل مبلغًا صحيحًا"); return; }
    if (n > myCoins) { toast.error("رصيدك غير كافٍ"); return; }
    setLoading(true);
    const { error } = await supabase.rpc("agent_transfer_coins" as any, {
      _recipient_id: recipientId,
      _amount: n,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "فشل التحويل");
      return;
    }
    toast.success(`تم إرسال ${n.toLocaleString()} كوينز ✅`);
    setMyCoins((c) => c - n);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-5 border-2 border-yellow-200/40
              bg-gradient-to-br from-red-900/80 via-background to-orange-900/60
              shadow-[0_0_40px_hsl(0_85%_55%/0.5)]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <CoinsIcon className="w-5 h-5 text-yellow-300" />
                شحن عملات
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-background/30 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              إلى: <span className="font-bold text-foreground">{recipientName || "المستخدم"}</span>
            </p>

            <div className="rounded-2xl bg-background/40 border border-border/30 p-3 mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">رصيدك</span>
              <span className="font-black text-yellow-300">{myCoins.toLocaleString()} 🪙</span>
            </div>

            <label className="block text-xs font-bold mb-1 text-foreground">المبلغ</label>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 10000"
              className="w-full rounded-xl bg-background/60 border border-border/40 px-3 py-2.5 text-foreground font-bold focus:outline-none focus:border-yellow-300/60"
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full bg-secondary/50 text-foreground font-bold text-sm border border-border/30"
              >
                إلغاء
              </button>
              <button
                onClick={submit}
                disabled={loading || !amount}
                className="flex-1 py-2.5 rounded-full font-black text-sm flex items-center justify-center gap-1.5 text-white
                  bg-gradient-to-r from-red-600 via-red-500 to-orange-500
                  shadow-[0_0_14px_hsl(0_85%_55%/0.7)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CoinsIcon className="w-4 h-4" /> تحويل</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgentTransferModal;
