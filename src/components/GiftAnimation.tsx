import { useState } from "react";
import { useGifts } from "@/hooks/useGifts";
import CurrencyIcon from "@/components/CurrencyIcon";
import { Check, CheckCheck } from "lucide-react";

const gifts = [
  { emoji: "🌹", name: "وردة", price: 10 },
  { emoji: "❤️", name: "قلب", price: 20 },
  { emoji: "🎁", name: "هدية", price: 50 },
  { emoji: "💎", name: "جوهرة", price: 100 },
  { emoji: "🔥", name: "نار", price: 200 },
  { emoji: "🚗", name: "سيارة", price: 500 },
  { emoji: "👑", name: "تاج", price: 1000 },
  { emoji: "🏰", name: "قصر", price: 5000 },
];

interface RoomMemberInfo {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface GiftAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  senderId?: string | null;
  receiverId?: string | null;
  receiverName?: string;
  roomMembers?: RoomMemberInfo[];
}

const GiftAnimation = ({ isOpen, onClose, senderId, receiverId, receiverName, roomMembers }: GiftAnimationProps) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [showMulti, setShowMulti] = useState(false);
  const { sendGift } = useGifts();

  if (!isOpen) return null;

  const isMultiMode = showMulti && roomMembers && roomMembers.length > 0;
  const availableMembers = roomMembers?.filter(m => m.user_id !== senderId) || [];

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRecipients.size === availableMembers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(availableMembers.map(m => m.user_id)));
    }
  };

  const totalCost = selectedGift !== null
    ? gifts[selectedGift].price * (isMultiMode ? Math.max(selectedRecipients.size, 1) : 1)
    : 0;

  const handleSend = async () => {
    if (selectedGift === null) return;
    setSending(true);
    const gift = gifts[selectedGift];

    if (isMultiMode && selectedRecipients.size > 0) {
      let allSuccess = true;
      for (const rid of selectedRecipients) {
        const success = await sendGift(senderId!, rid, gift.name, gift.price);
        if (!success) { allSuccess = false; break; }
      }
      if (allSuccess) {
        setBurst(true);
        setTimeout(() => { setBurst(false); setSelectedGift(null); setSending(false); setSelectedRecipients(new Set()); setShowMulti(false); onClose(); }, 800);
      } else {
        setSending(false);
      }
    } else if (receiverId) {
      const success = await sendGift(senderId!, receiverId, gift.name, gift.price);
      if (success) {
        setBurst(true);
        setTimeout(() => { setBurst(false); setSelectedGift(null); setSending(false); onClose(); }, 800);
      } else {
        setSending(false);
      }
    }
  };

  const canSend = selectedGift !== null && (isMultiMode ? selectedRecipients.size > 0 : !!receiverId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {burst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-8xl animate-gift-burst">{gifts[selectedGift!].emoji}</span>
        </div>
      )}
      <div
        className="w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-t-3xl border-t border-border p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        <h3 className="text-center font-bold text-lg mb-1 glow-neon-text">🎁 الهدايا</h3>

        {/* Toggle multi-send */}
        {availableMembers.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            {receiverName && !showMulti && (
              <p className="text-xs text-muted-foreground">إرسال إلى: <span className="text-primary font-bold">{receiverName}</span></p>
            )}
            <button
              onClick={() => setShowMulti(!showMulti)}
              className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${showMulti ? 'gradient-neon text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
            >
              {showMulti ? '✓ إرسال جماعي' : '👥 إرسال جماعي'}
            </button>
          </div>
        )}

        {/* Multi-select members */}
        {isMultiMode && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground">اختر المستلمين ({selectedRecipients.size})</span>
              <button onClick={selectAll} className="text-[10px] text-primary font-bold flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                {selectedRecipients.size === availableMembers.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {availableMembers.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => toggleRecipient(m.user_id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[56px] transition-all ${
                    selectedRecipients.has(m.user_id) ? 'bg-primary/20 border border-primary' : 'bg-secondary'
                  }`}
                >
                  <div className="relative">
                    <img src={m.avatar_url || 'https://i.pravatar.cc/100'} className="w-8 h-8 rounded-full object-cover" alt="" />
                    {selectedRecipients.has(m.user_id) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] truncate max-w-[48px]">{m.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-4">
          {gifts.map((gift, i) => (
            <button
              key={i}
              onClick={() => setSelectedGift(i)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                selectedGift === i
                  ? "bg-primary/20 border border-primary glow-neon scale-105"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <CurrencyIcon type="gold" size="xs" />{gift.price}
              </span>
            </button>
          ))}
        </div>

        {/* Total cost indicator */}
        {selectedGift !== null && isMultiMode && selectedRecipients.size > 1 && (
          <p className="text-center text-xs text-accent mb-2 font-bold">
            الإجمالي: <CurrencyIcon type="gold" size="xs" /> {totalCost} ({selectedRecipients.size} × {gifts[selectedGift].price})
          </p>
        )}

        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className="w-full py-3 rounded-full gradient-neon font-bold text-primary-foreground disabled:opacity-40 btn-nova glow-neon"
        >
          {sending ? "جارٍ الإرسال..." : !canSend ? "اختر شخصاً وهدية" : isMultiMode ? `إرسال لـ ${selectedRecipients.size} أشخاص` : "إرسال الهدية"}
        </button>
      </div>
    </div>
  );
};

export default GiftAnimation;
