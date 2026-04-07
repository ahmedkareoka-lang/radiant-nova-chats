import { useState, useCallback } from "react";
import { ArrowLeft, Mic, MicOff, Gift, LogOut, Crown, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GiftAnimation from "@/components/GiftAnimation";
import VipBadge from "@/components/VipBadge";
import BossEntrance from "@/components/BossEntrance";

const hostData = {
  name: "Ahmed",
  image: "https://i.pravatar.cc/100?img=11",
  vipLevel: 7,
};

const micSlots = [
  { name: "Sara", image: "https://i.pravatar.cc/60?img=5", vipLevel: 5, active: true },
  { name: "Omar", image: "https://i.pravatar.cc/60?img=12", vipLevel: 3, active: true },
  { name: "Nour", image: "https://i.pravatar.cc/60?img=9", vipLevel: 0, active: true },
  { name: "", image: "", vipLevel: 0, active: false },
  { name: "Youssef", image: "https://i.pravatar.cc/60?img=15", vipLevel: 10, active: true },
  { name: "", image: "", vipLevel: 0, active: false },
  { name: "Layla", image: "https://i.pravatar.cc/60?img=20", vipLevel: 2, active: true },
  { name: "", image: "", vipLevel: 0, active: false },
];

const chatMessages = [
  { user: "Sara", message: "Welcome everyone! 🎉", vip: true },
  { user: "Omar", message: "Great vibes tonight" },
  { user: "Nour", message: "Can I get on mic?" },
  { user: "Youssef", message: "🔥🔥🔥", vip: true },
];

const VoiceRoom = () => {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showBossEntrance, setShowBossEntrance] = useState(false);
  const handleBossEntranceComplete = useCallback(() => setShowBossEntrance(false), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-sm">Night Vibes 🎵</h1>
              <span className="text-[10px] text-muted-foreground">24 listeners</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold animate-pulse">
              ● LIVE
            </span>
          </div>
        </div>
      </header>

      {/* Voice Room Area */}
      <div className="flex-1 overflow-auto px-4 py-6 max-w-lg mx-auto w-full">
        {/* Host - Center */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative animate-vip-entrance">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-gold animate-pulse-glow">
              <img src={hostData.image} alt={hostData.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Crown className="w-6 h-6 text-gold animate-float" />
            </div>
          </div>
          <span className="font-bold text-sm mt-2 glow-gold-text">{hostData.name}</span>
          <VipBadge level={hostData.vipLevel} size="md" />
        </div>

        {/* Mic Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {micSlots.map((slot, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {slot.active ? (
                <>
                  <div className={`relative w-14 h-14 rounded-full overflow-hidden ${
                    slot.vipLevel >= 5
                      ? "ring-2 ring-accent animate-pulse-glow"
                      : slot.vipLevel > 0
                      ? "ring-2 ring-primary/60"
                      : "ring-2 ring-border"
                  } ${slot.active ? "animate-mic-burn" : ""}`}>
                    <img src={slot.image} alt={slot.name} className="w-full h-full object-cover" />
                    {slot.vipLevel >= 10 && (
                      <div className="absolute inset-0 rounded-full border-2 border-gold animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold truncate max-w-[56px] ${
                    slot.vipLevel >= 10 ? "glow-gold-text" : slot.vipLevel >= 5 ? "glow-neon-text" : ""
                  }`}>
                    {slot.name}
                  </span>
                  {slot.vipLevel > 0 && <VipBadge level={slot.vipLevel} />}
                </>
              ) : (
                <div className="w-14 h-14 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chat */}
        <div className="card-nova p-3">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-neon-purple" />
            <span className="text-xs font-semibold">Live Chat</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-auto mb-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className={`font-bold ${msg.vip ? "text-gold" : "text-neon-purple"}`}>{msg.user}: </span>
                <span className="text-muted-foreground">{msg.message}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Say something..."
              className="flex-1 bg-secondary rounded-full px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-neon-purple"
            />
            <button className="w-8 h-8 rounded-full gradient-neon flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-destructive/20 text-destructive" : "gradient-neon glow-neon text-primary-foreground"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowGifts(true)}
            className="w-14 h-14 rounded-full gradient-gold glow-gold flex items-center justify-center animate-float"
          >
            <Gift className="w-6 h-6 text-accent-foreground" />
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-12 h-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <GiftAnimation isOpen={showGifts} onClose={() => setShowGifts(false)} />
      <BossEntrance show={showBossEntrance} onComplete={handleBossEntranceComplete} />
    </div>
  );
};

export default VoiceRoom;
