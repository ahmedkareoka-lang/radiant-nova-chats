import { useState } from "react";
import { useGifts } from "@/hooks/useGifts";
import CurrencyIcon from "@/components/CurrencyIcon";

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

interface GiftAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  senderId?: string | null;
  receiverId?: string | null;
  receiverName?: string;
}

const GiftAnimation = ({ isOpen, onClose, senderId, receiverId, receiverName }: GiftAnimationProps) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [sending, setSending] = useState(false);
  const { sendGift } = useGifts();

  if (!isOpen) return null;

  const handleSend = async () => {
    if (selectedGift === null || !senderId || !receiverId) return;
    setSending(true);
    const gift = gifts[selectedGift];
    const success = await sendGift(senderId, receiverId, gift.name, gift.price);
    if (success) {
      setBurst(true);
      setTimeout(() => {
        setBurst(false);
        setSelectedGift(null);
        setSending(false);
        onClose();
      }, 800);
    } else {
      setSending(false);
    }
  };

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
        {receiverName && (
          <p className="text-center text-xs text-muted-foreground mb-3">إرسال إلى: <span className="text-primary font-bold">{receiverName}</span></p>
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
        <button
          onClick={handleSend}
          disabled={selectedGift === null || sending || !receiverId}
          className="w-full py-3 rounded-full gradient-neon font-bold text-primary-foreground disabled:opacity-40 btn-nova glow-neon"
        >
          {sending ? "جارٍ الإرسال..." : !receiverId ? "اختر شخصاً" : "إرسال الهدية"}
        </button>
      </div>
    </div>
  );
};

export default GiftAnimation;
