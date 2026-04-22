import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Mic, MicOff, Gift, LogOut, Crown, MessageCircle, Send, Users, TrendingUp, Heart, X, Settings2, Volume2, Pin, UserMinus, Minimize2, Lock, Unlock, VolumeX, Trash2, Ban, Shield, BellOff, Package } from "lucide-react";
import NovaCup from "@/components/NovaCup";
import HostIncomeCounter from "@/components/HostIncomeCounter";
import SupportCounter from "@/components/SupportCounter";
import PKChallenge from "@/components/PKChallenge";
import GlobalWinTicker from "@/components/GlobalWinTicker";
import { useActiveRoom } from "@/contexts/ActiveRoomContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import GiftAnimation from "@/components/GiftAnimation";
import VipBadge from "@/components/VipBadge";
import DualBadge from "@/components/DualBadge";
import BossEntrance from "@/components/BossEntrance";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import EmojiStickerPicker from "@/components/EmojiStickerPicker";
import RoomParticles from "@/components/RoomParticles";
import CustomEntranceEffect from "@/components/CustomEntranceEffect";
import GiftAnnouncementBanner from "@/components/GiftAnnouncementBanner";
import TreasureBox from "@/components/TreasureBox";
import VoiceRoomBackdrop from "@/components/VoiceRoomBackdrop";
import Top3RoomSenders from "@/components/Top3RoomSenders";
import GiftComboBar from "@/components/GiftComboBar";
import LuckyWheelButton from "@/components/LuckyWheelButton";
import FullscreenGiftEffect from "@/components/FullscreenGiftEffect";
import { FRAME_MAP, FRAME_ANIMATION, bossFrame } from "@/lib/frameConfig";

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
  equipped_frame?: string | null;
}

const ENTRANCE_EFFECTS = [
  { minLevel: 0, color: "from-muted/20 to-transparent", label: "", border: "border-border", icon: "" },
  { minLevel: 3, color: "from-blue-500/20 to-transparent", label: "⭐", border: "border-blue-500/50", icon: "⭐" },
  { minLevel: 5, color: "from-purple-500/30 to-transparent", label: "🌟", border: "border-purple-500/50", icon: "🌟" },
  { minLevel: 10, color: "from-accent/30 to-transparent", label: "👑", border: "border-accent/50", icon: "👑" },
  { minLevel: 20, color: "from-red-500/30 via-accent/20 to-transparent", label: "🔥", border: "border-red-500/50", icon: "🔥" },
  { minLevel: 50, color: "from-yellow-500/40 via-red-500/30 to-transparent", label: "🐉", border: "border-yellow-500/50", icon: "🐉⚡" },
];

const getEntranceEffect = (wealthLevel: number, charismaLevel: number) => {
  const totalLevel = wealthLevel + charismaLevel;
  let effect = ENTRANCE_EFFECTS[0];
  for (const e of ENTRANCE_EFFECTS) {
    if (totalLevel >= e.minLevel) effect = e;
  }
  return effect;
};

const MIC_OPTIONS = [5, 8, 12, 15, 20];

const ROOM_THEMES: { id: string; label: string; emoji: string; bg: string }[] = [
  { id: "default", label: "Default", emoji: "🌑", bg: "bg-background" },
  { id: "space", label: "Space", emoji: "🌌", bg: "bg-gradient-to-b from-[#0a0a2e] via-[#1a1040] to-[#0d0d2b]" },
  { id: "ocean", label: "Ocean", emoji: "🌊", bg: "bg-gradient-to-b from-[#0a2540] via-[#0e3a5c] to-[#061a2e]" },
  { id: "forest", label: "Forest", emoji: "🌲", bg: "bg-gradient-to-b from-[#0a1f0a] via-[#1a3520] to-[#0d1e0d]" },
  { id: "neon", label: "Neon City", emoji: "🏙️", bg: "bg-gradient-to-b from-[#1a0a2e] via-[#2d1050] to-[#0f0520]" },
  { id: "sunset", label: "Sunset", emoji: "🌅", bg: "bg-gradient-to-b from-[#2e1a0a] via-[#3d2010] to-[#1a0d05]" },
  { id: "aurora", label: "Aurora", emoji: "🌈", bg: "bg-gradient-to-b from-[#0a2e2e] via-[#102040] to-[#0a1a2e]" },
];

