import { Users, Flame } from "lucide-react";
import DualBadge from "./DualBadge";
import SmartImage from "./SmartImage";
import { getRoomTier, getRoomTierByLevel, type RoomLevelTier } from "@/lib/roomLevels";
import { Crown, Gem, Star, Shield, Sparkles } from "lucide-react";

interface MicPreview {
  user_id: string;
  profiles?: { avatar_url: string | null; display_name: string } | null;
}

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
  micPreviews?: MicPreview[];
  isHot?: boolean;
  roomImage?: string | null;
  roomLevel?: number;
  totalSupportCoins?: number;
}

const COVER_GRADIENTS: Record<string, string> = {
  Chat: "linear-gradient(135deg, hsl(270 60% 30%), hsl(320 50% 25%))",
  Music: "linear-gradient(135deg, hsl(340 60% 30%), hsl(280 50% 25%))",
  Gaming: "linear-gradient(135deg, hsl(150 50% 20%), hsl(200 50% 25%))",
  VIP: "linear-gradient(135deg, hsl(45 80% 30%), hsl(30 70% 25%))",
};

const RoomCard = ({
  name,
  hostName,
  hostImage,
  viewerCount,
  isVip,
  category,
  onClick,
  countryCode,
  hostNovaLevel = 0,
  hostVipLevel = 0,
  micPreviews = [],
  isHot = false,
  roomImage,
  roomLevel,
  totalSupportCoins,
}: RoomCardProps) => {
  // Derive tier from explicit level when given, else from coin total (live-safe fallback).
  const tier: RoomLevelTier =
    typeof roomLevel === "number" && roomLevel > 0
      ? getRoomTierByLevel(roomLevel)
      : getRoomTier(Number(totalSupportCoins || 0));
  const LevelIcon = ({ lvl }: { lvl: number }) =>
    lvl >= 6 ? <Flame className="w-2.5 h-2.5" /> :
    lvl >= 5 ? <Sparkles className="w-2.5 h-2.5" /> :
    lvl >= 4 ? <Crown className="w-2.5 h-2.5" /> :
    lvl >= 3 ? <Gem className="w-2.5 h-2.5" /> :
    lvl >= 2 ? <Shield className="w-2.5 h-2.5" /> :
               <Star className="w-2.5 h-2.5" />;
  const levelStyles: Record<number, string> = {
    1: "bg-slate-800/70 border-slate-400/40 text-slate-100",
    2: "bg-gradient-to-r from-slate-500/60 to-slate-300/50 border-slate-100/70 text-white shadow-[0_0_8px_rgba(203,213,225,0.5)]",
    3: "bg-gradient-to-r from-sky-600/80 to-cyan-400/70 border-sky-200/80 text-white shadow-[0_0_10px_rgba(56,189,248,0.7)]",
    4: "bg-gradient-to-r from-purple-700/85 to-fuchsia-500/80 border-fuchsia-200/90 text-white shadow-[0_0_12px_rgba(217,70,239,0.8)]",
    5: "bg-gradient-to-r from-amber-600/90 via-orange-500/90 to-rose-500/80 border-amber-100 text-white shadow-[0_0_14px_rgba(245,158,11,0.95)]",
    6: "bg-[conic-gradient(at_top_left,#ef4444,#f59e0b,#ef4444,#7f1d1d,#ef4444)] border-red-200 text-white shadow-[0_0_16px_rgba(239,68,68,1)] animate-pulse",
  };

  return (
    <div
      onClick={onClick}
      className={`room-cover-card ${isVip ? "room-cover-vip" : "room-cover-normal"} ${isHot ? "ring-2 ring-accent/70 shadow-[0_0_20px_hsl(45_100%_55%/0.4)]" : ""}`}
      style={
        roomImage
          ? { backgroundImage: `url(${roomImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: COVER_GRADIENTS[category] || COVER_GRADIENTS.Chat }
      }
    >
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />

      {/* Soft accent glow */}
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle at 30% 30%, hsl(270 100% 65% / 0.4), transparent 60%)" }}
      />

      {/* LIVE badge top-left with pulse */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-destructive/90 backdrop-blur rounded-full px-1.5 py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        <span className="text-[9px] font-black text-white tracking-wide">LIVE</span>
      </div>

      {/* Room LEVEL premium mini-badge — top-right (yields to HOT badge when hot) */}
      <div className={`absolute ${isHot ? "top-9" : "top-2"} right-2 z-10`}>
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border backdrop-blur font-black text-[9px] tracking-wide ${levelStyles[tier.level] || levelStyles[1]}`}
          title={tier.label}
        >
          <LevelIcon lvl={tier.level} />
          <span>LV.{tier.level}</span>
        </div>
      </div>

      {/* HOT badge top-right */}
      {isHot && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-accent/90 backdrop-blur rounded-full px-1.5 py-0.5 animate-pulse">
          <Flame className="w-2.5 h-2.5 text-accent-foreground" />
          <span className="text-[9px] font-black text-accent-foreground">HOT</span>
        </div>
      )}

      {/* Host avatar centered */}
      <div className="absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className={`w-14 h-14 rounded-full overflow-hidden ${isVip ? "ring-2 ring-accent glow-gold" : "ring-2 ring-primary/60"}`}>
          <SmartImage
            src={hostImage}
            alt={hostName}
            width={56}
            variant="avatar"
            className="w-full h-full"
          />
        </div>
        {isVip && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-base">👑</div>}
      </div>

      {/* Mic preview avatars row (Soulmatch style) */}
      {micPreviews.length > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex -space-x-1.5">
          {micPreviews.slice(0, 3).map((m, i) => (
            <div
              key={m.user_id}
              className="w-5 h-5 rounded-full ring-1 ring-background overflow-hidden bg-secondary"
              style={{ zIndex: 3 - i }}
            >
              <SmartImage
                src={m.profiles?.avatar_url}
                alt=""
                width={20}
                variant="thumb"
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 py-2">
        <p className="text-xs font-black text-foreground drop-shadow-lg truncate text-right mb-1">{name}</p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 bg-background/50 backdrop-blur rounded-full px-1.5 py-0.5">
            <Users className="w-2.5 h-2.5 text-foreground/80" />
            <span className="text-[9px] font-bold text-foreground/90">{viewerCount}</span>
          </div>
          <div className="flex items-center gap-1">
            {hostVipLevel > 0 && <DualBadge vipLevel={hostVipLevel} />}
            {countryCode && <span className="text-[10px]">🏳️</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomCard;
