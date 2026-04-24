import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Crown } from "lucide-react";
import { toast } from "sonner";

interface CoupleData {
  id: string;
  room_id: string;
  user1_id: string;
  user2_id: string;
  slot1: number;
  slot2: number;
  love_score: number;
}

interface MicMember {
  user_id: string;
  mic_slot: number | null;
  is_on_mic: boolean;
  profile?: { display_name: string; avatar_url: string | null };
}

interface CoupleSeatsProps {
  roomId: string;
  isHost: boolean;
  members: MicMember[];
  onOpenPicker: () => void;
}

export const useCouple = (roomId: string) => {
  const [couple, setCouple] = useState<CoupleData | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("room_couples")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle();
      if (!cancelled) setCouple(data as CoupleData | null);
    };
    load();

    const channel = supabase
      .channel(`couple-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_couples", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setCouple(null);
          else setCouple(payload.new as CoupleData);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return couple;
};

const CoupleSeats = ({ roomId, isHost, members, onOpenPicker }: CoupleSeatsProps) => {
  const couple = useCouple(roomId);
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([]);
  const heartIdRef = useRef(0);
  const prevScoreRef = useRef(0);

  // Floating hearts animation when score increases
  useEffect(() => {
    if (!couple) return;
    if (couple.love_score > prevScoreRef.current && prevScoreRef.current > 0) {
      const burst = Array.from({ length: 6 }).map(() => ({
        id: ++heartIdRef.current,
        left: 30 + Math.random() * 40,
      }));
      setHearts((prev) => [...prev, ...burst]);
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => !burst.find((b) => b.id === h.id)));
      }, 2500);
    }
    prevScoreRef.current = couple.love_score;
  }, [couple?.love_score]);

  const handleEnd = async () => {
    if (!couple) return;
    const { error } = await supabase.rpc("end_couple_seat", { _room_id: roomId });
    if (error) toast.error("فشل إنهاء وضع الزوج");
    else toast.success("تم إنهاء وضع الزوج 💔");
  };

  if (!couple) {
    if (!isHost) return null;
    return (
      <button
        onClick={onOpenPicker}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/40 text-pink-300 hover:from-pink-500/40 hover:to-rose-500/40"
      >
        <Heart className="w-3.5 h-3.5 fill-pink-400" />
        وضع الأزواج 💕
      </button>
    );
  }

  const u1 = members.find((m) => m.user_id === couple.user1_id);
  const u2 = members.find((m) => m.user_id === couple.user2_id);

  // Tier based on love score
  const tier =
    couple.love_score >= 100000 ? "legendary"
    : couple.love_score >= 30000 ? "epic"
    : couple.love_score >= 5000 ? "rare"
    : "normal";

  const tierColors = {
    normal: "from-pink-500/30 via-rose-500/20 to-pink-500/30",
    rare: "from-pink-500/40 via-fuchsia-500/30 to-pink-500/40",
    epic: "from-fuchsia-500/50 via-purple-500/40 to-pink-500/50",
    legendary: "from-yellow-400/50 via-pink-500/50 to-fuchsia-500/50",
  };

  const tierLabel = {
    normal: "زوج جديد",
    rare: "زوج مميز",
    epic: "زوج ملحمي",
    legendary: "زوج أسطوري 👑",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`relative w-full rounded-2xl overflow-hidden border border-pink-500/40 bg-gradient-to-r ${tierColors[tier]} backdrop-blur-sm`}
    >
      {/* Floating hearts overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 60, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -80, scale: [0.5, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute bottom-0 text-2xl"
              style={{ left: `${h.left}%` }}
            >
              💖
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-pink-600/30 via-rose-600/20 to-pink-600/30">
        <div className="flex items-center gap-1.5">
          {tier === "legendary" && <Crown className="w-3.5 h-3.5 text-yellow-300" />}
          <span className="text-[11px] font-black text-pink-100">💕 {tierLabel[tier]}</span>
        </div>
        {isHost && (
          <button
            onClick={handleEnd}
            className="p-1 rounded-full bg-black/30 text-pink-200 hover:bg-red-500/40 transition-colors"
            aria-label="إنهاء"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Couple display */}
      <div className="relative flex items-center justify-around px-3 py-3">
        {/* User 1 */}
        <CoupleAvatar profile={u1?.profile} side="left" tier={tier} />

        {/* Heart center with score */}
        <motion.div
          className="relative flex flex-col items-center mx-2"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            <Heart className="w-10 h-10 fill-pink-500 text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.7)]" />
            <motion.div
              className="absolute inset-0"
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Heart className="w-10 h-10 fill-pink-400/40 text-pink-400/40" />
            </motion.div>
          </div>
          <span className="mt-1 text-[10px] font-black text-pink-100 tabular-nums">
            {couple.love_score >= 1000
              ? `${(couple.love_score / 1000).toFixed(1)}K`
              : couple.love_score}
          </span>
          <span className="text-[8px] text-pink-200/80">نقاط الحب</span>
        </motion.div>

        {/* User 2 */}
        <CoupleAvatar profile={u2?.profile} side="right" tier={tier} />
      </div>
    </motion.div>
  );
};

const CoupleAvatar = ({
  profile,
  side,
  tier,
}: {
  profile?: { display_name: string; avatar_url: string | null };
  side: "left" | "right";
  tier: string;
}) => {
  const ringColor =
    tier === "legendary" ? "ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
    : tier === "epic" ? "ring-fuchsia-400 shadow-[0_0_16px_rgba(217,70,239,0.6)]"
    : tier === "rare" ? "ring-pink-400 shadow-[0_0_14px_rgba(236,72,153,0.5)]"
    : "ring-pink-300/70 shadow-[0_0_10px_rgba(236,72,153,0.4)]";

  return (
    <motion.div
      initial={{ x: side === "left" ? -20 : 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      <div className={`w-14 h-14 rounded-full overflow-hidden ring-2 ${ringColor}`}>
        {profile?.avatar_url ? (
          <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-pink-900/40 flex items-center justify-center text-pink-200 text-lg font-black">
            {profile?.display_name?.[0] ?? "?"}
          </div>
        )}
      </div>
      <span className="text-[10px] font-bold text-pink-100 max-w-[70px] truncate">
        {profile?.display_name ?? "..."}
      </span>
    </motion.div>
  );
};

export default CoupleSeats;
