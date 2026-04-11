import { useState } from "react";
import { Smile, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😏",
  "😢", "😭", "😡", "🤯", "🥶", "🤗", "🤔", "🤫", "🤭", "😴",
  "👍", "👎", "👏", "🙌", "🤝", "💪", "🫶", "❤️", "🔥", "⭐",
  "💎", "👑", "🎉", "🎊", "🎁", "🌹", "🦋", "🐉", "🦁", "🐺",
];

const STICKERS = [
  { id: "love", emoji: "💖", label: "حب" },
  { id: "fire", emoji: "🔥🔥🔥", label: "نار" },
  { id: "crown", emoji: "👑✨", label: "ملك" },
  { id: "laugh", emoji: "🤣😂🤣", label: "ضحك" },
  { id: "sad", emoji: "😭💔", label: "حزين" },
  { id: "cool", emoji: "😎🤙", label: "كول" },
  { id: "party", emoji: "🎉🥳🎊", label: "حفلة" },
  { id: "muscle", emoji: "💪🏆", label: "قوة" },
  { id: "rose", emoji: "🌹💕", label: "ورد" },
  { id: "dragon", emoji: "🐉⚡", label: "تنين" },
  { id: "wave", emoji: "👋😊", label: "تحية" },
  { id: "clap", emoji: "👏👏👏", label: "تصفيق" },
];

interface EmojiStickerPickerProps {
  onSelect: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const EmojiStickerPicker = ({ onSelect, isOpen, onToggle }: EmojiStickerPickerProps) => {
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
      >
        <Smile className="w-4 h-4 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-10 left-0 right-0 w-72 card-nova rounded-2xl p-3 z-50 shadow-xl"
          >
            {/* Tabs */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setTab("emoji")}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                    tab === "emoji" ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  😀 إيموجي
                </button>
                <button
                  onClick={() => setTab("sticker")}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                    tab === "sticker" ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  🎨 ملصقات
                </button>
              </div>
              <button onClick={onToggle}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            {tab === "emoji" ? (
              <div className="grid grid-cols-8 gap-1 max-h-36 overflow-auto">
                {EMOJI_LIST.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => { onSelect(emoji); onToggle(); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-auto">
                {STICKERS.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => { onSelect(sticker.emoji); onToggle(); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    <span className="text-2xl">{sticker.emoji}</span>
                    <span className="text-[9px] text-muted-foreground">{sticker.label}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmojiStickerPicker;
