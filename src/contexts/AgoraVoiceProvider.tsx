import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveRoom } from "@/contexts/ActiveRoomContext";
import { useAgoraVoice } from "@/hooks/useAgoraVoice";

interface AgoraVoiceContextValue {
  connectedPeers: Set<string>;
  speakingPeers: Set<string>;
  localSpeaking: boolean;
  audioBlocked: boolean;
  unlockAudio: () => Promise<void> | void;
  isMuted: boolean;
  setIsMuted: (v: boolean | ((p: boolean) => boolean)) => void;
}

const Ctx = createContext<AgoraVoiceContextValue | null>(null);

export const useAgoraVoiceState = (): AgoraVoiceContextValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAgoraVoiceState must be inside AgoraVoiceProvider");
  return v;
};

/**
 * Lives at app root so the Agora RTC client survives navigation between
 * VoiceRoom, ChatPage, UserProfile, etc. The "active room" is the one
 * registered in ActiveRoomContext (set by VoiceRoom on mount, cleared on
 * explicit leave). While that roomId stays non-null, the channel stays joined.
 */
export const AgoraVoiceProvider = ({ children }: { children: ReactNode }) => {
  const { roomId } = useActiveRoom();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOnMic, setIsOnMic] = useState(false);
  const [isMuted, setIsMutedState] = useState(false);

  // Resolve current user once, refresh on auth changes
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setCurrentUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Track this user's mic status in the active room via realtime subscription
  // on room_members. Drives Agora publish/unpublish without needing VoiceRoom
  // to be mounted.
  const lastMicRef = useRef<boolean>(false);
  useEffect(() => {
    if (!roomId || !currentUserId) {
      lastMicRef.current = false;
      setIsOnMic(false);
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("room_members")
        .select("mic_slot, is_on_mic")
        .eq("room_id", roomId)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (cancelled) return;
      const onMic = !!data && data.mic_slot !== null && data.mic_slot !== undefined;
      if (lastMicRef.current !== onMic) {
        lastMicRef.current = onMic;
        setIsOnMic(onMic);
      }
    };

    refresh();
    const ch = supabase
      .channel(`agora-mic-${roomId}-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: any) => {
          const row = (payload.new ?? payload.old) as any;
          if (row?.user_id === currentUserId) refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [roomId, currentUserId]);

  const {
    connectedPeers,
    speakingPeers,
    localSpeaking,
    audioBlocked,
    unlockAudio,
  } = useAgoraVoice({
    roomId,
    currentUserId,
    isOnMic,
    isMuted,
  });

  const setIsMuted: AgoraVoiceContextValue["setIsMuted"] = (v) => {
    setIsMutedState((prev) => (typeof v === "function" ? (v as (p: boolean) => boolean)(prev) : v));
  };

  return (
    <Ctx.Provider
      value={{
        connectedPeers,
        speakingPeers,
        localSpeaking,
        audioBlocked,
        unlockAudio,
        isMuted,
        setIsMuted,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};
