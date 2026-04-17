import { Users, MessageCircle } from "lucide-react";
import DualBadge from "./DualBadge";

interface RoomCardProps {
  name: string;
  hostName: string;
  hostImage: string;
  viewerCount: number;
  isVip?: boolean;
  category: string;
  onClick?: () => void;
  countryCode?: string;
  hostNovaLevel?: number;
  hostVipLevel?: number;
}

const COVER_GRADIENTS: Record<string, string> = {
  Chat: "linear-gradient(135deg, hsl(270 60% 30%), hsl(320 50% 25%))",
  Music: "linear-gradient(135deg, hsl(340 60% 30%), hsl(280 50% 25%))",
  Gaming: "linear-gradient(135deg, hsl(150 50% 20%), hsl(200 50% 25%))",
  VIP: "linear-gradient(135deg, hsl(45 80% 30%), hsl(30 70% 25%))",
};

const RoomCard = ({ name, hostName, hostImage, viewerCount, isVip, category, onClick, countryCode, hostNovaLevel = 0, hostVipLevel = 0 }: RoomCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`room-cover-card ${isVip ? "room-cover-vip" : "room-cover-normal"}`}
      style={{ background: COVER_GRADIENTS[category] || COVER_GRADIENTS.Chat }}
    >
      {/* Background overlay pattern */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 30% 50%, hsl(270 100% 65% / 0.3), transparent 60%)" }} />
      
      {/* Chat badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-background/40 backdrop-blur rounded-full px-2 py-0.5">
        <MessageCircle className="w-3 h-3 text-foreground/70" />
        <span className="text-[10px] text-foreground/80">محادثة</span>
      </div>

      {/* Member count */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1">
        <div className="flex items-center gap-1 bg-background/40 backdrop-blur rounded-full px-2 py-0.5">
          <Users className="w-3 h-3 text-foreground/70" />
          <span className="text-[10px] font-bold text-foreground/80">{viewerCount}</span>
        </div>
      </div>

      {/* Room name and country */}
      <div className="absolute bottom-3 right-3 z-10 text-right">
        <p className="text-sm font-bold text-foreground drop-shadow-lg truncate max-w-[140px]">{name}</p>
        <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
          {(hostNovaLevel > 0 || hostVipLevel > 0) && (
            <DualBadge novaLevel={hostNovaLevel} vipLevel={hostVipLevel} />
          )}
          {countryCode && (
            <>
              <span className="text-xs">🏳️</span>
              <span className="text-[10px] text-foreground/70">{countryCode}</span>
            </>
          )}
        </div>
      </div>

      {/* Host avatar */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={`w-16 h-16 rounded-full overflow-hidden ${isVip ? "ring-2 ring-gold glow-gold" : "ring-2 ring-primary/50"}`}>
          <img src={hostImage} alt={hostName} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* VIP crown */}
      {isVip && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-lg">👑</span>
        </div>
      )}
    </div>
  );
};

export default RoomCard;
