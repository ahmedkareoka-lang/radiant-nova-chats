import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Send } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CurrencyIcon from "@/components/CurrencyIcon";
import { RELATIONSHIP_LIST, RELATIONSHIP_TYPES, type RelationshipType } from "@/lib/relationshipTypes";

interface Mutual {
  id: string;
  display_name: string;
  avatar_url: string | null;
  user_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mutuals: Mutual[];
  myCoins: number;
  onSent?: () => void;
}

const RelationshipRequestModal = ({ open, onClose, mutuals, myCoins, onSent }: Props) => {
  const [selectedType, setSelectedType] = useState<RelationshipType>("lover");
  const [selectedPartner, setSelectedPartner] = useState<Mutual | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const meta = RELATIONSHIP_TYPES[selectedType];
  const canAfford = myCoins >= meta.cost;

  const reset = () => {
    setSelectedType("lover");
    setSelectedPartner(null);
    setMessage("");
  };

  const handleSend = async () => {
    if (!selectedPartner) { toast.error("اختر شريكاً أولاً"); return; }
    if (!canAfford) { toast.error(`تحتاج ${meta.cost.toLocaleString()} عملة`); return; }
    setSending(true);
    const { error } = await supabase.rpc("send_relationship_request", {
      _receiver_id: selectedPartner.id,
      _type: selectedType,
      _message: message || null,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.emoji} تم إرسال طلب ${meta.label}!`);
    reset();
    onSent?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="w-full max-w-lg bg-card rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto border-t-2"
            style={{ borderColor: meta.glow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Heart className="w-5 h-5" style={{ color: meta.glow }} />
                إرسال طلب علاقة
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type chooser */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {RELATIONSHIP_LIST.map((r) => {
                const active = selectedType === r.type;
                return (
                  <button
                    key={r.type}
                    onClick={() => setSelectedType(r.type)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      active ? "border-foreground shadow-lg scale-[1.02]" : "border-border/30 opacity-70"
                    }`}
                    style={active ? { background: r.gradient } : undefined}
                  >
                    <div className="text-2xl mb-1">{r.emoji}</div>
                    <div className={`text-xs font-black ${active ? "text-white" : "text-foreground"}`}>{r.label}</div>
                    <div className={`text-[10px] mt-1 flex items-center justify-center gap-0.5 ${active ? "text-white/90" : "text-muted-foreground"}`}>
                      {r.cost.toLocaleString()} <CurrencyIcon type="gold" size="xs" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Description + perks of selected type */}
            <div className="rounded-xl p-3 mb-4 border border-border/30 bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-2">{meta.description}</p>
              <ul className="space-y-1">
                {meta.perks.map((p, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                    <span style={{ color: meta.glow }}>✦</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Partner picker */}
            <h4 className="text-sm font-bold text-foreground mb-2">اختر الشريك من المتابَعين</h4>
            {mutuals.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                لا يوجد أحد في قائمة المتابَعين. تابع أصدقاءك أولاً.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto mb-3 pr-1">
                {mutuals.map((m) => {
                  const sel = selectedPartner?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPartner(m)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${
                        sel ? "border-foreground bg-foreground/10" : "border-border/30 bg-secondary/20"
                      }`}
                    >
                      <img loading="lazy" decoding="async" src={m.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{m.display_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {m.user_id}</p>
                      </div>
                      {sel && <span className="text-foreground">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 140))}
              placeholder="اكتب رسالة قصيرة (اختياري)..."
              className="w-full p-3 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground resize-none mb-2"
              rows={2}
            />
            <div className="text-[10px] text-muted-foreground text-left mb-3">{message.length}/140</div>

            {/* Cost summary + send */}
            <div className="flex items-center justify-between p-3 rounded-xl mb-3 border border-border/30 bg-background/40">
              <div className="text-xs text-muted-foreground">رسوم التفعيل (تُخصم عند القبول)</div>
              <div className="flex items-center gap-1 font-black text-foreground">
                {meta.cost.toLocaleString()} <CurrencyIcon type="gold" size="sm" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
              <span>رصيدك: {myCoins.toLocaleString()}</span>
              {!canAfford && <span className="text-destructive font-bold">رصيدك لا يكفي</span>}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !selectedPartner || !canAfford}
              className="w-full py-3 rounded-full font-black text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: meta.gradient }}
            >
              <Send className="w-4 h-4" />
              {sending ? "جارٍ الإرسال..." : `إرسال طلب ${meta.label}`}
            </button>
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              ينتظر طلبك موافقة الشريك خلال 7 أيام
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RelationshipRequestModal;
