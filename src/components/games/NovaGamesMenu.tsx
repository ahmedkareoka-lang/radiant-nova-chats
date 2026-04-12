import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X } from "lucide-react";
import RouletteGame from "./RouletteGame";
import LionTigerGame from "./LionTigerGame";

interface NovaGamesMenuProps {
  roomId: string;
  currentUserId: string | null;
}

const GAMES = [
  { id: "roulette", name: "Premium Roulette", emoji: "🎰", desc: "ارقام، ألوان، زوجي/فردي" },
  { id: "liontiger", name: "Lion vs Tiger", emoji: "🦁", desc: "أسد ضد نمر - X2 / X30" },
];

const NovaGamesMenu = ({ roomId, currentUserId }: NovaGamesMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  return (
    <>
      <button onClick={() => setIsOpen(true)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-purple-500/20 border border-yellow-500/30 flex items-center justify-center hover:scale-110 transition-transform">
        <Gamepad2 className="w-4 h-4 text-yellow-400" />
      </button>

      <AnimatePresence>
        {isOpen && !activeGame && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center"
            onClick={() => setIsOpen(false)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              className="w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black glow-gold-text flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-yellow-400" /> NOVA Games
                </h2>
                <button onClick={() => setIsOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                {GAMES.map(g => (
                  <button key={g.id} onClick={() => setActiveGame(g.id)}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-yellow-900/20 via-purple-900/20 to-yellow-900/20 border border-yellow-500/20 flex items-center gap-4 hover:border-yellow-500/50 transition-all">
                    <span className="text-3xl">{g.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold text-sm text-yellow-300">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeGame === "roulette" && (
          <RouletteGame onClose={() => { setActiveGame(null); setIsOpen(false); }} currentUserId={currentUserId} />
        )}
        {activeGame === "liontiger" && (
          <LionTigerGame onClose={() => { setActiveGame(null); setIsOpen(false); }} currentUserId={currentUserId} roomId={roomId} />
        )}
      </AnimatePresence>
    </>
  );
};

export default NovaGamesMenu;
