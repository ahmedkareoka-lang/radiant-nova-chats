import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRoom } from "@/contexts/ActiveRoomContext";

interface LevelUpEvt {
  type: "wealth" | "charm";
  newLevel: number;
}

/**
 * Subscribes to the current user's profile changes and fires a fullscreen
 * level-up event whenever wealth_level or charisma_level increases. Also
 * posts a celebratory message in the active room (if any).
 */
export function useLevelUpDetector() {
  const [event, setEvent] = useState<LevelUpEvt | null>(null);
  const lastWealth = useRef<number | null>(null);
  const lastCharm = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const displayNameRef = useRef<string>("");
  const { roomId: activeRoomId } = useActiveRoom();
  const activeRoomRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
  }, [activeRoomId]);

  useEffect(() => {
    let channel: any = null;
    let cancelled = false;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      userIdRef.current = user.id;

      const { data: prof } = await supabase
        .from("profiles")
        .select("wealth_level, charisma_level, display_name")
        .eq("id", user.id)
        .single();

      if (prof) {
        lastWealth.current = prof.wealth_level;
        lastCharm.current = prof.charisma_level;
        displayNameRef.current = prof.display_name || "User";
      }

      channel = supabase
        .channel(`profile-levelup-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          (payload) => {
            const next = payload.new as any;
            const wL = next.wealth_level;
            const cL = next.charisma_level;
            if (lastWealth.current !== null && wL > lastWealth.current) {
              triggerLevelUp("wealth", wL);
            }
            if (lastCharm.current !== null && cL > lastCharm.current) {
              triggerLevelUp("charm", cL);
            }
            lastWealth.current = wL;
            lastCharm.current = cL;

            // Auto-trigger referral level5 reward (no-op if already claimed or <5)
            if ((next.level ?? 0) >= 5) {
              supabase.rpc("process_referral_level5", { _user_id: user.id });
            }
          }
        )
        .subscribe();
    };

    const triggerLevelUp = async (type: "wealth" | "charm", newLevel: number) => {
      setEvent({ type, newLevel });

      // Post celebration message in active room (if any)
      const rid = activeRoomRef.current;
      const uid = userIdRef.current;
      if (rid && uid) {
        const label = type === "wealth" ? "الثروة 💰" : "الكاريزما ✨";
        const content = `🎉 ${displayNameRef.current} ارتقى لمستوى ${label} ${newLevel}! 🎊`;
        try {
          await supabase.from("messages").insert({
            sender_id: uid,
            room_id: rid,
            content,
          });
        } catch {}
      }
    };

    init();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const clear = () => setEvent(null);
  return { event, clear };
}
