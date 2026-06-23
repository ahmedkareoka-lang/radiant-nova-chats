import { useNavigate } from "react-router-dom";
import type { ActiveRoomInfo } from "@/hooks/useUsersActiveRoom";

interface LiveAvatarProps {
  avatarUrl: string | null | undefined;
  activeRoom?: ActiveRoomInfo | null;
  size?: number;
  ringClassName?: string;
  alt?: string;
  onAvatarClick?: () => void;
  /** Show online dot when not in a room */
  showOnlineDot?: boolean;
}

/**
 * Avatar that shows a pulsing LIVE pill at the bottom when the user is sitting
 * in a voice room. Clicking the pill navigates straight into that room.
 */
const LiveAvatar = ({
  avatarUrl,
  activeRoom,
  size = 48,
  ringClassName = "ring-2 ring-border/30",
  alt = "",
  onAvatarClick,
  showOnlineDot = true,
}: LiveAvatarProps) => {
  const navigate = useNavigate();
  const src = avatarUrl || "https://i.pravatar.cc/100";

  const handleLive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRoom) navigate(`/voice-room?id=${activeRoom.roomId}`);
  };

  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={(e) => {
          if (onAvatarClick) {
            e.stopPropagation();
            onAvatarClick();
          }
        }}
        className={`block rounded-full overflow-hidden ${ringClassName} ${
          activeRoom ? "ring-2 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.55)] animate-pulse" : ""
        }`}
        style={{ width: size, height: size, padding: 0 }}
        aria-label={alt || "avatar"}
      >
        <img
          loading="lazy"
          decoding="async"
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </button>

      {activeRoom ? (
        <button
          type="button"
          onClick={handleLive}
          title={`في غرفة: ${activeRoom.roomName} — اضغط للانضمام`}
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full
            bg-gradient-to-r from-red-600 via-red-500 to-orange-500
            text-[8px] font-black text-white tracking-wide
            shadow-[0_0_8px_rgba(239,68,68,0.7)] ring-1 ring-white/40
            flex items-center gap-0.5 hover:scale-110 transition-transform"
        >
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          LIVE
        </button>
      ) : showOnlineDot ? (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
      ) : null}
    </div>
  );
};

export default LiveAvatar;
