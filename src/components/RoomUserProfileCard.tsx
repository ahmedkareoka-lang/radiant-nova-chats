import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Copy,
  Check,
  Gift,
  LogOut,
  Shield,
  VolumeX,
  Ban,
  UserMinus,
  Gamepad2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FramedAvatar from "./FramedAvatar";
import TierBadge from "./TierBadge";
import DualBadge from "./DualBadge";
import RechargeAgentBadge from "./RechargeAgentBadge";
import SupporterBadge, { SupporterAchievementBadge, SupporterFireBadge } from "./SupporterBadge";
import BDBadge from "./BDBadge";
import VipName from "./VipName";
import RoomBadgesShowcase from "./RoomBadgesShowcase";

export interface RoomUserProfileData {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  vip_level?: number;
  is_boss?: boolean;
  wealth_level?: number;
  wealth_xp?: number;
  charisma_level?: number;
  charisma_xp?: number;
  equipped_frame?: string | null;
  equipped_badge?: string | null;
  
  gender?: string | null;
  country?: string | null;
  is_online?: boolean;
}

interface Props {
  profile: RoomUserProfileData;
  isHostOfRoom?: boolean;
  isBD?: boolean;
  isRechargeAgent?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  /** True when the *viewer* is the room host — enables admin assignment UI. */
  viewerIsHost?: boolean;
  /** True when the *target* user is currently a room admin. */
  targetIsRoomAdmin?: boolean;
  isOnMic?: boolean;
  muted?: boolean;
  onClose: () => void;
  onSendGift: () => void;
  onOpenFullProfile: () => void;
  onMute?: () => void;
  onKick?: () => void;
  onBan?: () => void;
  onKickFromMic?: () => void;
  onAssignAdmin?: () => void;
  onRemoveAdmin?: () => void;
}


const GAMES = [
  { id: "lucky", emoji: "🎰", label: "الحظ" },
  { id: "olympus", emoji: "⚡", label: "Olympus" },
  { id: "football", emoji: "⚽", label: "Football" },
  { id: "lion", emoji: "🐯", label: "Lion & Tiger" },
];

