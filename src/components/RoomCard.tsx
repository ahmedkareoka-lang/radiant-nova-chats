import { Users, Mic } from "lucide-react";

interface RoomCardProps {
  name: string;
  hostName: string;
  hostImage: string;
  viewerCount: number;
  isVip?: boolean;
  category: string;
}

const RoomCard = ({ name, hostName, hostImage, viewerCount, isVip, category }: RoomCardProps) => {
  const categoryColors: Record<string, string> = {
    Chat: "bg-neon-purple/20 text-neon-purple",
    Music: "bg-pink-500/20 text-pink-400",
    Gaming: "bg-green-500/20 text-green-400",
    VIP: "bg-gold/20 text-gold",
  };

  return (
    <div className={`card-nova p-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-neon-purple/40 ${isVip ? "border-gold/30 animate-pulse-glow" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${isVip ? "ring-2 ring-gold" : "ring-2 ring-neon-purple/50"}`}>
          <img src={hostImage} alt={hostName} className="w-full h-full object-cover" />
          {isVip && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-gold flex items-center justify-center">
              <span className="text-[8px] font-bold text-accent-foreground">V</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{name}</h3>
          <p className="text-xs text-muted-foreground truncate">{hostName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${categoryColors[category] || categoryColors.Chat}`}>
            {category}
          </span>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="w-3 h-3" />
            <span className="text-[10px]">{viewerCount}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {Array.from({ length: Math.min(viewerCount, 5) }).map((_, i) => (
          <Mic key={i} className="w-3 h-3 text-neon-purple/60" />
        ))}
        {viewerCount > 5 && <span className="text-[10px] text-muted-foreground">+{viewerCount - 5}</span>}
      </div>
    </div>
  );
};

export default RoomCard;
