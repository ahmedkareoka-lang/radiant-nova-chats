import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Mic, MicOff, Gift, LogOut, Crown, MessageCircle, Send, Users, TrendingUp, Heart, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GiftAnimation from "@/components/GiftAnimation";
import VipBadge from "@/components/VipBadge";
import BossEntrance from "@/components/BossEntrance";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { toast } from "sonner";

interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  vip_level: number;
  is_boss: boolean;
  wealth_level?: number;
  wealth_xp?: number;
  charisma_level?: number;
  charisma_xp?: number;
}

const VoiceRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("id");
  const { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic } = useVoiceRoom(roomId);

  const [isMuted, setIsMuted] = useState(true);
  const [showGifts, setShowGifts] = useState(false);
  const [giftReceiverId, setGiftReceiverId] = useState<string | null>(null);
  const [giftReceiverName, setGiftReceiverName] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showBossEntrance, setShowBossEntrance] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleBossEntranceComplete = useCallback(() => setShowBossEntrance(false), []);

  useEffect(() => {
    if (roomId) joinRoom();
    return () => { if (roomId) leaveRoom(); };
  }, [roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const bossMember = members.find((m) => m.profile?.is_boss);
    if (bossMember && bossMember.user_id !== currentUserId) {
      setShowBossEntrance(true);
    }
  }, [members, currentUserId]);

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput("");
  };

  const handleToggleMic = async () => {
    const newState = !isMuted;
    setIsMuted(newState);
    await toggleMic(!newState);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate("/");
  };

  const openGiftFor = (userId: string, name: string) => {
    setGiftReceiverId(userId);
    setGiftReceiverName(name);
    setShowGifts(true);
  };

  const handleAvatarClick = (member: any) => {
    if (member.profile) {
      setSelectedProfile(member.profile as UserProfile);
    }
  };

  if (!roomId) {
    navigate("/");
    return null;
  }

  const host = roomData?.host_profile;
  const micCount = roomData?.mic_count || 8;

  const micSlots = Array.from({ length: micCount }).map((_, i) => {
    const member = members.find((m) => m.mic_slot === i || (i === 0 && m.user_id === roomData?.host_id));
    return member || null;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Profile Stats Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center" onClick={() => setSelectedProfile(null)}>
          <div className="card-nova p-5 max-w-xs w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">بطاقة اللاعب</h3>
              <button onClick={() => setSelectedProfile(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary">
                <img src={selectedProfile.avatar_url || "https://i.pravatar.cc/100"} className="w-full h-full object-cover" />
              </div>
              <span className={`font-bold ${selectedProfile.is_boss ? "boss-fire-text" : "glow-neon-text"}`}>{selectedProfile.display_name}</span>
              <VipBadge level={selectedProfile.vip_level} size="md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="card-nova p-3 text-center">
                <TrendingUp className="w-4 h-4 text-accent mx-auto mb-1" />
                <p className="text-xs font-bold">الثروة Lv.{selectedProfile.wealth_level || 1}</p>
                <p className="text-[9px] text-muted-foreground">{(selectedProfile.wealth_xp || 0).toLocaleString()} XP</p>
              </div>
              <div className="card-nova p-3 text-center">
                <Heart className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold">الكاريزما Lv.{selectedProfile.charisma_level || 1}</p>
                <p className="text-[9px] text-muted-foreground">{(selectedProfile.charisma_xp || 0).toLocaleString()} XP</p>
              </div>
            </div>
            {selectedProfile.user_id !== currentUserId && (
              <button
                onClick={() => { setSelectedProfile(null); openGiftFor(selectedProfile.user_id, selectedProfile.display_name); }}
                className="w-full py-2.5 rounded-full gradient-gold text-accent-foreground font-bold text-sm btn-nova"
              >
                🎁 إرسال هدية
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={handleLeave} className="text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-sm">{roomData?.name || "Room"}</h1>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {members.length} متصل
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold animate-pulse">
            ● LIVE
          </span>
        </div>
      </header>

      {/* Voice Room Area */}
      <div className="flex-1 overflow-auto px-4 py-6 max-w-lg mx-auto w-full">
        {/* Host */}
        {host && (
          <div className="flex flex-col items-center mb-8 cursor-pointer" onClick={() => handleAvatarClick({ profile: { ...host, user_id: roomData?.host_id } })}>
            <div className="relative animate-vip-entrance">
              <div className={`w-20 h-20 rounded-full overflow-hidden ring-4 ${host.is_boss ? "boss-god-frame" : "ring-accent"} animate-pulse-glow`}>
                <img src={host.avatar_url || "https://i.pravatar.cc/100?img=3"} alt={host.display_name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -top-2 -right-2">
                <Crown className="w-6 h-6 text-accent animate-float" />
              </div>
            </div>
            <span className={`font-bold text-sm mt-2 ${host.is_boss ? "boss-fire-text" : "glow-neon-text"}`}>{host.display_name}</span>
            <VipBadge level={host.vip_level} size="md" />
          </div>
        )}

        {/* Mic Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {micSlots.map((slot, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              {slot ? (
                <div className="cursor-pointer" onClick={() => handleAvatarClick(slot)}>
                  <div className={`relative w-14 h-14 rounded-full overflow-hidden ${
                    slot.is_on_mic ? "ring-2 ring-destructive animate-mic-burn" : "ring-2 ring-border"
                  } ${(slot.profile?.vip_level || 0) >= 5 ? "ring-accent" : ""}`}>
                    <img src={slot.profile?.avatar_url || "https://i.pravatar.cc/60?img=3"} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-semibold truncate max-w-[56px] block text-center">{slot.profile?.display_name}</span>
                  {(slot.profile?.vip_level || 0) > 0 && <VipBadge level={slot.profile!.vip_level} />}
                </div>
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
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">الدردشة الحية</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-auto mb-3">
            {messages.map((msg) => (
              <div key={msg.id} className="text-xs">
                <span className={`font-bold ${msg.sender?.is_boss ? "boss-fire-text" : msg.sender?.vip_level && msg.sender.vip_level >= 5 ? "text-accent" : "text-primary"}`}>
                  {msg.sender?.display_name || "User"}:{" "}
                </span>
                <span className="text-muted-foreground">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالة..."
              maxLength={500}
              className="flex-1 bg-secondary rounded-full px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={handleSend} className="w-8 h-8 rounded-full gradient-neon flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          <button
            onClick={handleToggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-destructive/20 text-destructive" : "gradient-neon glow-neon text-primary-foreground"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={() => {
            // Send gift to host by default
            if (host) openGiftFor(roomData?.host_id, host.display_name);
          }} className="w-14 h-14 rounded-full gradient-gold glow-gold flex items-center justify-center animate-float">
            <Gift className="w-6 h-6 text-accent-foreground" />
          </button>
          <button onClick={handleLeave} className="w-12 h-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <GiftAnimation
        isOpen={showGifts}
        onClose={() => { setShowGifts(false); setGiftReceiverId(null); }}
        senderId={currentUserId}
        receiverId={giftReceiverId}
        receiverName={giftReceiverName}
      />
      <BossEntrance show={showBossEntrance} onComplete={handleBossEntranceComplete} />
    </div>
  );
};

export default VoiceRoom;
