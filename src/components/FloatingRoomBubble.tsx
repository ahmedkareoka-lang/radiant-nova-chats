import { motion } from "framer-motion";
import { Mic, X } from "lucide-react";
import { useActiveRoom } from "@/contexts/ActiveRoomContext";
import { useNavigate } from "react-router-dom";

const FloatingRoomBubble = () => {
  const { roomId, isMinimized, roomName, expandRoom, closeRoom } = useActiveRoom();
  const navigate = useNavigate();

  if (!roomId || !isMinimized) return null;

  const handleExpand = () => {
    expandRoom();
    navigate(`/voice-room?id=${roomId}`);
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      drag
      dragConstraints={{ left: 0, right: 300, top: 0, bottom: 500 }}
      className="fixed bottom-20 right-4 z-[100] flex items-center gap-2"
    >
      <motion.button
        onClick={handleExpand}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 rounded-full gradient-neon glow-neon flex items-center justify-center shadow-2xl relative"
      >
        <Mic className="w-6 h-6 text-primary-foreground" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-background" />
      </motion.button>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-card/95 backdrop-blur-xl rounded-full px-3 py-1.5 border border-border flex items-center gap-2 shadow-xl"
      >
        <span className="text-[10px] font-bold text-foreground max-w-[80px] truncate">{roomName}</span>
        <span className="text-[8px] text-green-400 font-bold animate-pulse">● LIVE</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            closeRoom();
          }}
          className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-destructive" />
        </button>
      </motion.div>
    </motion.div>
  );
};

export default FloatingRoomBubble;
