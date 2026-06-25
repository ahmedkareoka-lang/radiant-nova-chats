import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Mic, MicOff, Gift, LogOut, Crown, MessageCircle, Send, Users, TrendingUp, Heart, X, Settings2, Volume2, Pin, UserMinus, Minimize2, Lock, Unlock, VolumeX, Trash2, Ban, Shield, BellOff, Package, Power, Home, MoreHorizontal, Grid2x2, Gamepad2, Swords, Smile, Trophy, ChevronLeft, CloudRain } from "lucide-react";

import HostIncomeCounter from "@/components/HostIncomeCounter";
import SupportCounter from "@/components/SupportCounter";
import PKChallenge from "@/components/PKChallenge";
import CoupleSeats from "@/components/CoupleSeats";
import CouplePickerModal from "@/components/CouplePickerModal";
import GlobalWinTicker from "@/components/GlobalWinTicker";
import { useActiveRoom } from "@/contexts/ActiveRoomContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import GiftAnimation from "@/components/GiftAnimation";
import InventorySheet from "@/components/InventorySheet";
import VipBadge from "@/components/VipBadge";
import DualBadge from "@/components/DualBadge";
import VipName from "@/components/VipName";
import BossEntrance from "@/components/BossEntrance";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useAgoraVoiceState } from "@/contexts/AgoraVoiceProvider";
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

import FullscreenGiftEffect from "@/components/FullscreenGiftEffect";
import { FRAME_MAP, FRAME_ANIMATION, bossFrame } from "@/lib/frameConfig";
import FramedAvatar from "@/components/FramedAvatar";
import { useRechargeAgentSet } from "@/hooks/useRechargeAgentSet";
import { useBDSet } from "@/hooks/useBDSet";
import BDBadge from "@/components/BDBadge";
import RechargeAgentBadge from "@/components/RechargeAgentBadge";
import { logAgora } from "@/lib/agoraDebugLog";
import AIRoomAssistant from "@/components/AIRoomAssistant";
import NeonCoinStorm from "@/components/NeonCoinStorm";
import MicTurfWar from "@/components/MicTurfWar";
import { Zap } from "lucide-react";
import TranslatedMessage from "@/components/TranslatedMessage";
import RoomUserProfileCard from "@/components/RoomUserProfileCard";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useRoomFollows } from "@/hooks/useRoomFollows";
import { Star } from "lucide-react";

