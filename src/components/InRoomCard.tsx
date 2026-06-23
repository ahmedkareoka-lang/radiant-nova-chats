import { useNavigate } from "react-router-dom";
import { Mic, ChevronLeft } from "lucide-react";
import type { ActiveRoomInfo } from "@/hooks/useUsersActiveRoom";

interface InRoomCardProps {
  activeRoom: ActiveRoomInfo | null | undefined;
  userName?: string;
}

/**
 * Prominent card shown on a user's profile when they are currently inside a
 * voice room. Tap to jump straight into that room.
 */
const InRoomCard = ({ activeRoom, userName }: InRoomCardProps) => {
  const navigate = useNavigate();
  if (!activeRoom) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/voice-room?id=${activeRoom.roomId}`)}
      className="w-full mt-4 rounded-2xl overflow-hidden relative text-right
        border-2 border-red-500/40 shadow-[0_4px_24px_rgba(239,68,68,0.35)]
        group hover:scale-[1.01] transition-transform"
      style={{
        background:
          "linear-gradient(135deg, hsl(0 70% 25% / 0.55), hsl(280 55% 22% / 0.55))",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-red-400/60">
          {activeRoom.roomCover ? (
            <img
              src={activeRoom.roomCover}
              alt={activeRoom.roomName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
          )}
          <span className="absolute bottom-0 left-0 right-0 text-[8px] font-black text-white text-center bg-red-600/90">
            LIVE
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-300 tracking-wide">
              متواجد الآن في غرفة
            </span>
          </div>
          <p className="font-black text-sm text-white truncate mt-0.5">
            {activeRoom.roomName}
          </p>
          <p className="text-[10px] text-white/70 truncate">
            اضغط للانضمام {userName ? `إلى ${userName}` : ""}
          </p>
        </div>
        <ChevronLeft className="w-5 h-5 text-white/80 group-hover:-translate-x-1 transition-transform" />
      </div>
    </button>
  );
};

export default InRoomCard;
