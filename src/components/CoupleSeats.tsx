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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative w-full flex items-center justify-center py-1"
    >
      {/* Floating hearts overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <AnimatePresence>
          {hearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 40, scale: 0.5 }}
              animate={{ opacity: [0, 1, 1, 0], y: -70, scale: [0.5, 1.2, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute bottom-0 text-xl"
              style={{ left: `${h.left}%` }}
            >
              💖
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* End button — small, only host */}
      {isHost && (
        <button
          onClick={handleEnd}
          className="absolute top-0 right-0 z-20 p-1 rounded-full bg-black/40 text-pink-200 hover:bg-red-500/50 transition-colors"
          aria-label="إنهاء الزوج"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Compact couple row: two romantic mics + center heart medallion */}
      <div className="flex items-center justify-center gap-3">
        <CoupleAvatar profile={u1?.profile} side="left" tier={tier} />

        {/* Center medallion — keeps the existing heart icon style, sits BETWEEN the two */}
        <motion.div
          className="relative flex flex-col items-center"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            {/* Outer luxury halo */}
            <div className="absolute inset-[-6px] rounded-full bg-gradient-to-br from-pink-500/30 via-rose-400/20 to-fuchsia-500/30 blur-md" />
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600 flex items-center justify-center ring-2 ring-pink-200/60 shadow-[0_0_18px_rgba(236,72,153,0.7)]">
              <Heart className="w-5 h-5 fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
              {tier === "legendary" && (
                <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]" />
              )}
            </div>
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <div className="w-11 h-11 rounded-full ring-2 ring-pink-300/60" />
            </motion.div>
          </div>
          <span className="mt-1 text-[10px] font-black text-pink-100 tabular-nums leading-none">
            {couple.love_score >= 1000
              ? `${(couple.love_score / 1000).toFixed(1)}K`
              : couple.love_score}
          </span>
          <span className="text-[8px] text-pink-200/80 leading-none mt-0.5">نقاط الحب</span>
        </motion.div>

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
  // Romantic, premium ring colors per tier — distinct from regular mics
  const ringColor =
    tier === "legendary" ? "ring-yellow-300 shadow-[0_0_22px_rgba(250,204,21,0.75)]"
    : tier === "epic" ? "ring-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,0.7)]"
    : tier === "rare" ? "ring-pink-300 shadow-[0_0_16px_rgba(236,72,153,0.65)]"
    : "ring-pink-200 shadow-[0_0_14px_rgba(244,114,182,0.6)]";

  const gradientBg =
    tier === "legendary" ? "from-yellow-400/40 via-pink-500/40 to-fuchsia-500/40"
    : tier === "epic" ? "from-fuchsia-500/40 via-pink-500/30 to-rose-500/40"
    : "from-pink-500/30 via-rose-400/25 to-fuchsia-500/30";

  return (
    <motion.div
      initial={{ x: side === "left" ? -16 : 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex flex-col items-center gap-1"
    >
      {/* Premium romantic frame — distinct color, NOT a generic mic look */}
      <div className={`relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-br ${gradientBg} ring-2 ${ringColor}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-pink-950">
          {profile?.avatar_url ? (
            <img
              loading="lazy"
              decoding="async"
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-pink-900/40 flex items-center justify-center text-pink-200 text-lg font-black">
              {profile?.display_name?.[0] ?? "?"}
            </div>
          )}
        </div>
        {/* Tiny floating heart accent on the corner */}
        <Heart className="absolute -top-1 -right-1 w-3.5 h-3.5 fill-pink-400 text-pink-300 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]" />
      </div>
      <span className="text-[10px] font-bold text-pink-100 max-w-[70px] truncate">
        {profile?.display_name ?? "..."}
      </span>
    </motion.div>
  );
};

export default CoupleSeats;