import { useLanguage } from "@/i18n/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const { members, messages, roomData, currentUserId, joinRoom, leaveRoom, sendMessage, toggleMic, updateMicSlot, fetchMembers, clearChat } = useVoiceRoom(roomId);
  const { t, locale } = useLanguage();
  const rechargeAgentSet = useRechargeAgentSet();
  const bdSet = useBDSet();
  const mediaUpload = useMediaUpload();
  const { followed: followedFollows, pending: pendingFollows, follow: followRoom, unfollow: unfollowRoom } = useRoomFollows();
  const isFollowing = !!roomId && followedFollows.some(f => f.room_id === roomId);
  const isFollowPending = !!roomId && pendingFollows.some(f => f.room_id === roomId);
  const handleToggleFollow = async () => {
    if (!roomId) return;
    try {
      if (isFollowing || isFollowPending) {
        await unfollowRoom(roomId);
        toast.success("تم إلغاء المتابعة");
      } else {
        const status = await followRoom(roomId);
        toast.success(status === "pending" ? "تم إرسال طلب المتابعة 🔐" : "تمت المتابعة ⭐");
      }
    } catch (e: any) {
      toast.error(e?.message === "cannot_follow_own_room" ? "لا يمكنك متابعة غرفتك" : "تعذّر تنفيذ الإجراء");
    }
  };


  // Mic muted state lives in the global Agora provider so it survives navigation
  const { isMuted, setIsMuted, connectedPeers, speakingPeers, localSpeaking, audioBlocked, unlockAudio } = useAgoraVoiceState();
  const [showGifts, setShowGifts] = useState(false);
  const [showCoinStorm, setShowCoinStorm] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [giftReceiverId, setGiftReceiverId] = useState<string | null>(null);
  const [giftReceiverName, setGiftReceiverName] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showBossEntrance, setShowBossEntrance] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showQuickOptions, setShowQuickOptions] = useState(false);
  const [showChatInput, setShowChatInput] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<string | null>(null);
  const [giftBurst, setGiftBurst] = useState<{ emoji: string; count: number; imageUrl?: string | null } | null>(null);
  type FullscreenGiftItem = { id: string; emoji: string; giftName: string; imageUrl: string | null; lottieUrl?: string | null; videoUrl?: string | null; senderName: string; recipientName: string; amount: number; timestamp: number; durationMs?: number };
  // Currently displayed fullscreen gift + waiting queue (FIFO).
  // Prevents overlapping/cut-short animations when multiple gifts arrive in burst.
  const [fullscreenGift, setFullscreenGift] = useState<FullscreenGiftItem | null>(null);
  const giftQueueRef = useRef<FullscreenGiftItem[]>([]);
  const enqueueFullscreenGift = useCallback((g: FullscreenGiftItem) => {
    // Cap queue to avoid unbounded growth in extreme bursts.
    if (giftQueueRef.current.length >= 12) giftQueueRef.current.shift();
    setFullscreenGift((cur) => {
      if (!cur) return g;
      giftQueueRef.current.push(g);
      return cur;
    });
  }, []);
  const advanceFullscreenGift = useCallback(() => {
    const next = giftQueueRef.current.shift() || null;
    setFullscreenGift(next);
  }, []);
  const [giftToasts, setGiftToasts] = useState<{ id: string; emoji: string; imageUrl: string | null; senderName: string; recipientName: string; giftName: string; amount: number }[]>([]);
  // Last broadcasted gift (for "delivered to all" status panel)
  const [lastGift, setLastGift] = useState<{
    id: string;
    emoji: string;
    giftName: string;
    imageUrl: string | null;
    senderName: string;
    recipientName: string;
    amount: number;
    timestamp: number;
    delivered: boolean;
  } | null>(null);
  const [entranceBanner, setEntranceBanner] = useState<{
    name: string;
    wealthLevel: number;
    charismaLevel: number;
    effect: typeof ENTRANCE_EFFECTS[0];
  } | null>(null);
  const [entranceQueue, setEntranceQueue] = useState<{ id: string; displayName: string; avatarUrl: string | null; videoUrl: string | null; audioUrl: string | null; novaLevel?: number; vipLevel?: number }[]>([]);
  const [muteEntrance, setMuteEntrance] = useState(false);
  const [showCouplePicker, setShowCouplePicker] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const seenMemberIds = useRef<Set<string>>(new Set());
  const didInitialMemberSync = useRef(false);
  const didAnnounceJoin = useRef(false);

  // AI moderator state
  const [translationsEnabled, setTranslationsEnabled] = useState(false);
  // Confirmation dialog state for destructive admin actions
  const [confirmAction, setConfirmAction] = useState<
    | { type: "kick" | "ban" | "kickMic"; userId: string; name: string }
    | null
  >(null);

  // Current user profile
  const currentProfile = members.find(m => m.user_id === currentUserId)?.profile;
  const isBoss = currentProfile?.is_boss || false;
  const isHost = currentUserId === roomData?.host_id;

  // 🛡️ Room admins (assigned by host) — fetched from `room_admins` table
  const [roomAdminIds, setRoomAdminIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!roomId) return;
    const load = async () => {
      const { data } = await (supabase.from("room_admins" as any) as any)
        .select("user_id").eq("room_id", roomId);
      setRoomAdminIds(new Set((data || []).map((r: any) => r.user_id)));
    };
    load();
    const ch = supabase.channel(`room-admins-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_admins", filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);
  const isRoomAdmin = !!currentUserId && roomAdminIds.has(currentUserId);
  const isAdmin = isBoss || isHost || isRoomAdmin;

  const handleClearChat = async () => {
    if (!isAdmin) return;
    const res = await clearChat();
    if (res.ok) toast.success("تم مسح الدردشة للجميع 🧹");
    else toast.error("تعذّر مسح الدردشة");
  };

  const handleToggleFollowApproval = async () => {
    if (!isHost || !roomId) return;
    const cur = !!(roomData as any)?.follows_require_approval;
    const { error } = await (supabase.from("rooms") as any).update({ follows_require_approval: !cur }).eq("id", roomId);
    if (error) toast.error("فشل التحديث"); else toast.success(!cur ? "الغرفة خاصة: تتطلب الموافقة 🔐" : "الغرفة عامة: المتابعة مباشرة 🌍");
  };

  const handleAssignAdmin = async (uid: string) => {
    if (!roomId) return;
    const { error } = await (supabase.rpc as any)("assign_room_admin", { _room_id: roomId, _user_id: uid });
    if (error) toast.error("تعذّر التعيين"); else toast.success("تم تعيين الأدمن ✅");
  };
  const handleRemoveAdmin = async (uid: string) => {
    if (!roomId) return;
    const { error } = await (supabase.rpc as any)("remove_room_admin", { _room_id: roomId, _user_id: uid });
    if (error) toast.error("تعذّر الحذف"); else toast.success("تمت إزالة الأدمن");
  };


  // VIP6+ — auto-enable in-room translation (one-shot when profile loads)
  const didAutoTranslateInit = useRef(false);
  useEffect(() => {
    if (didAutoTranslateInit.current) return;
    const lvl = (currentProfile as any)?.vip_level ?? 0;
    const exp = (currentProfile as any)?.vip_expiry;
    const active = lvl >= 6 && exp && new Date(exp).getTime() > Date.now();
    if (active) {
      setTranslationsEnabled(true);
      didAutoTranslateInit.current = true;
    }
  }, [currentProfile]);

  // Determine if current user is on a mic
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isOnMic = currentMember?.mic_slot !== null && currentMember?.mic_slot !== undefined;

  // Room locked slots and muted users
  const lockedSlots: number[] = (roomData as any)?.locked_slots || [];
  const mutedUsers: string[] = (roomData as any)?.muted_users || [];

  // Agora state comes from the global provider — see line 110.

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

  // Auto-minimize on unmount unless the user explicitly left the room.
  // This keeps the floating bubble + room membership alive when they navigate
  // away to chat or to their profile, so others still see them as "LIVE".
  const leavingRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!leavingRef.current) {
        minimizeRoom();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Love Quest: report 1 shared minute every 60s while in this room.
  // Server checks that the caller has an active couple AND partner is also a member.
  useEffect(() => {
    if (!roomId || !currentUserId) return;
    const tick = () => {
      supabase.rpc("bump_couple_room_minutes" as any, { _room_id: roomId, _minutes: 1 }).then(() => {}, () => {});
    };
    const t = setInterval(tick, 60_000);
    // First ping after 30s so short visits still count
    const first = setTimeout(tick, 30_000);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [roomId, currentUserId]);

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
  // Shows for ALL newly-joined members (not just self) so everyone in the room sees joins.
  // The first sync after mount only marks existing members as "seen" — we don't replay
  // entrances for people who were already in the room when we joined.
  // We sort newcomers by joined_at to keep queue ordering deterministic across clients
  // (so two users joining simultaneously appear in the same order on every device).
  // Track when this client mounted, to distinguish "already in room" vs "joined after me"
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (members.length === 0) return;

    // Initial sync: mark members who joined BEFORE we mounted as already seen,
    // so we don't replay their entrances. Members who joined within a small window
    // around mount time (including ourselves) are treated as fresh joiners.
    if (!didInitialMemberSync.current) {
      didInitialMemberSync.current = true;
      const FRESH_WINDOW_MS = 8000; // anyone joined within 8s of our mount = fresh
      for (const m of members) {
        const joinedAt = (m as any).joined_at ? new Date((m as any).joined_at).getTime() : 0;
        const isFresh = joinedAt >= mountTimeRef.current - FRESH_WINDOW_MS;
        if (!isFresh) {
          seenMemberIds.current.add(m.user_id);
        }
      }
      // Fall through so fresh members (including self) get an entrance
    }

    // Collect newcomers, then sort by joined_at to enforce a stable global order
    const newcomers = members
      .filter(m => !seenMemberIds.current.has(m.user_id) && m.profile)
      .sort((a, b) => {
        const ta = (a as any).joined_at ? new Date((a as any).joined_at).getTime() : 0;
        const tb = (b as any).joined_at ? new Date((b as any).joined_at).getTime() : 0;
        return ta - tb;
      });

    if (newcomers.length === 0) return;

    const additions: typeof entranceQueue = [];
    for (const m of newcomers) {
      seenMemberIds.current.add(m.user_id);

      const wealthLvl = m.profile!.wealth_level || 1;
      const charismaLvl = m.profile!.charisma_level || 1;
      const effect = getEntranceEffect(wealthLvl, charismaLvl);

      // Top entrance banner — only for SELF (so it doesn't spam others)
      if (m.user_id === currentUserId) {
        setEntranceBanner({
          name: m.profile!.display_name,
          wealthLevel: wealthLvl,
          charismaLevel: charismaLvl,
          effect,
        });
        setTimeout(() => setEntranceBanner(null), 4000);
      }

      const p = m.profile as any;
      const entranceMedia = p.equipped_entrance_effect || p.entrance_video_url || null;
      additions.push({
        id: `entrance-${m.user_id}-${(m as any).joined_at || ""}`,
        displayName: m.profile!.display_name,
        avatarUrl: m.profile!.avatar_url,
        videoUrl: entranceMedia,
        audioUrl: p.entrance_audio_url || null,
        vipLevel: m.profile!.vip_level || 0,
      });
    }

    if (additions.length > 0) {
      setEntranceQueue(prev => {
        // De-dup by id to guard against React StrictMode double-effects / reconnects
        const existingIds = new Set(prev.map(e => e.id));
        const fresh = additions.filter(a => !existingIds.has(a.id));
        return [...prev, ...fresh];
      });
    }
  }, [members, currentUserId]);

  // Announce SELF joining via a system chat message — broadcast to every room member via realtime.
  // Idempotent: we tag the content with a hidden marker `[[JOIN:<uid>]]` so even if the effect
  // re-runs (StrictMode / reconnects), we won't insert a duplicate row for the same user/room.
  useEffect(() => {
    if (didAnnounceJoin.current) return;
    if (!roomId || !currentUserId) return;
    const me = members.find(m => m.user_id === currentUserId);
    if (!me?.profile) return;

    const joinMarker = `[[JOIN:${currentUserId}]]`;

    // If a join message for me already exists in the loaded chat, don't insert again
    const alreadyAnnounced = messages.some(
      msg => msg.sender_id === currentUserId && msg.content.includes(joinMarker)
    );
    if (alreadyAnnounced) {
      didAnnounceJoin.current = true;
      return;
    }

    didAnnounceJoin.current = true;
    supabase.from("messages").insert({
      sender_id: currentUserId,
      room_id: roomId,
      // Marker is stripped on render; visible text is built from sender display_name + locale
      content: `${joinMarker} ${me.profile.display_name}`,
    });
  }, [members, currentUserId, roomId, messages]);

  const handleEntranceComplete = useCallback((id: string) => {
    setEntranceQueue(prev => prev.filter(e => e.id !== id));
  }, []);

  // 👑 VIP-switch entrance: when the user changes which VIP they wear (or my own
  // displayed VIP changes), replay a VIP entrance for them inside the room.
  const lastVipForUser = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (members.length === 0) return;
    const additions: typeof entranceQueue = [];
    for (const m of members) {
      const p = m.profile as any;
      if (!p) continue;
      const lvl = p.vip_level || 0;
      const prev = lastVipForUser.current.get(m.user_id);
      lastVipForUser.current.set(m.user_id, lvl);
      // Skip first observation (we don't want to replay on initial sync)
      if (prev === undefined) continue;
      if (prev === lvl) continue;
      if (lvl < 1) continue;
      additions.push({
        id: `vip-switch-${m.user_id}-${lvl}-${Date.now()}`,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        videoUrl: null,
        audioUrl: null,
        vipLevel: lvl,
      });
    }
    if (additions.length > 0) {
      setEntranceQueue(prev => [...prev, ...additions]);
    }
  }, [members]);



  // Auto-dismiss the "last gift delivered" panel after 8s of inactivity.
  useEffect(() => {
    if (!lastGift) return;
    const t = setTimeout(() => setLastGift(null), 8000);
    return () => clearTimeout(t);
  }, [lastGift]);

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput("");
  };

  const handleToggleMic = async () => {
    setIsMuted(prev => !prev);
  };

  const handleLeave = async () => {
    leavingRef.current = true;
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

  // Admin: Kick user from mic (SECURITY DEFINER bypasses room_members RLS)
  const handleKickFromMic = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    const { error } = await supabase.rpc("admin_kick_from_mic" as any, {
      _room_id: roomId, _target_user: userId,
    });
    if (error) {
      if (error.message?.includes("vip_protected")) {
        toast.error("🛡️ هذا العضو محمي بـ VIP 5+ — لا يمكن إنزاله من المايك");
      } else {
        toast.error("تعذر إنزال المستخدم: " + error.message);
      }
      return;
    }
    fetchMembers();
    toast.success("تم إنزال المستخدم من المايك");
    setSelectedProfile(null);
  };

  // Admin: Kick user from room
  const handleKickUser = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    const { error } = await supabase.rpc("admin_kick_user" as any, {
      _room_id: roomId, _target_user: userId,
    });
    if (error) {
      if (error.message?.includes("vip_protected")) {
        toast.error("🛡️ هذا العضو محمي بـ VIP 5+ — لا يمكن طرده");
      } else {
        toast.error("تعذر طرد المستخدم: " + error.message);
      }
      return;
    }
    fetchMembers();
    toast.success("تم طرد المستخدم من الغرفة 🚫");
    setSelectedProfile(null);
  };

  // Admin: Ban user from room
  const handleBanUser = async (userId: string) => {
    if (!roomId || !isAdmin || !currentUserId) return;
    const { error: bErr } = await supabase.from("room_bans").insert({ room_id: roomId, user_id: userId, banned_by: currentUserId } as any);
    if (bErr) { toast.error("تعذر الحظر: " + bErr.message); return; }
    await supabase.rpc("admin_kick_user" as any, { _room_id: roomId, _target_user: userId });
    fetchMembers();
    toast.success("تم حظر المستخدم من الغرفة ⛔");
    setSelectedProfile(null);
  };

  // Admin: Toggle force-mute (atomic via RPC, host or BOSS)
  const handleMuteUser = async (userId: string) => {
    if (!roomId || !isAdmin) return;
    const { data: nowMuted, error } = await supabase.rpc("admin_toggle_mute_user" as any, {
      _room_id: roomId, _target_user: userId,
    });
    if (error) { toast.error("تعذر الكتم: " + error.message); return; }
    toast.success(nowMuted ? "تم كتم المستخدم 🔇" : "تم إلغاء كتم المستخدم");
    setSelectedProfile(null);
  };

  // Admin: Mute all users on mic
  const handleMuteAll = async () => {
    if (!roomId || !isAdmin) return;
    const onMicUsers = members.filter(m => m.is_on_mic && m.user_id !== currentUserId).map(m => m.user_id);
    const updated = [...new Set([...(mutedUsers || []), ...onMicUsers])];
    const { error } = await supabase.from("rooms").update({ muted_users: updated } as any).eq("id", roomId);
    if (error) { toast.error("تعذر كتم الكل: " + error.message); return; }
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

    const existing = members.find((m) => m.user_id === currentUserId);

    // Leaving current slot
    if (existing?.mic_slot === slotIndex) {
      await updateMicSlot(null, false);
      setIsMuted(true);
      toast.success("نزلت من المايك");
      return;
    }

    // Make sure we're a member of the room before sitting (RLS / FK guard)
    if (!existing) {
      await joinRoom();
    }

    // Quick client-side check: is the slot taken by someone else?
    const slotTaken = members.find((m) => m.mic_slot === slotIndex && m.user_id !== currentUserId);
    if (slotTaken) {
      toast.error("هذا المايك مشغول");
      return;
    }

    // Server-side validation (banned / locked / muted / out-of-range)
    const { data: canAccess, error: vErr } = await supabase.rpc("validate_mic_access", {
      _user_id: currentUserId,
      _room_id: roomId,
      _slot: slotIndex,
    });

    if (vErr) {
      console.error("validate_mic_access error", vErr);
    }

    if (canAccess === false) {
      toast.error("لا يمكنك الجلوس على هذا المايك");
      return;
    }

    if (existing?.mic_slot !== null && existing?.mic_slot !== undefined) {
      await updateMicSlot(null, false);
    }

    const { error: upErr } = await (supabase
      .from("room_members")
      .upsert(
        { room_id: roomId, user_id: currentUserId, mic_slot: slotIndex, is_on_mic: true },
        { onConflict: "room_id,user_id" }
      ) as any);
    if (upErr) {
      console.error("sit-on-mic upsert error", upErr);
      toast.error("تعذر الجلوس على المايك");
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

  // Persistent gift broadcast channel for the room.
  // self:true so the sender also receives via the same path → guarantees every
  // user in the room (including the sender) sees the same fullscreen gift.
  const giftChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`room-gifts-${roomId}`, {
      config: { broadcast: { self: true, ack: true } },
    })
      .on("broadcast", { event: "gift-sent" }, (payload) => {
        const { emoji, imageUrl, lottieUrl, videoUrl, amount, giftName, senderName, recipientName, durationMs } = payload.payload;
        logAgora("success", "Gift", `← received '${giftName}' from ${senderName}`, { amount, recipientName });
        const id = `${Date.now()}-${Math.random()}`;
        enqueueFullscreenGift({
          id,
          emoji: emoji || "🎁",
          giftName: giftName || "هدية",
          imageUrl: imageUrl || null,
          lottieUrl: lottieUrl || null,
          videoUrl: videoUrl || null,
          senderName: senderName || "مستخدم",
          recipientName: recipientName || "مستخدم",
          amount: amount || 100,
          timestamp: Date.now(),
          durationMs: durationMs,
        });
        // Update "last gift delivered" panel — receiving the broadcast is the
        // strongest possible proof of delivery to all room members.
        setLastGift({
          id,
          emoji: emoji || "🎁",
          giftName: giftName || "هدية",
          imageUrl: imageUrl || null,
          senderName: senderName || "مستخدم",
          recipientName: recipientName || "مستخدم",
          amount: amount || 0,
          timestamp: Date.now(),
          delivered: true,
        });
        const toastId = `toast-${id}`;
        setGiftToasts(prev => [...prev, {
          id: toastId,
          emoji: emoji || "🎁",
          imageUrl: imageUrl || null,
          senderName: senderName || "مستخدم",
          recipientName: recipientName || "مستخدم",
          giftName: giftName || "هدية",
          amount: amount || 0,
        }]);
        // Toast duration scales with gift tier so big gifts linger in chat
        const toastMs = amount >= 100000 ? 12000 : amount >= 10000 ? 9000 : amount >= 1000 ? 6500 : 5000;
        setTimeout(() => {
          setGiftToasts(prev => prev.filter(t => t.id !== toastId));
        }, toastMs);
      })
      .subscribe((status) => {
        logAgora(status === "SUBSCRIBED" ? "success" : "info", "Gift", `gift channel status: ${status}`, { roomId });
      });
    giftChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      giftChannelRef.current = null;
      logAgora("info", "Gift", "gift channel removed", { roomId });
    };
  }, [roomId]);

  // Broadcast a gift to ALL users currently in this room (including self).
  // Provides IMMEDIATE feedback to the sender (no need to wait for the
  // listener round-trip) by:
  //   1) Optimistically setting `lastGift` with delivered=false
  //   2) Showing a toast based on the channel ACK from Realtime
  //   3) Listener (above) will then flip delivered=true on echo
  const broadcastGiftToRoom = useCallback(async (payload: any) => {
    const ch = giftChannelRef.current;
    // Optimistic "sending" state for the sender
    const optimisticId = `opt-${Date.now()}-${Math.random()}`;
    setLastGift({
      id: optimisticId,
      emoji: payload?.emoji || "🎁",
      giftName: payload?.giftName || "هدية",
      imageUrl: payload?.imageUrl || null,
      senderName: payload?.senderName || "مستخدم",
      recipientName: payload?.recipientName || "مستخدم",
      amount: payload?.amount || 0,
      timestamp: Date.now(),
      delivered: false,
    });
    if (!ch) {
      logAgora("error", "Gift", "broadcast skipped — no active room channel", { roomId });
      toast.error("تعذّر بث الهدية — أعد المحاولة");
      return;
    }
    try {
      const ack = await ch.send({ type: "broadcast", event: "gift-sent", payload });
      logAgora(ack === "ok" ? "success" : "error", "Gift", `broadcast ack: ${ack}`, { giftName: payload?.giftName });
      if (ack === "ok") {
        toast.success("✅ تم بث الهدية لكل أعضاء الغرفة");
      } else {
        toast.warning("⚠️ لم يتأكد البث — قد لا يصل الجميع");
      }
    } catch (err: any) {
      logAgora("error", "Gift", `broadcast threw: ${err?.message || err}`);
      toast.error("فشل بث الهدية");
    }
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

  // Stable, fixed grid configuration for 0–20 mics — no shake, no overlap between rows.
  // Columns are predetermined per range so layout never reflows mid-session.
  const gridCols =
    micCount <= 4 ? "grid-cols-2"
    : micCount <= 9 ? "grid-cols-3"
    : micCount <= 16 ? "grid-cols-4"
    : "grid-cols-5";
  // Avatar size scales down predictably so a row never overflows on 428px viewports.
  // Reduced sizes to give more vertical space to the chat panel.
  const micAvatarPx =
    micCount <= 6 ? 70
    : micCount <= 9 ? 60
    : micCount <= 12 ? 54
    : micCount <= 16 ? 48
    : 44;
  // Vertical gap is intentionally large so the small support badge under one mic
  // never visually touches the avatar of the row below.
  const micGapClass =
    micCount <= 6 ? "gap-x-4 gap-y-5"
    : micCount <= 9 ? "gap-x-3 gap-y-5"
    : micCount <= 12 ? "gap-x-2.5 gap-y-4"
    : "gap-x-2 gap-y-4";

  // Helper: speaking animation
  const SpeakingWaves = () => (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 rounded-full border-2 border-green-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
      <div className="absolute inset-[-3px] rounded-full border-2 border-green-400/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
    </div>
  );

  // Helper to render avatar with frame — uses central FramedAvatar so the
  // inner avatar size adapts to each frame's transparent center.
  const renderAvatarWithFrame = (
    avatarUrl: string | null,
    equippedFrame: string | null | undefined,
    isBossUser: boolean,
    size: "sm" | "md" | "lg" | number = "md",
    isSpeaking: boolean = false,
    isRechargeAgent: boolean = false,
    isBD: boolean = false,
    vipLevel: number = 0,
  ) => {
    const sizePx = typeof size === "number"
      ? size
      : size === "sm" ? 96 : size === "lg" ? 132 : 112;
    return (
      <FramedAvatar
        avatarUrl={avatarUrl}
        equippedFrame={equippedFrame}
        isRechargeAgent={isRechargeAgent}
        isBD={isBD}
        vipLevel={vipLevel}
        size={sizePx}
        ringClassName={isSpeaking ? "ring-2 ring-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]" : "ring-2 ring-border"}
        behind={isSpeaking ? <SpeakingWaves /> : null}
      />
    );
  };

  const currentTheme = ROOM_THEMES.find(t => t.id === (roomData?.background_theme || 'default')) || ROOM_THEMES[0];

  const changeTheme = async (themeId: string) => {
    if (!roomId) return;
    await supabase.from("rooms").update({ background_theme: themeId } as any).eq("id", roomId);
    toast.success("تم تغيير خلفية الغرفة ✨");
  };

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] flex flex-col ${currentTheme.bg} transition-all duration-700 relative overflow-hidden`}
      style={{ touchAction: "pan-x" }}
    >
      {/* Soft animated luxury backdrop (drifting orbs + sparkles) */}
      <VoiceRoomBackdrop backgroundUrl={(roomData as any)?.background_url} />
      {/* Animated Particles */}
      <RoomParticles theme={currentTheme.id} />

      {/* Tap-to-enable audio overlay (iOS / Android autoplay policy) */}
      {audioBlocked && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={unlockAudio}
          onTouchEnd={unlockAudio}
        >
          <div className="flex flex-col items-center gap-4 px-6 py-8 rounded-3xl bg-card/90 border border-primary/30 shadow-2xl max-w-xs text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Volume2 className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-foreground">اضغط لتفعيل الصوت</h3>
            <p className="text-sm text-muted-foreground">
              المتصفح يحتاج إلى لمسة منك لتشغيل الصوت
            </p>
            <button className="mt-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold">
              تفعيل الصوت
            </button>
          </div>
        </div>
      )}

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
        onComplete={advanceFullscreenGift}
      />

      {/* Last Gift Delivered Panel — shows the most recent gift broadcasted in
          the room with a clear "delivered to all" status. Helps the sender (and
          everyone) confirm the gift reached the entire room. */}
      <AnimatePresence>
        {lastGift && (
          <motion.div
            key={lastGift.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-20 right-3 z-[75] max-w-[260px] rounded-2xl bg-card/90 backdrop-blur-xl border border-primary/40 shadow-[0_4px_24px_hsl(var(--primary)/0.35)] p-3 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-2">
              {lastGift.imageUrl ? (
                <img loading="lazy" decoding="async" src={lastGift.imageUrl} alt="" className="w-10 h-10 object-contain shrink-0" />
              ) : (
                <span className="text-2xl shrink-0">{lastGift.emoji}</span>
              )}
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[11px] font-bold text-foreground truncate">{lastGift.giftName}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  <span className="text-primary">{lastGift.senderName}</span>
                  <span> → </span>
                  <span className="text-accent">{lastGift.recipientName}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">💰 {lastGift.amount.toLocaleString()}</p>
              </div>
            </div>
            <div
              className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-full ${
                lastGift.delivered
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {lastGift.delivered ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  ✅ تم التوزيع للجميع
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-ping" />
                  ⏳ جارٍ البث...
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top text notifications for every gift sent in the room */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 items-center pointer-events-none w-full max-w-lg px-3">
        <AnimatePresence>
          {giftToasts.map((t) => {
            const tierStyle = t.amount >= 100000
              ? { ring: "ring-2 ring-yellow-300/70", glow: "shadow-[0_0_40px_hsl(45_100%_55%/0.7)]", chip: "from-yellow-400 to-orange-500", label: "أسطورية خارقة" }
              : t.amount >= 10000
              ? { ring: "ring-2 ring-orange-400/60", glow: "shadow-[0_0_32px_hsl(25_100%_55%/0.55)]", chip: "from-orange-400 to-pink-500", label: "أسطورية" }
              : t.amount >= 1000
              ? { ring: "ring-2 ring-fuchsia-400/60", glow: "shadow-[0_0_24px_hsl(280_90%_60%/0.5)]", chip: "from-fuchsia-500 to-purple-600", label: "ملحمية" }
              : { ring: "ring-1 ring-accent/50", glow: "shadow-[0_0_18px_hsl(var(--accent)/0.4)]", chip: "from-accent to-primary", label: "هدية" };
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -40, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: "spring", damping: 16, stiffness: 220 }}
                className={`w-full rounded-2xl px-3 py-2.5 flex items-center gap-3 backdrop-blur-xl bg-card/85 border border-accent/40 ${tierStyle.glow}`}
              >
                <div className={`relative shrink-0 w-20 h-20 rounded-2xl ${tierStyle.ring} bg-gradient-to-br from-background/60 to-background/20 flex items-center justify-center overflow-hidden`}>
                  {/* Soft halo behind the gift */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${tierStyle.chip} opacity-20`} aria-hidden="true" />
                  {t.imageUrl ? (
                    <img
                      src={t.imageUrl}
                      alt={t.giftName}
                      loading="eager"
                      decoding="async"
                      draggable={false}
                      className="relative w-[88%] h-[88%] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                      style={{ imageRendering: "auto", background: "transparent" }}
                    />
                  ) : (
                    <span className="relative text-4xl leading-none">{t.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[13px] font-bold text-foreground truncate">
                    <span className="text-primary">{t.senderName}</span>
                    <span className="text-muted-foreground"> أهدى </span>
                    <span className="text-accent">{t.recipientName}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    🎁 {t.giftName} • 💰 {t.amount.toLocaleString()}
                  </p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${tierStyle.chip}`}>
                    {tierStyle.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
                <img loading="lazy" decoding="async" src={giftBurst.imageUrl}
                  alt="gift"
                  className="w-52 h-52 object-contain drop-shadow-[0_0_40px_rgba(255,200,80,0.8)]"
                  style={{ background: "transparent" }} />
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
                  <img loading="lazy" decoding="async" src={giftBurst.imageUrl} alt="" className="w-16 h-16 object-contain" style={{ background: "transparent" }} />
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
        <RoomUserProfileCard
          profile={selectedProfile as any}
          isHostOfRoom={selectedProfile.user_id === roomData?.host_id}
          isBD={bdSet.has(selectedProfile.user_id)}
          isRechargeAgent={rechargeAgentSet.has(selectedProfile.user_id)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          viewerIsHost={isHost}
          targetIsRoomAdmin={roomAdminIds.has(selectedProfile.user_id)}
          onAssignAdmin={() => handleAssignAdmin(selectedProfile.user_id)}
          onRemoveAdmin={() => handleRemoveAdmin(selectedProfile.user_id)}
          isOnMic={
            members.find(m => m.user_id === selectedProfile.user_id)?.mic_slot !== null &&
            members.find(m => m.user_id === selectedProfile.user_id)?.mic_slot !== undefined
          }
          muted={mutedUsers.includes(selectedProfile.user_id)}
          onClose={() => setSelectedProfile(null)}
          onSendGift={() => { setSelectedProfile(null); openGiftFor(selectedProfile.user_id, selectedProfile.display_name); }}
          onOpenFullProfile={() => { setSelectedProfile(null); navigate(`/user?id=${selectedProfile.user_id}`); }}
          onMute={() => handleMuteUser(selectedProfile.user_id)}
          onKick={() => setConfirmAction({ type: "kick", userId: selectedProfile.user_id, name: selectedProfile.display_name })}
          onBan={() => setConfirmAction({ type: "ban", userId: selectedProfile.user_id, name: selectedProfile.display_name })}
          onKickFromMic={() => setConfirmAction({ type: "kickMic", userId: selectedProfile.user_id, name: selectedProfile.display_name })}
        />

      )}

      {/* Settings Modal */}
      {showSettings && isHost && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-end justify-center" onClick={() => setShowSettings(false)}>
          <div className="card-nova p-4 max-w-lg w-full rounded-t-3xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
            <h3 className="font-bold text-sm text-center">⚙️ إعدادات الغرفة</h3>

            {/* Edit Room Name + Avatar + Custom Background (host only) */}
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

              {/* Room avatar (shows on home page room cards) */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold">صورة الغرفة (تظهر للجميع)</span>
                <label className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold cursor-pointer">
                  📷 تغيير الصورة
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f || !roomId) return;
                      if (f.size > 5 * 1024 * 1024) { toast.error("الصورة أكبر من 5MB"); return; }
                      const url = await mediaUpload.upload({ file: f, fileType: "image", folder: `rooms/${roomId}/avatar` });
                      if (!url) return;
                      const { error } = await supabase.from("rooms").update({ room_image: url }).eq("id", roomId);
                      if (error) { toast.error("فشل التحديث"); return; }
                      toast.success("تم تحديث صورة الغرفة ✅");
                    }}
                  />
                </label>
              </div>

              {/* Custom background image */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold">خلفية مخصصة للغرفة</span>
                <div className="flex gap-2">
                  {(roomData as any)?.background_url && (
                    <button
                      onClick={async () => {
                        if (!roomId) return;
                        await supabase.from("rooms").update({ background_url: null } as any).eq("id", roomId);
                        toast.success("تمت إزالة الخلفية");
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-destructive/20 text-destructive text-[10px] font-bold"
                    >إزالة</button>
                  )}
                  <label className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-[10px] font-bold cursor-pointer">
                    🖼️ رفع خلفية
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f || !roomId) return;
                        if (f.size > 8 * 1024 * 1024) { toast.error("الصورة أكبر من 8MB"); return; }
                        const url = await mediaUpload.upload({ file: f, fileType: "image", folder: `rooms/${roomId}/bg` });
                        if (!url) return;
                        const { error } = await supabase.from("rooms").update({ background_url: url } as any).eq("id", roomId);
                        if (error) { toast.error("فشل التحديث"); return; }
                        toast.success("تم تحديث خلفية الغرفة ✨");
                      }}
                    />
                  </label>
                </div>
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

            {/* Follow approval mode */}
            <div className="flex items-center justify-between bg-secondary/50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">متابعة الغرفة</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(roomData as any)?.follows_require_approval ? "خاص: تتطلب موافقتك" : "عام: أي شخص يتابع"}
                  </span>
                </div>
              </div>
              <button onClick={handleToggleFollowApproval}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${(roomData as any)?.follows_require_approval ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground border border-border"}`}>
                {(roomData as any)?.follows_require_approval ? "🔐 خاص" : "🌍 عام"}
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

      {/* Header — pixel-matched to reference: power/home/dots left, agency badge right, then top3+level+timer+rank row */}
      <header
        className="relative z-30 shrink-0 px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2"
      >
        {/* Top row: controls + agency */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Power = exit room with confirmation */}
            <button
              onClick={handleLeave}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition"
              title="خروج من الغرفة"
            >
              <Power className="w-4 h-4" />
            </button>
            {/* Home = minimize and go home */}
            <button
              onClick={() => { handleMinimize(); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition"
              title="الرئيسية"
            >
              <Home className="w-4 h-4" />
            </button>
            {/* Three dots: opens action menu (exit / minimize / settings) */}
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu((v) => !v)}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition"
                title="المزيد"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showHeaderMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowHeaderMenu(false)} />
                  <div className="absolute top-11 left-0 z-[61] min-w-[180px] rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
                    <button
                      onClick={() => { setShowHeaderMenu(false); handleMinimize(); }}
                      className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2"
                    >
                      <Minimize2 className="w-3.5 h-3.5" /> تصغير الغرفة
                    </button>
                    {isHost && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); setShowSettings(true); }}
                        className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2 border-t border-border/50"
                      >
                        <Settings2 className="w-3.5 h-3.5" /> تعديل الغرفة
                      </button>
                    )}
                    <button
                      onClick={() => { setShowHeaderMenu(false); setMuteEntrance(!muteEntrance); }}
                      className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2 border-t border-border/50"
                    >
                      <BellOff className="w-3.5 h-3.5" /> {muteEntrance ? "تفعيل أصوات الدخول" : "كتم أصوات الدخول"}
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); handleClearChat(); }}
                        className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2 border-t border-border/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> مسح الدردشة للجميع
                      </button>
                    )}
                    <button
                      onClick={() => { setShowHeaderMenu(false); handleLeave(); }}
                      className="w-full px-4 py-2.5 text-right text-xs font-black text-destructive hover:bg-destructive/15 flex items-center gap-2 border-t border-border/50"
                    >
                      <LogOut className="w-3.5 h-3.5" /> خروج من الغرفة
                    </button>
                  </div>
                </>
              )}
            </div>
            {/* Top 3 contributors avatars next to controls */}
            {roomData?.host_id && roomId && (
              <div className="ml-1 scale-[0.78] origin-left">
                <Top3RoomSenders roomId={roomId} hostId={roomData.host_id} />
              </div>
            )}
          </div>

          {/* Agency info badge — right */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10 max-w-[55%]">
            <div className="flex flex-col items-end leading-tight min-w-0">
              <span className="text-[11px] font-black text-amber-300 truncate max-w-[140px]">
                {(roomData as any)?.agency_name || roomData?.name || "الغرفة"}
              </span>
              <span className="text-[9px] font-mono text-white/70 truncate">
                ID {roomData?.id?.slice(0, 9) || "—"}
              </span>
            </div>
            {host?.avatar_url && (
              <img src={host.avatar_url} alt="" loading="lazy" decoding="async" className="w-7 h-7 rounded-md object-cover ring-1 ring-amber-400/60" />
            )}
          </div>
        </div>

        {/* Sub-row: Level badge + timer + Daily TOP rank */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/40 backdrop-blur border border-amber-400/30 min-w-0">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] font-black text-amber-200">LV.{(roomData as any)?.level || 1}</span>
              <div className="w-20 h-1 rounded-full bg-white/15 overflow-hidden mt-0.5">
                <div className="h-full bg-gradient-to-r from-amber-300 to-orange-500" style={{ width: `${Math.min(100, (((roomData as any)?.level_progress ?? 0) * 100))}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur border border-white/10">
            <Star className="w-3 h-3 text-amber-300" />
            <span className="text-[10px] font-bold text-white tabular-nums">
              {members.length} متصل
            </span>
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-bold text-emerald-300">LIVE</span>
          </div>
          <button className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur border border-white/10 text-white">
            <Trophy className="w-3 h-3 text-amber-300" />
            <span className="text-[10px] font-bold">TOP اليومي</span>
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        {/* Inline follow button — non-host only */}
        {!isHost && roomId && (
          <div className="mt-1.5 flex justify-end">
            <button
              onClick={handleToggleFollow}
              className={`h-6 px-2.5 rounded-full flex items-center gap-1 text-[10px] font-black ${isFollowing ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black" : isFollowPending ? "bg-secondary text-muted-foreground" : "bg-black/40 text-white border border-white/15"}`}
            >
              <Star className={`w-3 h-3 ${isFollowing ? "fill-current" : ""}`} />
              {isFollowing ? "متابَع" : isFollowPending ? "قيد الانتظار" : "تابع الغرفة"}
            </button>
          </div>
        )}
      </header>

      {/* Global Win Ticker */}
      <GlobalWinTicker />

      {/* Big Gift Announcement Banner — hidden while fullscreen gift is playing to avoid duplicate */}
      {roomId && !fullscreenGift && <GiftAnnouncementBanner roomId={roomId} />}

      {/* Treasure Box (auto-trigger at 300K daily room support) */}
      {roomId && <TreasureBox roomId={roomId} isHost={isHost} currentUserId={currentUserId} />}

      {/* Voice Room Area — single-screen, no scroll, mic grid auto-fits */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden px-3 pt-1 pb-1 max-w-lg mx-auto w-full">
        {/* Compact PK + Couple row (auto-hides on tiny screens via overflow) */}
        <div className="shrink-0">
        {roomId && (
          <div className="mb-1.5 flex items-start gap-2">
            <div className="flex-1 min-w-0 scale-90 origin-top-left">
              <PKChallenge roomId={roomId} isHost={isHost} members={members} />
            </div>
            <div className="scale-90 origin-top-right">
              <MicTurfWar roomId={roomId} isHost={isHost} currentUserId={currentUserId} ourRoomName={roomData?.name || "غرفتنا"} />
            </div>
          </div>
        )}

        {/* Mic Grid — adaptive size & spacing, stable seats (no shake) */}
        <div className={`grid ${gridCols} ${micGapClass} mb-1.5 justify-items-center`}>



          {micSlots.map((slot, i) => {
            const isSlotLocked = lockedSlots.includes(i);
            const slotIsSpeaking = slot?.is_on_mic && (
              slot.user_id === currentUserId ? localSpeaking : speakingPeers.has(slot.user_id)
            );
            const isUserMuted = slot ? mutedUsers.includes(slot.user_id) : false;
            const emptySize = Math.round(micAvatarPx * 0.86);

            return (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ width: micAvatarPx + 12 }}
              >
                {slot ? (
                  <div
                    className="cursor-pointer relative flex flex-col items-center w-full"
                    onClick={() => handleAvatarClick({ user_id: slot.user_id, profile: slot.profile })}
                  >
                    {/* Stable seat: NO transform / scale / shake on the avatar wrapper */}
                    <div className="relative" style={{ width: micAvatarPx, height: micAvatarPx }}>
                      {renderAvatarWithFrame(
                        slot.profile?.avatar_url || null,
                        (slot.profile as any)?.equipped_frame || null,
                        slot.profile?.is_boss || false,
                        micAvatarPx,
                        !!slotIsSpeaking && !isUserMuted,
                        rechargeAgentSet.has(slot.user_id),
                        bdSet.has(slot.user_id),
                        (slot.profile as any)?.vip_level || 0,
                      )}
                      {isUserMuted && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center z-20 ring-2 ring-background">
                          <VolumeX className="w-3 h-3 text-destructive-foreground" />
                        </div>
                      )}
                    </div>
                    {/* Username — full width of slot, single line, never covered by support badge */}
                    <span
                      className="text-[10px] truncate block text-center mt-1.5 leading-tight w-full px-0.5"
                    >
                      <VipName
                        name={slot.profile?.display_name || "User"}
                        level={(slot.profile as any)?.vip_level || 0}
                        size="sm"
                      />
                    </span>
                    {/* Compact diamond support icon — fixed-height row reserved so it cannot bleed onto the next row */}
                    <div className="h-[14px] flex items-center justify-center mt-0.5">
                      <SupportCounter userId={slot.user_id} sessionStart={roomData?.created_at || new Date().toISOString()} />
                    </div>
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
                      className={`rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                        isSlotLocked
                          ? "bg-destructive/10 border-destructive/40"
                          : "bg-secondary border-border hover:border-primary hover:bg-secondary/80"
                      }`}
                      style={{ width: emptySize, height: emptySize }}
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
        </div>
        {/* /top fixed region */}

        {/* Audience strip — viewers count + horizontal avatar bubbles */}
        {(() => {
          const audience = members.filter((m: any) => m.mic_slot === null || m.mic_slot === undefined);
          return (
            <div className="shrink-0 mb-1.5 flex items-center gap-2 rounded-2xl bg-black/35 backdrop-blur border border-white/10 px-2 py-1.5">
              <div className="shrink-0 min-w-[34px] h-7 px-2 rounded-lg bg-black/55 flex items-center justify-center text-white text-[11px] font-black tabular-nums border border-white/10">
                {audience.length}
              </div>
              <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5">
                {audience.slice(0, 24).map((m: any) => (
                  <button
                    key={m.user_id}
                    onClick={() => handleAvatarClick(m)}
                    className="shrink-0"
                    title={m.profile?.display_name}
                  >
                    <img
                      loading="lazy"
                      decoding="async"
                      src={m.profile?.avatar_url || "https://i.pravatar.cc/40"}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/30"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Chat — premium dark bubble panel, takes the remaining space */}
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-black/40 backdrop-blur-sm border border-white/10 overflow-hidden">
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <MessageCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-white/90">الدردشة الحية</span>
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

          <div className="space-y-2 flex-1 min-h-0 overflow-auto mb-2 px-3">
            {messages.map((msg) => {
              // System "join" message detection.
              // New format: "[[JOIN:<uid>]] DisplayName"
              // Legacy format: "🚪 Name انضم إلى الغرفة"
              const joinMatch = msg.content.match(/^\[\[JOIN:[^\]]+\]\]\s*(.+)$/);
              const isLegacyJoin = !joinMatch && msg.content.startsWith("🚪");
              const isSystemMsg = !!joinMatch || isLegacyJoin;
              const joinedName = joinMatch
                ? joinMatch[1].trim()
                : (msg.sender?.display_name || "");
              const isBossMsg = msg.sender?.is_boss;
              return (
                <div key={msg.id} className={`text-xs ${isSystemMsg ? "flex justify-center" : ""} group relative`}>
                  {isSystemMsg ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-accent/15 via-primary/10 to-accent/15 border border-accent/30 shadow-[0_0_12px_hsl(var(--accent)/0.25)] select-none"
                      // System messages are NOT editable: no admin pin/delete affordances rendered
                    >
                      <span className="text-accent text-sm leading-none" aria-hidden>🚪</span>
                      <span className="text-accent font-semibold text-[11px] tracking-wide">
                        {joinedName || msg.sender?.display_name}
                      </span>
                      <span className="text-accent/80 font-medium text-[11px]">
                        {t("room.system.joined")}
                      </span>
                    </motion.div>
                  ) : (
                    <div className={`${isBossMsg ? "bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-lg px-2 py-1 border border-accent/20" : ""}`}>
                      <span className="inline-flex items-center gap-1 align-middle mr-1">
                        <DualBadge vipLevel={msg.sender?.vip_level || 0} />
                      </span>
                      <span className={`font-bold ${isBossMsg ? "boss-fire-text" : "text-primary"}`}>
                        {isBossMsg ? (
                          <>👑 {msg.sender?.display_name || "User"}:{" "}</>
                        ) : (
                          <>
                            <VipName
                              name={msg.sender?.display_name || "User"}
                              level={msg.sender?.vip_level || 0}
                              size="sm"
                            />
                            {": "}
                          </>
                        )}
                      </span>
                      <span className={`${isBossMsg ? "text-accent font-semibold" : "text-foreground"}`}>{msg.content}</span>
                      {/* AI live translation */}
                      <TranslatedMessage text={msg.content} enabled={translationsEnabled} />
                      {/* Admin actions: Pin & Delete (system messages excluded above) */}
                      {isAdmin && (
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
          {showChatInput && (
            <div className="flex gap-2 items-center px-3 pb-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="اكتب رسالة..."
                maxLength={500}
                dir="auto"
                autoComplete="off"
                style={{ color: "hsl(var(--foreground))", caretColor: "hsl(var(--primary))", fontSize: "14px" }}
                className="flex-1 bg-white/10 backdrop-blur rounded-full px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-primary border border-white/10"
                autoFocus
              />
              <button onClick={handleSend} className="w-8 h-8 rounded-full gradient-neon flex items-center justify-center">
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Action Bar — pixel-matched to reference: gift, grid, gamepad, PK, chat, mic, emoji, more */}
      <div
        className="relative z-20 shrink-0 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]"
      >
        <div className="flex items-center justify-between gap-1.5 max-w-lg mx-auto">
          {/* Glowing pink gift */}
          <button
            onClick={() => { if (host) openGiftFor(roomData?.host_id, host.display_name); }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-rose-500 shadow-[0_0_18px_rgba(236,72,153,0.7)] flex items-center justify-center text-white active:scale-95 transition"
            aria-label="هدية"
          >
            <Gift className="w-5 h-5" />
          </button>
          {/* Multi-window grid (inventory) */}
          <button
            onClick={() => setShowInventory(true)}
            className="w-10 h-10 rounded-2xl bg-black/45 backdrop-blur border border-white/10 flex items-center justify-center text-white active:scale-95 transition"
            aria-label="الحقيبة"
          >
            <Grid2x2 className="w-5 h-5" />
          </button>
          {/* Gamepad */}
          <button
            onClick={() => navigate("/games")}
            className="w-10 h-10 rounded-2xl bg-black/45 backdrop-blur border border-white/10 flex items-center justify-center text-violet-300 active:scale-95 transition"
            aria-label="الألعاب"
          >
            <Gamepad2 className="w-5 h-5" />
          </button>
          {/* PK */}
          <button
            onClick={() => setShowCoinStorm(true)}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-fuchsia-600 shadow-[0_0_12px_rgba(99,102,241,0.6)] flex items-center justify-center text-white font-black text-[12px] active:scale-95 transition"
            aria-label="PK"
          >
            PK
          </button>
          {/* Chat toggle — opens/focuses chat input */}
          <button
            onClick={() => setShowChatInput((v) => !v)}
            className="flex-1 h-10 rounded-full bg-black/55 backdrop-blur border border-white/10 flex items-center justify-center text-white active:scale-[0.98] transition"
            aria-label="دردشة"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          {/* Mic toggle */}
          <button
            onClick={handleToggleMic}
            className={`w-10 h-10 rounded-full backdrop-blur border border-white/10 flex items-center justify-center transition active:scale-95 ${
              isMuted ? "bg-destructive/30 text-destructive-foreground" : "bg-black/45 text-white"
            }`}
            aria-label="المايك"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          {/* Emoji */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/10 flex items-center justify-center text-amber-200 active:scale-95 transition"
            aria-label="الإيموجي"
          >
            <Smile className="w-5 h-5" />
          </button>
          {/* Quick options (3 dots) */}
          <div className="relative">
            <button
              onClick={() => setShowQuickOptions((v) => !v)}
              className="w-10 h-10 rounded-full bg-black/45 backdrop-blur border border-white/10 flex items-center justify-center text-white active:scale-95 transition"
              aria-label="خيارات"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showQuickOptions && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowQuickOptions(false)} />
                <div className="absolute bottom-12 right-0 z-[61] min-w-[170px] rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
                  <button onClick={() => { setShowQuickOptions(false); setShowCouplePicker(true); }} className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-pink-400" /> ثنائي العشاق
                  </button>
                  <button onClick={() => { setShowQuickOptions(false); setShowCoinStorm(true); }} className="w-full px-4 py-2.5 text-right text-xs font-bold text-foreground hover:bg-secondary/70 flex items-center gap-2 border-t border-border/50">
                    <Zap className="w-3.5 h-3.5 text-fuchsia-400" /> عاصفة كوينز
                  </button>
                  <button onClick={() => { setShowQuickOptions(false); handleLeave(); }} className="w-full px-4 py-2.5 text-right text-xs font-black text-destructive hover:bg-destructive/15 flex items-center gap-2 border-t border-border/50">
                    <LogOut className="w-3.5 h-3.5" /> خروج من الغرفة
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Floating emoji picker overlay */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-3 z-[55]">
            <EmojiStickerPicker
              isOpen={showEmojiPicker}
              onToggle={() => setShowEmojiPicker(!showEmojiPicker)}
              onSelect={(emoji) => setChatInput((prev) => prev + emoji)}
            />
          </div>
        )}
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
        broadcastGift={broadcastGiftToRoom}
        roomId={roomId || undefined}
      />
      <InventorySheet open={showInventory} onClose={() => setShowInventory(false)} />
      <NeonCoinStorm open={showCoinStorm} onClose={() => setShowCoinStorm(false)} currentUserId={currentUserId} />
      <BossEntrance show={showBossEntrance} onComplete={handleBossEntranceComplete} />
      <CustomEntranceEffect roomId={roomId} currentUserId={currentUserId} queue={entranceQueue} onComplete={handleEntranceComplete} muteEntrance={muteEntrance} />
      <GiftComboBar count={comboCount} visible={comboCount >= 2} />
      
      {roomId && (
        <CouplePickerModal
          open={showCouplePicker}
          onClose={() => setShowCouplePicker(false)}
          roomId={roomId}
          members={members}
        />
      )}

      {/* AI Room Moderator (summary + auto-translate) */}
      <AIRoomAssistant
        messages={messages}
        translationsEnabled={translationsEnabled}
        onToggleTranslations={(v) => {
          setTranslationsEnabled(v);
          toast.success(v ? "الترجمة الفورية شغّالة 🌐" : "تم إيقاف الترجمة");
        }}
      />

      {/* Confirmation dialog for destructive admin actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent className="card-glass">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "kick" && "تأكيد الطرد"}
              {confirmAction?.type === "ban" && "تأكيد الحظر"}
              {confirmAction?.type === "kickMic" && "إنزال من المايك"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "kick" &&
                `هتطرد "${confirmAction.name}" من الروم. يقدر يرجع تاني لو حب.`}
              {confirmAction?.type === "ban" &&
                `هتحظر "${confirmAction?.name}" نهائياً من الروم. مش هيقدر يدخل تاني.`}
              {confirmAction?.type === "kickMic" &&
                `هتنزل "${confirmAction?.name}" من المايك. يقدر يطلب يرجع.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmAction) return;
                const { type, userId } = confirmAction;
                setConfirmAction(null);
                if (type === "kick") await handleKickUser(userId);
                else if (type === "ban") await handleBanUser(userId);
                else if (type === "kickMic") await handleKickFromMic(userId);
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VoiceRoom;
