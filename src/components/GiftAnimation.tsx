import { useState } from "react";

const gifts = [
  { emoji: "🌹", name: "Rose", price: 10 },
  { emoji: "💎", name: "Diamond", price: 100 },
  { emoji: "🚗", name: "Car", price: 500 },
  { emoji: "🏰", name: "Castle", price: 5000 },
  { emoji: "🎁", name: "Gift Box", price: 50 },
  { emoji: "❤️", name: "Heart", price: 20 },
  { emoji: "🔥", name: "Fire", price: 200 },
  { emoji: "👑", name: "Crown", price: 1000 },
];

interface GiftAnimationProps {
  onSend?: (gift: typeof gifts[0]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const GiftAnimation = ({ onSend, isOpen, onClose }: GiftAnimationProps) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    if (selectedGift !== null) {
      setBurst(true);
      onSend?.(gifts[selectedGift]);
      setTimeout(() => {
        setBurst(false);
        onClose();
      }, 800);
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
        <h3 className="text-center font-bold text-lg mb-4 glow-neon-text">🎁 Gifts</h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {gifts.map((gift, i) => (
            <button
              key={i}
              onClick={() => setSelectedGift(i)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                selectedGift === i
                  ? "bg-neon-purple/20 border border-neon-purple glow-neon scale-105"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{gift.price}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleSend}
          disabled={selectedGift === null}
          className="w-full py-3 rounded-full gradient-neon font-bold text-primary-foreground disabled:opacity-40 btn-nova glow-neon"
        >
          Send Gift
        </button>
      </div>
    </div>
  );
};

export default GiftAnimation;
