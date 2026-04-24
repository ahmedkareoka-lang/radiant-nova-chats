import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ClientRole,
} from "agora-rtc-sdk-ng";

interface UseAgoraVoiceOptions {
  roomId: string | null;
  currentUserId: string | null;
  isOnMic: boolean;
  isMuted: boolean;
}

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
const SPEAKING_THRESHOLD = 5; // 0-100 (Agora volume)

/**
 * Drop-in replacement for useWebRTC using Agora RTC SDK (App ID Only mode).
 * Same return shape: { connectedPeers, speakingPeers, localSpeaking, startLocalStream, stopLocalStream }
 *
 * Production note: App ID Only is INSECURE. For production, deploy a token server.
 */
export const useAgoraVoice = ({ roomId, currentUserId, isOnMic, isMuted }: UseAgoraVoiceOptions) => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const joinedRef = useRef(false);
  const currentRoleRef = useRef<ClientRole>("audience");

  // Lazily create one shared client
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            user.audioTrack?.play();
            setConnectedPeers((prev) => new Set(prev).add(String(user.uid)));
          }
        } catch (e) {
          console.error("[Agora] subscribe failed:", e);
        }
      });

      client.on("user-unpublished", (user) => {
        setConnectedPeers((prev) => {
          const next = new Set(prev);
          next.delete(String(user.uid));
          return next;
        });
        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          next.delete(String(user.uid));
          return next;
        });
      });

      client.on("user-left", (user) => {
        setConnectedPeers((prev) => {
          const next = new Set(prev);
          next.delete(String(user.uid));
          return next;
        });
        setSpeakingPeers((prev) => {
          const next = new Set(prev);
          next.delete(String(user.uid));
          return next;
        });
      });

      // Voice activity detection
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const speakingNow = new Set<string>();
        let mySpeaking = false;
        const localUid = currentUserId;
        for (const v of volumes) {
          if (v.level >= SPEAKING_THRESHOLD) {
            const uid = String(v.uid);
            if (uid === localUid) mySpeaking = true;
            else speakingNow.add(uid);
          }
        }
        setSpeakingPeers(speakingNow);
        setLocalSpeaking(mySpeaking);
      });

      clientRef.current = client;
    }
    return clientRef.current;
  }, [currentUserId]);

  const startLocalStream = useCallback(async () => {
    if (localTrackRef.current) return;
    try {
      const track = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "music_standard",
        AEC: true,
        ANS: true,
        AGC: true,
      });
      localTrackRef.current = track;

      const client = getClient();
      if (currentRoleRef.current !== "host") {
        await client.setClientRole("host");
        currentRoleRef.current = "host";
      }
      if (joinedRef.current) {
        await client.publish([track]);
      }
    } catch (e) {
      console.error("[Agora] startLocalStream failed:", e);
    }
  }, [getClient]);

  const stopLocalStream = useCallback(async () => {
    const client = clientRef.current;
    const track = localTrackRef.current;
    if (track) {
      try {
        if (client && joinedRef.current) {
          await client.unpublish([track]);
        }
      } catch { /* ignore */ }
      track.stop();
      track.close();
      localTrackRef.current = null;
    }
    if (client && joinedRef.current && currentRoleRef.current !== "audience") {
      try {
        await client.setClientRole("audience");
        currentRoleRef.current = "audience";
      } catch { /* ignore */ }
    }
    setLocalSpeaking(false);
  }, []);

  // Join / leave channel based on roomId
  useEffect(() => {
    if (!roomId || !currentUserId) return;
    if (!AGORA_APP_ID) {
      console.error("[Agora] VITE_AGORA_APP_ID is not set");
      return;
    }

    let cancelled = false;

    (async () => {
      const client = getClient();
      try {
        // Use audience by default; will switch to host when mic is enabled
        await client.setClientRole("audience");
        currentRoleRef.current = "audience";
        // Use string UID via numeric hash to satisfy Agora UID requirements,
        // but keep currentUserId as the canonical id for matching peers.
        // We pass the user's id directly as a string UID (Agora supports string UIDs in App-ID-only mode if account-based join is used).
        await client.join(AGORA_APP_ID, roomId, null, currentUserId);
        if (cancelled) {
          await client.leave();
          return;
        }
        joinedRef.current = true;
      } catch (e) {
        console.error("[Agora] join failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      const client = clientRef.current;
      const track = localTrackRef.current;
      (async () => {
        try {
          if (track) {
            try { if (client && joinedRef.current) await client.unpublish([track]); } catch { }
            track.stop();
            track.close();
            localTrackRef.current = null;
          }
          if (client && joinedRef.current) {
            await client.leave();
          }
        } catch (e) {
          console.error("[Agora] leave failed:", e);
        } finally {
          joinedRef.current = false;
          setConnectedPeers(new Set());
          setSpeakingPeers(new Set());
          setLocalSpeaking(false);
        }
      })();
    };
  }, [roomId, currentUserId, getClient]);

  // Mute / unmute local track
  useEffect(() => {
    const track = localTrackRef.current;
    if (track) {
      track.setMuted(isMuted);
    }
  }, [isMuted]);

  // React to mic on/off
  useEffect(() => {
    if (!joinedRef.current) {
      // Will be applied after join
    }
    if (isOnMic) {
      startLocalStream();
    } else {
      stopLocalStream();
    }
  }, [isOnMic, startLocalStream, stopLocalStream]);

  return {
    connectedPeers,
    speakingPeers,
    localSpeaking,
    startLocalStream,
    stopLocalStream,
  };
};