const VoiceRoom = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("id");
  const { openRoom, minimizeRoom, closeRoom } = useActiveRoom();
  const { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic, updateMicSlot, fetchMembers } = useVoiceRoom(roomId);

  const [isMuted, setIsMuted] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [giftReceiverId, setGiftReceiverId] = useState<string | null>(null);
  const [giftReceiverName, setGiftReceiverName] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showBossEntrance, setShowBossEntrance] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [giftBurst, setGiftBurst] = useState<{ emoji: string; count: number; imageUrl?: string | null } | null>(null);
  const [fullscreenGift, setFullscreenGift] = useState<{ id: string; emoji: string; giftName: string; imageUrl: string | null; senderName: string; recipientName: string; amount: number; timestamp: number } | null>(null);
  const [entranceBanner, setEntranceBanner] = useState<{
    name: string;
    wealthLevel: number;
    charismaLevel: number;
    effect: typeof ENTRANCE_EFFECTS[0];
  } | null>(null);
  const [entranceQueue, setEntranceQueue] = useState<{ id: string; displayName: string; avatarUrl: string | null; videoUrl: string | null; audioUrl: string | null; novaLevel?: number; vipLevel?: number }[]>([]);
  const [muteEntrance, setMuteEntrance] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const seenMemberIds = useRef<Set<string>>(new Set());

  // Current user profile
  const currentProfile = members.find(m => m.user_id === currentUserId)?.profile;
  const isBoss = currentProfile?.is_boss || false;
  const isHost = currentUserId === roomData?.host_id;
  const isAdmin = isBoss || isHost;

  // Determine if current user is on a mic
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOnMic = currentMember?.mic_slot !== null && currentMember?.mic_slot !== undefined;

  // Room locked slots and muted users
  const lockedSlots: number[] = (roomData as any)?.locked_slots || [];
  const mutedUsers: string[] = (roomData as any)?.muted_users || [];

  // WebRTC
  const { connectedPeers, speakingPeers, localSpeaking } = useWebRTC({
    roomId,
    currentUserId,
    isOnMic,
    isMuted,
  });

  const handleBossEntranceComplete = useCallback(() => setShowBossEntrance(false), []);

  // Register room with context and join
  useEffect(() => {
    if (roomId && currentUserId) {
      joinRoom();
    }
  }, [roomId, currentUserId]);

  // Register room name with context when roomData loads
  useEffect(() => {
    if (roomId && roomData?.name) {
      openRoom(roomId, roomData.name);
    }
  }, [roomId, roomData?.name]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Boss entrance - only trigger once when a Boss user joins
  const bossEntranceShown = useRef(false);
  useEffect(() => {
    if (bossEntranceShown.current) return;
    for (const m of members) {
      if (m.profile?.is_boss && !seenMemberIds.current.has(m.user_id) && m.user_id !== currentUserId) {
        bossEntranceShown.current = true;
        setShowBossEntrance(true);
        break;
      }
    }
  }, [members, currentUserId]);

  // Entrance banner + entrance effect queue
  // Self-only: only show the user's OWN entrance to themselves on join.
  useEffect(() => {
    for (const m of members) {
      if (!seenMemberIds.current.has(m.user_id)) {
        seenMemberIds.current.add(m.user_id);
        // Only show entrance UI for the current user joining (self)
        if (m.user_id !== currentUserId) continue;
        if (m.profile) {
          const wealthLvl = m.profile.wealth_level || 1;
          const charismaLvl = m.profile.charisma_level || 1;
          const effect = getEntranceEffect(wealthLvl, charismaLvl);
          setEntranceBanner({
            name: m.profile.display_name,
            wealthLevel: wealthLvl,
            charismaLevel: charismaLvl,
            effect,
          });
          setTimeout(() => setEntranceBanner(null), 4000);

          const p = m.profile as any;
          const novaLvl = p.nova_p_level || 0;
          const entranceMedia = p.equipped_entrance_effect || p.entrance_video_url || null;
          setEntranceQueue(prev => [...prev, {
            id: m.user_id + "-" + Date.now(),
            displayName: m.profile!.display_name,
            avatarUrl: m.profile!.avatar_url,
            videoUrl: entranceMedia,
            audioUrl: p.entrance_audio_url || null,
            novaLevel: novaLvl,
            vipLevel: m.profile!.vip_level || 0,
          }]);
        }
      }
    }
  }, [members, currentUserId]);

  const handleEntranceComplete = useCallback((id: string) => {
    setEntranceQueue(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput("");
  };

  const handleToggleMic = async () => {
    setIsMuted(prev => !prev);
  };

  const handleLeave = async () => {
    await leaveRoom();
    closeRoom();
    navigate("/");
  };

  const handleMinimize = () => {
    minimizeRoom();
    navigate("/");
  };

  const openGiftFor = (userId: string, name: string) => {
    setGiftReceiverId(userId);
    setGiftReceiverName(name);
    setShowGifts(true);
  };

  const handleAvatarClick = (member: any) => {
    const memberId = member.user_id;
    if (!memberId) return;
    const profile = member.profile;
    if (profile) {
      setSelectedProfile({ ...profile, user_id: memberId } as UserProfile);
    }
  };

  // Admin: Kick user from mic
  const handleKickFromMic = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    await supabase.from("room_members").update({ mic_slot: null, is_on_mic: false }).eq("room_id", roomId).eq("user_id", userId);
    fetchMembers();
    toast.success("تم إنزال المستخدم من المايك");
    setSelectedProfile(null);
  };

  // Admin: Kick user from room
  const handleKickUser = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    fetchMembers();
    toast.success("تم طرد المستخدم من الغرفة 🚫");
    setSelectedProfile(null);
  };

  // Admin: Ban user from room
  const handleBanUser = async (userId: string) => {
    if (!roomId || !isAdmin || !currentUserId) return;
    await supabase.from("room_bans").insert({ room_id: roomId, user_id: userId, banned_by: currentUserId } as any);
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    fetchMembers();
    toast.success("تم حظر المستخدم من الغرفة ⛔");
    setSelectedProfile(null);
  };

  // Admin: Mute user (force mute via room muted_users array)
  const handleMuteUser = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    const current = mutedUsers || [];
    const isMutedAlready = current.includes(userId);
    const updated = isMutedAlready ? current.filter((id: string) => id !== userId) : [...current, userId];
    await supabase.from("rooms").update({ muted_users: updated } as any).eq("id", roomId);
    toast.success(isMutedAlready ? "تم إلغاء كتم المستخدم" : "تم كتم المستخدم 🔇");
    setSelectedProfile(null);
  };

  // Admin: Mute all users on mic
  const handleMuteAll = async () => {
    if (!roomId || !isAdmin) return;
    const onMicUsers = members.filter(m => m.is_on_mic && m.user_id !== currentUserId).map(m => m.user_id);
    const updated = [...new Set([...(mutedUsers || []), ...onMicUsers])];
    await supabase.from("rooms").update({ muted_users: updated } as any).eq("id", roomId);
    toast.success("تم كتم جميع المايكات 🔇");
  };

  // Admin: Lock/unlock mic slot
  const handleToggleLockSlot = async (slotIndex: number) => {
    if (!roomId || !isAdmin) return;
    const current = lockedSlots || [];
    const isLocked = current.includes(slotIndex);
    const updated = isLocked ? current.filter((s: number) => s !== slotIndex) : [...current, slotIndex];
    await supabase.from("rooms").update({ locked_slots: updated } as any).eq("id", roomId);
    toast.success(isLocked ? `تم فتح المايك ${slotIndex + 1} 🔓` : `تم قفل المايك ${slotIndex + 1} 🔒`);
  };

  // Admin: Lock room (toggle password)
  const handleToggleLockRoom = async () => {
    if (!roomId || !isHost) return;
    if (roomData?.is_private) {
      await supabase.from("rooms").update({ is_private: false, password: null }).eq("id", roomId);
      toast.success("تم فتح الغرفة 🔓");
    } else {
      const pw = prompt("أدخل كلمة مرور الغرفة:");
      if (!pw) return;
      await supabase.from("rooms").update({ is_private: true, password: pw }).eq("id", roomId);
      toast.success("تم قفل الغرفة 🔒");
    }
  };

  // Admin: Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!isAdmin) return;
    await supabase.from("messages").delete().eq("id", msgId);
    toast.success("تم حذف الرسالة 🗑️");
  };

  // Boss: Pin message
  const handlePinMessage = (content: string) => {
    if (!isAdmin) return;
    setPinnedMessage(content);
    toast.success("تم تثبيت الرسالة 📌");
  };

  const handleSitOnMic = async (slotIndex: number) => {
    if (!roomId || !currentUserId) return;

    // Check if slot is locked
    if (lockedSlots.includes(slotIndex) && !isAdmin) {
      toast.error("هذا المايك مقفل 🔒");
      return;
    }

    const existing = members.find((m) => m.user_id === currentUserId);

    if (existing?.mic_slot === slotIndex) {
      await updateMicSlot(null, false);
      setIsMuted(true);
      toast.success("نزلت من المايك");
      return;
    }

    if (existing?.mic_slot !== null && existing?.mic_slot !== undefined) {
      await updateMicSlot(null, false);
    }

    const slotTaken = members.find((m) => m.mic_slot === slotIndex && m.user_id !== currentUserId);
    if (slotTaken) {
      toast.error("هذا المايك مشغول");
      return;
    }

    await updateMicSlot(slotIndex, true);
    setIsMuted(false);
    toast.success(`جلست على المايك ${slotIndex + 1} 🎙️`);
  };

  const changeMicCount = async (count: number) => {
    if (!roomId) return;
    await supabase.from("rooms").update({ mic_count: count }).eq("id", roomId);
    toast.success(`تم تغيير عدد المايكات إلى ${count}`);
    setShowSettings(false);
  };

  // Gift burst callback (local sender) — uses the designed gift image when available.
  // Also drives a Yalla-style combo bar that grows on rapid successive sends.
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const handleGiftBurst = (emoji: string, count: number, imageUrl?: string | null) => {
    setGiftBurst({ emoji, count, imageUrl: imageUrl || null });
    setTimeout(() => setGiftBurst(null), 2500);
    setComboCount((c) => c + count);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    comboTimerRef.current = setTimeout(() => setComboCount(0), 3000);
  };

  // Listen for gift broadcasts from other users in the room
  useEffect(() => {
    if (!roomId) return;
    const channelName = `room-gifts-${roomId}`;
    const channel = supabase.channel(channelName + "-listener-" + Date.now())
      .on("broadcast", { event: "gift-sent" }, (payload) => {
        const { emoji, imageUrl, amount, giftName, senderName, recipientName } = payload.payload;
        // Fullscreen gift effect for all gifts
        setFullscreenGift({
          id: Date.now().toString(),
          emoji: emoji || "🎁",
          giftName: giftName || "هدية",
          imageUrl: imageUrl || null,
          senderName: senderName || "مستخدم",
          recipientName: recipientName || "مستخدم",
          amount: amount || 100,
          timestamp: Date.now(),
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  if (!roomId) {
    navigate("/");
    return null;
  }

  const host = roomData?.host_profile;
  const micCount = roomData?.mic_count || 8;

  const micSlots = Array.from({ length: micCount }).map((_, i) => {
    const member = members.find((m) => m.mic_slot === i);
    return member || null;
  });

  const gridCols = micCount <= 8 ? "grid-cols-4" : "grid-cols-5";

  // Helper: speaking animation
  const SpeakingWaves = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 rounded-full border-2 border-green-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
      <div className="absolute inset-[-3px] rounded-full border-2 border-green-400/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
    </div>
  );

  // Helper to render avatar with frame
  const renderAvatarWithFrame = (
    avatarUrl: string | null,
    equippedFrame: string | null | undefined,
    isBossUser: boolean,
    size: "sm" | "md" | "lg" = "md",
    isSpeaking: boolean = false
  ) => {
    const sizeMap = { sm: { outer: "w-14 h-14", inner: "w-10 h-10", frame: "w-[72px] h-[72px]" }, md: { outer: "w-16 h-16", inner: "w-12 h-12", frame: "w-[82px] h-[82px]" }, lg: { outer: "w-20 h-20", inner: "w-16 h-16", frame: "w-[100px] h-[100px]" } };
    const s = sizeMap[size];
    const mappedFrame = (equippedFrame && FRAME_MAP[equippedFrame]) ? FRAME_MAP[equippedFrame] : null;
    const directFrame = (!mappedFrame && equippedFrame && (equippedFrame.startsWith("http") || equippedFrame.startsWith("/"))) ? equippedFrame : null;
    const frameImg = mappedFrame || directFrame || (isBossUser ? bossFrame : null);

    if (frameImg) {
      const animClass = equippedFrame ? (FRAME_ANIMATION[equippedFrame] || "") : "";
      return (
        <div className={`relative ${s.frame} flex items-center justify-center`}>
          {isSpeaking && <SpeakingWaves />}
          <img src={frameImg} alt="frame" className={`absolute inset-0 w-full h-full object-contain z-10 pointer-events-none ${animClass}`} />
          <div className={`${s.inner} rounded-full overflow-hidden`}>
            <img src={avatarUrl || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${s.outer} rounded-full overflow-hidden ring-2 ${isSpeaking ? 'ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]' : 'ring-border'}`}>
        {isSpeaking && <SpeakingWaves />}
        <img src={avatarUrl || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
      </div>
    );
  };

  const currentTheme = ROOM_THEMES.find(t => t.id === (roomData?.background_theme || 'default')) || ROOM_THEMES[0];

  const changeTheme = async (themeId: string) => {
    if (!roomId) return;
    await supabase.from("rooms").update({ background_theme: themeId } as any).eq("id", roomId);
    toast.success("تم تغيير خلفية الغرفة ✨");
  };

  return (
    <div className={`min-h-screen flex flex-col ${currentTheme.bg} transition-all duration-700 relative overflow-hidden`}>
      {/* Soft animated luxury backdrop (drifting orbs + sparkles) */}
      <VoiceRoomBackdrop />
      {/* Animated Particles */}
      <RoomParticles theme={currentTheme.id} />

      {/* Room Name Watermark */}
      {roomData?.name && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <span className="text-6xl font-black text-foreground/[0.03] select-none whitespace-nowrap rotate-[-15deg]">
            {roomData.name}
          </span>
        </div>
      )}

      {/* Fullscreen Gift Effect */}
      <FullscreenGiftEffect
        gift={fullscreenGift}
        onComplete={() => setFullscreenGift(null)}
      />

      {/* Multi-Gift Visual Burst (uses designed image when available) */}
      <AnimatePresence>
        {giftBurst && (
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {giftBurst.imageUrl && (
              <motion.div
                initial={{ scale: 0.2, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ type: "spring", damping: 14 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <img
                  src={giftBurst.imageUrl}
                  alt="gift"
                  className="w-52 h-52 object-contain drop-shadow-[0_0_40px_rgba(255,200,80,0.8)]"
                  style={{ background: "transparent" }}
                />
              </motion.div>
            )}
            {Array.from({ length: Math.min(giftBurst.count * 3, 30) }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 50,
                  opacity: 1,
                  rotate: Math.random() * 360,
                }}
                animate={{
                  y: -100,
                  x: Math.random() * window.innerWidth,
                  opacity: 0,
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5 }}
              >
                {giftBurst.imageUrl ? (
                  <img src={giftBurst.imageUrl} alt="" className="w-16 h-16 object-contain" style={{ background: "transparent" }} />
                ) : (
                  <span className="text-5xl">{giftBurst.emoji}</span>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
      
      {/* Entrance Banner */}
      <AnimatePresence>
        {entranceBanner && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 15 }}
            className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-gradient-to-r ${entranceBanner.effect.color} border ${entranceBanner.effect.border} backdrop-blur-xl shadow-2xl min-w-[260px]`}
          >
            <div className="flex flex-col items-center gap-1">
              <motion.p initial={{ scale: 0.5 }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5 }} className="text-2xl">
                {entranceBanner.effect.icon || "🚪"}
              </motion.p>
              <motion.p initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="text-sm font-bold text-center whitespace-nowrap">
                <span className="glow-neon-text">{entranceBanner.name}</span> has arrived ✨
              </motion.p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-bold flex items-center gap-1 text-accent">
                  <TrendingUp className="w-3 h-3" /> ثروة Lv.{entranceBanner.wealthLevel}
                </span>
                <span className="text-[10px] font-bold flex items-center gap-1 text-primary">
                  <Heart className="w-3 h-3" /> كاريزما Lv.{entranceBanner.charismaLevel}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Stats Modal with Admin Menu */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center" onClick={() => setSelectedProfile(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-nova p-5 max-w-xs w-full space-y-4" onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">بطاقة اللاعب</h3>
              <button onClick={() => setSelectedProfile(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-col items-center gap-2">
              {renderAvatarWithFrame(selectedProfile.avatar_url, selectedProfile.equipped_frame, selectedProfile.is_boss, "lg")}
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

            {/* User actions */}
            {selectedProfile.user_id !== currentUserId && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelectedProfile(null); openGiftFor(selectedProfile.user_id, selectedProfile.display_name); }}
                    className="flex-1 py-2.5 rounded-full gradient-gold text-accent-foreground font-bold text-sm btn-nova"
                  >
                    🎁 هدية
                  </button>
                  <button
                    onClick={() => { setSelectedProfile(null); navigate(`/user?id=${selectedProfile.user_id}`); }}
                    className="flex-1 py-2.5 rounded-full bg-secondary text-foreground font-bold text-sm"
                  >
                    👤 بروفايل
                  </button>
                </div>

                {/* Admin Menu */}
                {isAdmin && (
                  <div className="border-t border-border/30 pt-2 mt-1">
                    <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1"><Shield className="w-3 h-3" /> أدوات المشرف</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Mute */}
                      <button
                        onClick={() => handleMuteUser(selectedProfile.user_id)}
                        className="py-2 rounded-xl bg-secondary text-xs font-bold flex flex-col items-center gap-1 hover:bg-secondary/80 transition-all"
                      >
                        <VolumeX className="w-4 h-4 text-muted-foreground" />
                        <span>{mutedUsers.includes(selectedProfile.user_id) ? "إلغاء الكتم" : "كتم"}</span>
                      </button>
                      {/* Kick */}
                      <button
                        onClick={() => handleKickUser(selectedProfile.user_id)}
                        className="py-2 rounded-xl bg-secondary text-xs font-bold flex flex-col items-center gap-1 hover:bg-destructive/20 transition-all"
                      >
                        <LogOut className="w-4 h-4 text-destructive" />
                        <span className="text-destructive">طرد</span>
                      </button>
                      {/* Ban */}
                      <button
                        onClick={() => handleBanUser(selectedProfile.user_id)}
                        className="py-2 rounded-xl bg-secondary text-xs font-bold flex flex-col items-center gap-1 hover:bg-destructive/20 transition-all"
                      >
                        <Ban className="w-4 h-4 text-destructive" />
                        <span className="text-destructive">حظر</span>
                      </button>
                    </div>
                    {/* Kick from mic if on mic */}
                    {members.find(m => m.user_id === selectedProfile.user_id)?.mic_slot !== null &&
                     members.find(m => m.user_id === selectedProfile.user_id)?.mic_slot !== undefined && (
                      <button
                        onClick={() => handleKickFromMic(selectedProfile.user_id)}
                        className="w-full mt-2 py-2 rounded-xl bg-destructive/10 text-destructive font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <UserMinus className="w-3.5 h-3.5" /> إنزال من المايك
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && isHost && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="card-nova p-4 max-w-lg w-full rounded-t-3xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
            <h3 className="font-bold text-sm text-center">⚙️ إعدادات الغرفة</h3>

            {/* Edit Room Name */}
            <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold">اسم الغرفة</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={roomData?.name || ""}
                  id="room-name-input"
                  className="flex-1 bg-background rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="اسم الغرفة"
                />
                <button onClick={async () => {
                  const input = document.getElementById("room-name-input") as HTMLInputElement;
                  if (input?.value.trim() && roomId) {
                    await supabase.from("rooms").update({ name: input.value.trim() }).eq("id", roomId);
                    toast.success("تم تغيير اسم الغرفة ✅");
                  }
                }} className="px-3 py-2 rounded-lg gradient-neon text-primary-foreground text-xs font-bold">
                  حفظ
                </button>
              </div>
            </div>

            {/* Lock Room */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold">قفل الغرفة (كلمة مرور)</span>
              </div>
              <button onClick={handleToggleLockRoom}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${roomData?.is_private ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"}`}>
                {roomData?.is_private ? "🔒 مقفلة" : "🔓 مفتوحة"}
              </button>
            </div>

            {/* Mute Entrance Sounds */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold">كتم أصوات الدخول</span>
              </div>
              <button onClick={() => setMuteEntrance(!muteEntrance)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${muteEntrance ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"}`}>
                {muteEntrance ? "🔇 مكتوم" : "🔔 مفعّل"}
              </button>
            </div>

            <button onClick={handleMuteAll}
              className="w-full flex items-center justify-center gap-2 bg-secondary/50 rounded-xl p-3 text-xs font-bold hover:bg-destructive/10 transition-all">
              <VolumeX className="w-4 h-4 text-destructive" />
              <span>كتم جميع المايكات</span>
            </button>

            <div>
              <p className="text-xs text-muted-foreground mb-2">عدد المايكات</p>
              <div className="grid grid-cols-4 gap-2">
                {MIC_OPTIONS.map((count) => (
                  <button key={count} onClick={() => changeMicCount(count)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${micCount === count ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary text-muted-foreground"}`}>
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">خلفية الغرفة</p>
              <div className="grid grid-cols-4 gap-2">
                {ROOM_THEMES.map((theme) => (
                  <button key={theme.id} onClick={() => changeTheme(theme.id)}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-1 ${currentTheme.id === theme.id ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary text-muted-foreground"}`}>
                    <span className="text-lg">{theme.emoji}</span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full py-2 text-xs text-muted-foreground">إغلاق</button>
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
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm">{roomData?.name || "Room"}</h1>
                {roomData?.is_private && <Lock className="w-3 h-3 text-accent" />}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> {members.length} متصل
                {connectedPeers.size > 0 && (
                  <span className="text-green-500 flex items-center gap-0.5 ml-1">
                    <Volume2 className="w-3 h-3" /> {connectedPeers.size}
                  </span>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isHost && (
              <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={() => setMuteEntrance(!muteEntrance)} className={`w-8 h-8 rounded-full flex items-center justify-center ${muteEntrance ? 'bg-destructive/20' : 'bg-secondary'}`} title={muteEntrance ? "تفعيل أصوات الدخول" : "كتم أصوات الدخول"}>
              <BellOff className={`w-4 h-4 ${muteEntrance ? 'text-destructive' : 'text-muted-foreground'}`} />
            </button>
            <button onClick={handleMinimize} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center" title="تصغير">
              <Minimize2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-bold animate-pulse">
              ● LIVE
            </span>
          </div>
        </div>
      </header>

      {/* Global Win Ticker */}
      <GlobalWinTicker />

      {/* Big Gift Announcement Banner */}
      {roomId && <GiftAnnouncementBanner roomId={roomId} />}

      {/* Treasure Box (auto-trigger at 300K daily room support) */}
      {roomId && <TreasureBox roomId={roomId} isHost={isHost} currentUserId={currentUserId} />}

      {/* Voice Room Area */}
      <div className="flex-1 overflow-auto px-4 py-6 max-w-lg mx-auto w-full">
        {/* PK Challenge & Trophy side by side */}
        {roomId && (
          <div className="mb-4 flex items-start gap-2">
            <div className="flex-1">
              <PKChallenge roomId={roomId} isHost={isHost} members={members} />
            </div>
            <NovaCup roomId={roomId} />
          </div>
        )}

        {/* Host Info Banner with Top 3 Senders strip */}
        {host && (
          <div className="mb-6">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-card/80 border border-border cursor-pointer" onClick={() => handleAvatarClick({ user_id: roomData?.host_id, profile: host })}>
              <div className="relative">
                <img src={host.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-accent" />
                <Crown className="w-4 h-4 text-accent absolute -top-1 -right-1" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`font-bold text-sm ${host.is_boss ? "boss-fire-text" : "glow-neon-text"}`}>{host.display_name}</span>
                <p className="text-[10px] text-muted-foreground">مضيف الغرفة</p>
              </div>
              <VipBadge level={host.vip_level} size="sm" />
            </div>
            {/* Top 3 senders chip */}
            {roomData?.host_id && roomId && (
              <div className="flex justify-center mt-2">
                <Top3RoomSenders roomId={roomId} hostId={roomData.host_id} />
              </div>
            )}
          </div>
        )}

        {/* Mic Grid */}
        <div className={`grid ${gridCols} gap-3 mb-6`}>
          {micSlots.map((slot, i) => {
            const isSlotLocked = lockedSlots.includes(i);
            const slotIsSpeaking = slot?.is_on_mic && (
              slot.user_id === currentUserId ? localSpeaking : speakingPeers.has(slot.user_id)
            );
            const isUserMuted = slot ? mutedUsers.includes(slot.user_id) : false;

            return (
              <div key={i} className="flex flex-col items-center gap-1">
                {slot ? (
                  <div className="cursor-pointer relative" onClick={() => handleAvatarClick({ user_id: slot.user_id, profile: slot.profile })}>
                    <div className="relative">
                      {renderAvatarWithFrame(
                        slot.profile?.avatar_url || null,
                        (slot.profile as any)?.equipped_frame || null,
                        slot.profile?.is_boss || false,
                        "sm",
                        !!slotIsSpeaking && !isUserMuted
                      )}
                      {isUserMuted && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center z-20">
                          <VolumeX className="w-3 h-3 text-destructive-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold truncate max-w-[56px] block text-center mt-1">
                      {slot.profile?.display_name || "User"}
                    </span>
                    <div className="flex justify-center mt-0.5">
                      <DualBadge novaLevel={(slot.profile as any)?.nova_p_level || 0} vipLevel={slot.profile?.vip_level || 0} />
                    </div>
                    {/* Support Counter for everyone */}
                    <SupportCounter userId={slot.user_id} sessionStart={roomData?.created_at || new Date().toISOString()} />
                    {(slot.profile?.vip_level || 0) > 0 && !((slot.profile as any)?.nova_p_level) && <VipBadge level={slot.profile!.vip_level} />}
                    {slot.user_id === roomData?.host_id && roomId && currentUserId && (
                      <HostIncomeCounter
                        hostId={slot.user_id}
                        roomOwnerId={roomData?.host_id}
                        currentUserId={currentUserId}
                        sessionStart={roomData?.created_at || new Date().toISOString()}
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                        isSlotLocked
                          ? "bg-destructive/10 border-destructive/40"
                          : "bg-secondary border-border hover:border-primary hover:bg-secondary/80"
                      }`}
                      onClick={() => isAdmin && isSlotLocked ? handleToggleLockSlot(i) : handleSitOnMic(i)}
                      onContextMenu={(e) => { e.preventDefault(); if (isAdmin) handleToggleLockSlot(i); }}
                    >
                      {isSlotLocked ? (
                        <Lock className="w-4 h-4 text-destructive" />
                      ) : (
                        <Mic className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      {isSlotLocked ? "🔒" : ""} مايك {i + 1}
                    </span>
                    {/* Lock/unlock button for admin */}
                    {isAdmin && (
                      <button onClick={() => handleToggleLockSlot(i)} className="text-[8px] text-muted-foreground hover:text-primary">
                        {isSlotLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Chat */}
        <div className="card-nova p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold">الدردشة الحية</span>
          </div>

          {/* Pinned Message */}
          <AnimatePresence>
            {pinnedMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 p-2 rounded-lg bg-accent/10 border border-accent/30 flex items-start gap-2"
              >
                <Pin className="w-3 h-3 text-accent mt-0.5 shrink-0" />
                <p className="text-[11px] text-accent font-medium flex-1">{pinnedMessage}</p>
                {isAdmin && (
                  <button onClick={() => setPinnedMessage(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2 max-h-40 overflow-auto mb-3">
            {messages.map((msg) => {
              const isSystemMsg = msg.content.startsWith("🚪");
              const isBossMsg = msg.sender?.is_boss;
              return (
                <div key={msg.id} className={`text-xs ${isSystemMsg ? "text-center" : ""} group relative`}>
                  {isSystemMsg ? (
                    <motion.span
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-accent/80 font-medium italic"
                    >
                      {msg.content}
                    </motion.span>
                  ) : (
                    <div className={`${isBossMsg ? "bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-lg px-2 py-1 border border-accent/20" : ""}`}>
                      <span className="inline-flex items-center gap-1 align-middle mr-1">
                        <DualBadge novaLevel={(msg.sender as any)?.nova_p_level || 0} vipLevel={msg.sender?.vip_level || 0} />
                      </span>
                      <span className={`font-bold ${isBossMsg ? "boss-fire-text" : msg.sender?.vip_level && msg.sender.vip_level >= 5 ? "text-accent" : "text-primary"}`}>
                        {isBossMsg && "👑 "}
                        {msg.sender?.display_name || "User"}:{" "}
                      </span>
                      <span className={`${isBossMsg ? "text-accent font-semibold" : "text-foreground"}`}>{msg.content}</span>
                      {/* Admin actions: Pin & Delete */}
                      {isAdmin && !isSystemMsg && (
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 inline-flex gap-1">
                          <button onClick={() => handlePinMessage(msg.content)} title="تثبيت">
                            <Pin className="w-3 h-3 text-muted-foreground hover:text-accent" />
                          </button>
                          <button onClick={() => handleDeleteMessage(msg.id)} title="حذف">
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 items-center">
            <EmojiStickerPicker
              isOpen={showEmojiPicker}
              onToggle={() => setShowEmojiPicker(!showEmojiPicker)}
              onSelect={(emoji) => setChatInput((prev) => prev + emoji)}
            />
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالة..."
              maxLength={500}
              className="flex-1 bg-secondary rounded-full px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            if (host) openGiftFor(roomData?.host_id, host.display_name);
          }} className="w-14 h-14 rounded-full gradient-gold glow-gold flex items-center justify-center animate-float">
            <Gift className="w-6 h-6 text-accent-foreground" />
          </button>
          <button
            onClick={() => navigate("/inventory")}
            className="w-12 h-12 rounded-full bg-secondary/60 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-secondary/80 transition-colors"
            aria-label="الحقيبة"
          >
            <Package className="w-5 h-5 text-foreground" />
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
        roomMembers={members.map(m => ({
          user_id: m.user_id,
          display_name: m.profile?.display_name || "User",
          avatar_url: m.profile?.avatar_url || null,
        }))}
        onMultiGiftSent={handleGiftBurst}
        roomId={roomId || undefined}
      />
      <BossEntrance show={showBossEntrance} onComplete={handleBossEntranceComplete} />
      <CustomEntranceEffect roomId={roomId} currentUserId={currentUserId} queue={entranceQueue} onComplete={handleEntranceComplete} muteEntrance={muteEntrance} />
      <GiftComboBar count={comboCount} visible={comboCount >= 2} />
      <LuckyWheelButton />
    </div>
  );
};

export default VoiceRoom;