export default function RoomUserProfileCard({
  profile,
  isHostOfRoom,
  isBD,
  isRechargeAgent,
  currentUserId,
  isAdmin,
  viewerIsHost,
  targetIsRoomAdmin,
  isOnMic,
  muted,
  onClose,
  onSendGift,
  onOpenFullProfile,
  onMute,
  onKick,
  onBan,
  onKickFromMic,
  onAssignAdmin,
  onRemoveAdmin,
}: Props) {

  const [copied, setCopied] = useState(false);
  const [registeredId, setRegisteredId] = useState<string>("");
  const [unlockedRoomLevels, setUnlockedRoomLevels] = useState<number[]>([]);
  const [currentRoomLevel, setCurrentRoomLevel] = useState<number | undefined>(undefined);

  const isMe = profile.user_id === currentUserId;

  // Fetch the REAL registered numeric account ID from profiles.user_id (text field, 6 digits)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", profile.user_id)
        .maybeSingle();
      if (!cancelled && data?.user_id) {
        setRegisteredId(String(data.user_id));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.user_id]);



  const copyId = async () => {
    if (!registeredId) return;
    try {
      await navigator.clipboard.writeText(registeredId);
      setCopied(true);
      toast.success("تم نسخ الـ ID ✅");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#1a1230] via-[#0f0a1f] to-[#0a0816] border border-purple-500/20 shadow-[0_0_60px_-10px_hsl(280_80%_45%/0.5)] p-4 space-y-4"
        dir="rtl"
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="flex flex-col items-center pt-2">
          <FramedAvatar
            avatarUrl={profile.avatar_url}
            equippedFrame={profile.equipped_frame || null}
            size={120}
            isBD={!!isBD}
            isRechargeAgent={!!isRechargeAgent}
            vipLevel={(profile as any)?.vip_level || 0}
          />
        </div>

        {/* Name + status */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="font-black text-lg">
            <VipName name={profile.display_name} level={(profile as any)?.vip_level || 0} size="lg" />
          </span>
          {profile.gender && (
            <span
              className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                profile.gender === "female" ? "bg-pink-500/30 text-pink-300" : "bg-blue-500/30 text-blue-300"
              }`}
            >
              {profile.gender === "female" ? "♀" : "♂"}
            </span>
          )}
          {profile.country && <span className="text-base">{profile.country}</span>}
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            متصل
          </span>
        </div>

        {/* Levels & ID row */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5">
            <TierBadge level={profile.charisma_level || 1} type="charm" size="sm" />
            <TierBadge level={profile.wealth_level || 1} type="wealth" size="sm" />
          </div>
          <button
            onClick={copyId}
            disabled={!registeredId}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-600/40 to-fuchsia-600/40 border border-purple-300/40 text-[12px] font-bold hover:from-purple-500/60 hover:to-fuchsia-500/60 transition-all shadow-[0_2px_10px_-2px_hsl(280_80%_55%/0.5)] disabled:opacity-50"
          >
            <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white text-[9px] font-black tracking-wide">
              ID
            </span>
            <span className="tabular-nums text-white">
              {registeredId || "------"}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
            )}
          </button>
        </div>

        {/* Showcase Badges – each badge type rendered as an INDEPENDENT pill */}
        {(() => {
          const hasVip = (profile.vip_level || 0) > 0;
          const supportCoins = (profile as any)?.total_spend_gold || 0;
          const hasAchievement = supportCoins >= 500_000;
          const hasFire = supportCoins >= 5_000_000;
          const count =
            (hasVip ? 1 : 0) + (isRechargeAgent ? 1 : 0) + (isBD ? 1 : 0) +
            (hasAchievement ? 1 : 0) + (hasFire ? 1 : 0) +
            (targetIsRoomAdmin ? 1 : 0);
          return (
            <div className="rounded-2xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10 p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-black text-sm text-fuchsia-200">الشارات</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/25">
                  {count}
                </span>
              </div>
              {count === 0 ? (
                <p className="text-center text-[11px] text-muted-foreground py-3">
                  لا توجد شارات بعد
                </p>
              ) : (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {hasVip && <DualBadge vipLevel={profile.vip_level || 0} />}
                  {isRechargeAgent && <RechargeAgentBadge size="md" />}
                  {isBD && <BDBadge size="md" />}
                  <SupporterAchievementBadge coinsSpent={supportCoins} size="md" />
                  <SupporterFireBadge coinsSpent={supportCoins} size="md" />
                  {targetIsRoomAdmin && (
                    <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-black bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-[0_0_10px_hsl(220_90%_60%/0.6)]">
                      <Shield className="w-3 h-3" /> أدمن
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}


        {/* Games section */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600/25 to-cyan-600/25 border border-cyan-400/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-black text-sm text-cyan-200">الألعاب</p>
            <Gamepad2 className="w-4 h-4 text-cyan-200" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {GAMES.map((g) => (
              <div
                key={g.id}
                className="aspect-square rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 border border-amber-300/30 flex flex-col items-center justify-center"
              >
                <span className="text-2xl">{g.emoji}</span>
                <span className="text-[8px] font-bold mt-0.5">{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        {!isMe && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSendGift}
                className="py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_-4px_hsl(340_85%_55%/0.6)]"
              >
                <Gift className="w-4 h-4" /> إرسال هدية
              </button>
              <button
                onClick={onOpenFullProfile}
                className="py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-sm"
              >
                👤 البروفايل الكامل
              </button>
            </div>

            {isAdmin && (
              <div className="border-t border-white/10 pt-2">
                <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> أدوات المشرف
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={onMute}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold flex flex-col items-center gap-1"
                  >
                    <VolumeX className="w-4 h-4" />
                    <span>{muted ? "إلغاء الكتم" : "كتم"}</span>
                  </button>
                  <button
                    onClick={onKick}
                    className="py-2 rounded-xl bg-white/5 hover:bg-destructive/20 text-xs font-bold flex flex-col items-center gap-1 text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>طرد</span>
                  </button>
                  <button
                    onClick={onBan}
                    className="py-2 rounded-xl bg-white/5 hover:bg-destructive/20 text-xs font-bold flex flex-col items-center gap-1 text-destructive"
                  >
                    <Ban className="w-4 h-4" />
                    <span>حظر</span>
                  </button>
                </div>
                {isOnMic && (
                  <button
                    onClick={onKickFromMic}
                    className="w-full mt-2 py-2 rounded-xl bg-destructive/15 text-destructive font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <UserMinus className="w-3.5 h-3.5" /> إنزال من المايك
                  </button>
                )}
                {viewerIsHost && !isHostOfRoom && (
                  targetIsRoomAdmin ? (
                    <button
                      onClick={onRemoveAdmin}
                      className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5" /> إزالة من الأدمن
                    </button>
                  ) : (
                    <button
                      onClick={onAssignAdmin}
                      className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_4px_18px_-4px_hsl(220_85%_55%/0.7)]"
                    >
                      <Shield className="w-3.5 h-3.5" /> تعيين كأدمن للروم
                    </button>
                  )
                )}
              </div>
            )}
          </div>

        )}
      </motion.div>
    </div>
  );
}
