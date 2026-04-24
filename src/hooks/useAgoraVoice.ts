import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ClientRole,
} from "agora-rtc-sdk-ng";
import { logAgora } from "@/lib/agoraDebugLog";

interface UseAgoraVoiceOptions {
  roomId: string | null;
  currentUserId: string | null;
  isOnMic: boolean;
  isMuted: boolean;
}

const AGORA_APP_ID = import.meta.env.VITE_AGORA_APP_ID as string | undefined;
const SPEAKING_THRESHOLD = 5;

// Set Agora log level (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=NONE)
try {
  AgoraRTC.setLogLevel(2);
} catch { /* noop */ }

logAgora("info", "env", `AGORA_APP_ID ${AGORA_APP_ID ? "loaded (" + AGORA_APP_ID.slice(0, 4) + "...)" : "MISSING"}`);

/**
 * Drop-in replacement for useWebRTC using Agora RTC SDK (App ID Only mode).
 * Returns: { connectedPeers, speakingPeers, localSpeaking, audioBlocked, unlockAudio, startLocalStream, stopLocalStream }
 */
export const useAgoraVoice = ({ roomId, currentUserId, isOnMic, isMuted }: UseAgoraVoiceOptions) => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const joinedRef = useRef(false);
  const currentRoleRef = useRef<ClientRole>("audience");
  const remoteUsersRef = useRef<Map<string, IAgoraRTCRemoteUser>>(new Map());
  const currentUserIdRef = useRef<string | null>(currentUserId);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Try to play all remote audio tracks (used for unlock-after-gesture on iOS)
  const playAllRemote = useCallback(() => {
    let blocked = false;
    remoteUsersRef.current.forEach((user) => {
      try {
        user.audioTrack?.play();
      } catch (e: any) {
        logAgora("warn", "play", `play() failed: ${e?.message || e}`);
        blocked = true;
      }
    });
    return blocked;
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        if (ctx.state === "suspended") await ctx.resume();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        logAgora("info", "unlock", `AudioContext state=${ctx.state}`);
      }
    } catch (e: any) {
      logAgora("warn", "unlock", `AudioContext failed: ${e?.message || e}`);
    }
    playAllRemote();
    setAudioBlocked(false);
    logAgora("success", "unlock", "Audio unlocked by user gesture");
  }, [playAllRemote]);

  // Lazily create one shared client
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

      client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
        logAgora("info", "user-published", `uid=${user.uid} type=${mediaType}`);
        try {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            remoteUsersRef.current.set(String(user.uid), user);
            try {
              user.audioTrack?.play();
              logAgora("success", "subscribe", `Playing audio from uid=${user.uid}`);
            } catch (e: any) {
              logAgora("error", "autoplay", `Blocked by browser: ${e?.message || e}`);
              setAudioBlocked(true);
            }
            setConnectedPeers((prev) => new Set(prev).add(String(user.uid)));
          }
        } catch (e: any) {
          logAgora("error", "subscribe", `Failed: ${e?.message || e}`);
        }
      });

      client.on("user-unpublished", (user) => {
        logAgora("info", "user-unpublished", `uid=${user.uid}`);
        remoteUsersRef.current.delete(String(user.uid));
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
        logAgora("info", "user-left", `uid=${user.uid}`);
        remoteUsersRef.current.delete(String(user.uid));
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

      client.on("user-joined", (user) => {
        logAgora("info", "user-joined", `uid=${user.uid}`);
      });

      // @ts-ignore
      client.on("connection-state-change", (curState: string, prevState: string, reason?: string) => {
        logAgora("info", "connection", `${prevState} → ${curState}${reason ? " (" + reason + ")" : ""}`);
      });

      // @ts-ignore
      client.on("exception", (event: any) => {
        logAgora("warn", "exception", `code=${event?.code} msg=${event?.msg} uid=${event?.uid}`);
      });

      // @ts-ignore - event exists on Agora client
      client.on("autoplay-failed", () => {
        logAgora("error", "autoplay-failed", "Browser blocked audio autoplay — tap to enable");
        setAudioBlocked(true);
      });

      // Voice activity detection
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const speakingNow = new Set<string>();
        let mySpeaking = false;
        const localUid = currentUserIdRef.current;
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
  }, []);

  const startLocalStream = useCallback(async () => {
    if (localTrackRef.current) return;
    try {
      // Proactively check microphone permissions where supported
      try {
        if ((navigator as any).permissions?.query) {
          const status = await (navigator as any).permissions.query({ name: "microphone" as PermissionName });
          if (status.state === "denied") {
            console.error("[Agora] Microphone permission denied by user/browser settings");
            return;
          }
        }
      } catch { /* not all browsers support this */ }

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
    } catch (e: any) {
      const name = e?.name || e?.code || "Unknown";
      console.error("[Agora] startLocalStream failed:", name, e?.message || e);
      // Common errors: NotAllowedError (permission), NotFoundError (no mic), NotReadableError (in use)
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
      console.error("[Agora] VITE_AGORA_APP_ID is not set — voice will not work. Add it in Vercel env vars and redeploy.");
      return;
    }

    let cancelled = false;

    (async () => {
      const client = getClient();
      try {
        await client.setClientRole("audience");
        currentRoleRef.current = "audience";
        await client.join(AGORA_APP_ID, roomId, null, currentUserId);
        if (cancelled) {
          await client.leave();
          return;
        }
        joinedRef.current = true;
        console.log("[Agora] joined channel", roomId, "as", currentUserId);
      } catch (e: any) {
        const code = e?.code || e?.name || "Unknown";
        console.error("[Agora] join failed:", code, e?.message || e);
        if (String(code).includes("CAN_NOT_GET_GATEWAY_SERVER") || String(code).includes("INVALID_VENDOR_KEY")) {
          console.error("[Agora] Likely invalid App ID. Check VITE_AGORA_APP_ID in Vercel.");
        }
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
          remoteUsersRef.current.clear();
          setConnectedPeers(new Set());
          setSpeakingPeers(new Set());
          setLocalSpeaking(false);
          setAudioBlocked(false);
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
    if (isOnMic) {
      startLocalStream();
    } else {
      stopLocalStream();
    }
  }, [isOnMic, startLocalStream, stopLocalStream]);

  // Auto-attempt unlock on first user interaction anywhere on the page (iOS/Android)
  useEffect(() => {
    if (!audioBlocked) return;
    const handler = () => {
      unlockAudio();
    };
    window.addEventListener("touchend", handler, { once: true, passive: true });
    window.addEventListener("click", handler, { once: true });
    return () => {
      window.removeEventListener("touchend", handler);
      window.removeEventListener("click", handler);
    };
  }, [audioBlocked, unlockAudio]);

  return {
    connectedPeers,
    speakingPeers,
    localSpeaking,
    audioBlocked,
    unlockAudio,
    startLocalStream,
    stopLocalStream,
  };
};
