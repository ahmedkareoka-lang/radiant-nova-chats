import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X, ChevronRight } from "lucide-react";
import RouletteGame from "./RouletteGame";
import LionTigerGame from "./LionTigerGame";

interface NovaGamesMenuProps {
  currentUserId: string | null;
  roomId?: string;
}

const GAMES = [
  {
    id: "roulette",
    name: "Premium Roulette",
    nameAr: "الروليت",
    emoji: "🎰",
    desc: "ارقام، ألوان، زوجي/فردي - مضاعفات حتى x36",
    color: "from-yellow-600/20 to-red-900/20",
    border: "border-yellow-500/30",
  },
  {
    id: "liontiger",
    name: "Lion vs Tiger",
    nameAr: "أسد ضد نمر",
    emoji: "🦁",
    desc: "X2 للأسد/النمر - X30 للتعادل",
    color: "from-purple-600/20 to-blue-900/20",
    border: "border-purple-500/30",
  },
];

const NovaGamesMenu = ({ currentUserId, roomId }: NovaGamesMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [previewGame, setPreviewGame] = useState<string | null>(null);

  const selectedGame = GAMES.find((g) => g.id === previewGame);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-purple-500/20 border border-yellow-500/30 flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Gamepad2 className="w-5 h-5 text-yellow-400" />
      </button>

      <AnimatePresence>
        {isOpen && !activeGame && !previewGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-yellow-400">NOVA Games</h2>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="space-y-3">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setPreviewGame(g.id)}
                    className={`w-full p-4 rounded-2xl bg-gradient-to-r ${g.color} border ${g.border} flex items-center gap-4`}
                  >
                    <span className="text-4xl">{g.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-yellow-300">{g.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* شاشة المعاينة */}
      <AnimatePresence>
        {previewGame && selectedGame && !activeGame && (
          <motion.div
            className="fixed inset-0 z-[1000] bg-black flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm p-6 text-center">
              <div className="text-7xl mb-2">{selectedGame.emoji}</div>
              <button
                onClick={() => {
                  setActiveGame(previewGame);
                  setPreviewGame(null);
                }}
                className="w-full py-4 rounded-2xl font-black text-lg text-black bg-yellow-500"
              >
                🎮 ابدأ اللعب
              </button>
              <button onClick={() => setPreviewGame(null)} className="mt-4 text-white">
                رجوع
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الأمر الجديد اللي إنت عاوزه في خانة لوحده - درع الحماية الفولاذي */}
      <AnimatePresence>
        {activeGame && (
          <div
            className="fixed inset-0 z-[99999] bg-black flex items-center justify-center"
            style={{ touchAction: "none", pointerEvents: "auto" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {activeGame === "roulette" && (
                <RouletteGame
                  onClose={() => {
                    setActiveGame(null);
                    setIsOpen(false);
                  }}
                  currentUserId={currentUserId}
                />
              )}
              {activeGame === "liontiger" && (
                <LionTigerGame
                  onClose={() => {
                    setActiveGame(null);
                    setIsOpen(false);
                  }}
                  currentUserId={currentUserId}
                  roomId={roomId || ""}
                />
              )}

              {/* زرار إغلاق طوارئ عشان لو اللعبة علقت */}
              <button
                onClick={() => {
                  setActiveGame(null);
                  setIsOpen(false);
                }}
                className="absolute top-4 right-4 z-[100000] p-2 bg-red-500 rounded-full"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NovaGamesMenu;
