import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X, ChevronRight, ArrowLeft } from "lucide-react";
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
    nameAr: "الروليت البريميوم",
    emoji: "🎰",
    desc: "أرقام، ألوان، زوجي/فردي - مضاعفات حتى x36",
    color: "from-yellow-600/20 to-red-900/20",
    border: "border-yellow-500/30",
    preview: "راهن على الأرقام أو الألوان وادور العجلة! احتمالات تصل إلى x36",
  },
  {
    id: "liontiger",
    name: "Lion vs Tiger",
    nameAr: "أسد ضد نمر",
    emoji: "🦁",
    desc: "X2 للأسد/النمر - X30 للتعادل",
    color: "from-purple-600/20 to-blue-900/20",
    border: "border-purple-500/30",
    preview: "اختر أسد أو نمر وراهن! التعادل يعطيك x30 من رهانك",
  },
];

const NovaGamesMenu = ({ currentUserId, roomId }: NovaGamesMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [previewGame, setPreviewGame] = useState<string | null>(null);

  const handleLaunchGame = (gameId: string) => {
    setPreviewGame(null);
    setActiveGame(gameId);
  };

  return (
    <>
      {/* Game center icon button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-purple-500/20 border border-yellow-500/30 flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Gamepad2 className="w-5 h-5 text-yellow-400" />
      </button>

      {/* Game list drawer */}
      <AnimatePresence>
        {isOpen && !activeGame && !previewGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-t-3xl p-5 pb-8 space-y-4"
              style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #0d0520 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black" style={{ color: "#f5c842", textShadow: "0 0 20px rgba(245,200,66,0.5)" }}>
                  🎮 NOVA Games
                </h2>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <p className="text-xs text-white/50 text-center">اختر لعبتك المفضلة وابدأ المراهنة</p>
              <div className="space-y-3">
                {GAMES.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setPreviewGame(g.id)}
                    className={`w-full p-4 rounded-2xl bg-gradient-to-r ${g.color} border ${g.border} flex items-center gap-4 hover:scale-[1.02] transition-transform`}
                  >
                    <span className="text-4xl">{g.emoji}</span>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-yellow-300">{g.name}</p>
                      <p className="text-[10px] text-white/60">{g.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Preview/Detail Screen */}
      <AnimatePresence>
        {previewGame && !activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "linear-gradient(180deg, #0d0520 0%, #1a0a2e 50%, #0d0520 100%)" }}
          >
            <div className="w-full max-w-sm p-6 space-y-6">
              <button onClick={() => setPreviewGame(null)} className="flex items-center gap-2 text-white/60 text-sm">
                <ArrowLeft className="w-4 h-4" /> رجوع
              </button>
              {(() => {
                const game = GAMES.find(g => g.id === previewGame);
                if (!game) return null;
                return (
                  <div className="text-center space-y-4">
                    <span className="text-7xl block">{game.emoji}</span>
                    <h2 className="text-2xl font-black text-yellow-300">{game.name}</h2>
                    <p className="text-sm text-white/70">{game.preview}</p>
                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${game.color} border ${game.border}`}>
                      <p className="text-xs text-white/80">{game.desc}</p>
                    </div>
                    <button
                      onClick={() => handleLaunchGame(game.id)}
                      className="w-full py-4 rounded-2xl font-black text-lg text-black"
                      style={{ background: "linear-gradient(135deg, #f5c842, #e6a817)", boxShadow: "0 0 30px rgba(245,200,66,0.4)" }}
                    >
                      🚀 ابدأ اللعب
                    </button>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active game - FULLSCREEN with SOLID background */}
      <AnimatePresence>
        {activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] overflow-auto"
            style={{
              touchAction: "pan-y",
              pointerEvents: "auto",
              background: activeGame === "roulette"
                ? "#120818"
                : "#0d0b2e",
            }}
          >
            {/* Solid colored overlay to ensure no transparency */}
            <div
              className="absolute inset-0"
              style={{
                background: activeGame === "roulette"
                  ? "linear-gradient(180deg, #1a0a2e 0%, #2d0f0f 30%, #1a0a15 70%, #0d0515 100%)"
                  : "linear-gradient(180deg, #0d0b2e 0%, #1a1050 30%, #2d1060 60%, #1a0a3e 100%)",
              }}
            />
            <div className="relative z-10 w-full h-full">
              {activeGame === "roulette" && (
                <RouletteGame
                  onClose={() => { setActiveGame(null); setIsOpen(false); }}
                  currentUserId={currentUserId}
                />
              )}
              {activeGame === "liontiger" && (
                <LionTigerGame
                  onClose={() => { setActiveGame(null); setIsOpen(false); }}
                  currentUserId={currentUserId}
                  roomId={roomId || ""}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NovaGamesMenu;
