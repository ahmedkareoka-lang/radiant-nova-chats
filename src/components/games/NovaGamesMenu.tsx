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

  // دالة لإغلاق اللعبة والتأكد من تنظيف الحالة
  const closeGame = () => {
    setActiveGame(null);
    setPreviewGame(null);
    setIsOpen(false);
  };

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
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="w-full max-w-sm p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2
                  className="text-xl font-black flex items-center gap-2"
                  style={{ color: "#f5c842", textShadow: "0 0 15px rgba(245,200,66,0.4)" }}
                >
                  <Gamepad2 className="w-5 h-5 text-yellow-400" /> NOVA Games
                </h2>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-3">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setPreviewGame(g.id)}
                    className={`w-full p-4 rounded-2xl bg-gradient-to-r ${g.color} border ${g.border} flex items-center gap-4 hover:scale-[1.02] transition-all`}
                  >
                    <span className="text-4xl">{g.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-yellow-300">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Preview Screen */}
      <AnimatePresence>
        {previewGame && selectedGame && !activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="w-full max-w-sm p-6 space-y-5 text-center relative"
            >
              <button onClick={() => setPreviewGame(null)} className="absolute top-0 right-0 p-2">
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="text-7xl mb-2">{selectedGame.emoji}</div>
              <h2 className="text-2xl font-black text-yellow-300">{selectedGame.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedGame.nameAr}</p>
              <p className="text-xs text-white/60 leading-relaxed">{selectedGame.desc}</p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    setActiveGame(previewGame);
                    setPreviewGame(null);
                  }}
                  className="w-full py-4 rounded-2xl font-black text-lg text-black"
                  style={{
                    background: "linear-gradient(135deg, #f5c842, #e6a817)",
                    boxShadow: "0 0 30px rgba(245,200,66,0.4)",
                  }}
                >
                  🎮 ابدأ اللعب
                </button>
                <button
                  onClick={() => setPreviewGame(null)}
                  className="w-full py-3 rounded-2xl bg-secondary text-muted-foreground font-bold text-sm"
                >
                  رجوع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Rendering Layer with Full Screen Isolation */}
      <AnimatePresence>
        {activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-black overflow-hidden touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            {activeGame === "roulette" && <RouletteGame onClose={closeGame} currentUserId={currentUserId} />}
            {activeGame === "liontiger" && (
              <LionTigerGame onClose={closeGame} currentUserId={currentUserId} roomId={roomId || ""} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NovaGamesMenu;
