import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MicMember {
  user_id: string;
  mic_slot: number | null;
  is_on_mic: boolean;
  profile?: { display_name: string; avatar_url: string | null };
}

interface CouplePickerModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  members: MicMember[];
}

const CouplePickerModal = ({ open, onClose, roomId, members }: CouplePickerModalProps) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onMic = members.filter((m) => m.is_on_mic && m.mic_slot != null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleConfirm = async () => {
    if (selected.length !== 2) {
      toast.error("اختر شخصين");
      return;
    }
    const u1 = onMic.find((m) => m.user_id === selected[0]);
    const u2 = onMic.find((m) => m.user_id === selected[1]);
    if (!u1 || !u2 || u1.mic_slot == null || u2.mic_slot == null) {
      toast.error("الشخصان يجب أن يكونا على المايك");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("start_couple_seat", {
      _room_id: roomId,
      _user1_id: u1.user_id,
      _user2_id: u2.user_id,
      _slot1: u1.mic_slot,
      _slot2: u2.mic_slot,
    });
    setSubmitting(false);
    if (error) {
      toast.error("فشل إنشاء الزوج: " + error.message);
    } else {
      toast.success("💕 تم إنشاء الزوج بنجاح!");
      setSelected([]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-gradient-to-b from-pink-950 via-rose-950 to-background rounded-t-3xl p-5 pb-8 border-t-2 border-pink-500/40"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 fill-pink-400 text-pink-400" />
                <h3 className="text-lg font-black text-pink-100">اختر الزوج 💕</h3>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full bg-secondary/60 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-pink-200/80 mb-4">
              اختر شخصين من اللي على المايك ({selected.length}/2)
            </p>

            {onMic.length < 2 ? (
              <div className="text-center py-10 text-pink-200/70 text-sm">
                لازم يكون فيه على الأقل شخصين على المايك 🎤
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto mb-4">
                {onMic.map((m) => {
                  const isSelected = selected.includes(m.user_id);
                  const order = selected.indexOf(m.user_id) + 1;
                  return (
                    <button
                      key={m.user_id}
                      onClick={() => toggle(m.user_id)}
                      className={`relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all ${
                        isSelected
                          ? "bg-pink-500/30 ring-2 ring-pink-400 scale-105"
                          : "bg-secondary/40 hover:bg-secondary/70"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-[10px] font-black text-white">
                          {order}
                        </div>
                      )}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-pink-900/40">
                        {m.profile?.avatar_url ? (
                          <img loading="lazy" decoding="async" src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-pink-200 font-black">
                            {m.profile?.display_name?.[0] ?? "?"}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-pink-100 truncate w-full text-center">
                        {m.profile?.display_name ?? "User"}
                      </span>
                      <span className="text-[8px] text-pink-300/70">مقعد {(m.mic_slot ?? 0) + 1}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={selected.length !== 2 || submitting}
              className="w-full py-3 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 font-extrabold text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/40"
            >
              <Check className="w-4 h-4" />
              {submitting ? "جاري..." : "تأكيد الزوج 💕"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CouplePickerModal;
