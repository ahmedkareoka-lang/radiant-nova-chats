import { useEffect, useRef, useState, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ClientRole,
} from "agora-rtc-sdk-ng";
import { logAgora } from "@/lib/agoraDebugLog";
import { supabase } from "@/integrations/supabase/client";

interface UseAgoraVoiceOptions {
  roomId: string | null;
  currentUserId: string | null;
  isOnMic: boolean;
  isMuted: boolean;
}

const SPEAKING_THRESHOLD = 5;
const TOKEN_TTL_SECONDS = 3600; // 1 hour
const TOKEN_RENEW_BEFORE_MS = 5 * 60 * 1000; // renew 5 min before expiry

// Set Agora log level (0=DEBUG, 1=INFO, 2=WARNING, 3=ERROR, 4=NONE)
try {
  AgoraRTC.setLogLevel(2);
} catch { /* noop */ }

logAgora("info", "env", "Token auth enabled (certificate-backed RTC token)");

// Fetch a fresh RTC token from our edge function
async function fetchAgoraToken(
  channelName: string,
  role: "host" | "audience",
): Promise<{ token: string; appId: string; uid: number; channel: string } | null> {
  try {
    const normalizedChannel = channelName.trim();
    const { data, error } = await supabase.functions.invoke("agora-token", {
      body: { channelName: normalizedChannel, role, expireSeconds: TOKEN_TTL_SECONDS },
    });
    if (error) {
      logAgora("error", "token", `Edge function error: ${error.message}`);
      return null;
    }
    if (!data?.token || !data?.appId || typeof data?.uid !== "number") {
      logAgora("error", "token", "Invalid token response");
      return null;
    }
    logAgora("success", "token", `Got ${role} token for "${normalizedChannel}" (uid=${data.uid})`);
    return {
      token: data.token,
      appId: data.appId,
      uid: data.uid,
      channel: String(data.channel || normalizedChannel),
    };
  } catch (e: any) {
    logAgora("error", "token", `Fetch failed: ${e?.message || e}`);
    return null;
  }
}

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
  const localPublishedRef = useRef(false);
  const currentRoleRef = useRef<ClientRole>("audience");
  const remoteUsersRef = useRef<Map<string, IAgoraRTCRemoteUser>>(new Map());
  const isOnMicRef = useRef(isOnMic);
  const channelRef = useRef<string | null>(null);
  const agoraUidRef = useRef<string | null>(null);

  useEffect(() => {
    isOnMicRef.current = isOnMic;
  }, [isOnMic]);

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

      // @ts-ignore - token will expire soon
      client.on("token-privilege-will-expire", async () => {
        logAgora("warn", "token", "Token expiring soon — renewing…");
        const channel = channelRef.current;
        if (!channel) return;
        const role = currentRoleRef.current === "host" ? "host" : "audience";
        const fresh = await fetchAgoraToken(channel, role);
        if (fresh?.token) {
          try {
            await client.renewToken(fresh.token);
            logAgora("success", "token", "Token renewed");
          } catch (e: any) {
            logAgora("error", "token", `Renew failed: ${e?.message || e}`);
          }
        }
      });

      // @ts-ignore - token already expired
      client.on("token-privilege-did-expire", async () => {
        logAgora("error", "token", "Token expired — re-fetching…");
        const channel = channelRef.current;
        if (!channel) return;
        const role = currentRoleRef.current === "host" ? "host" : "audience";
        const fresh = await fetchAgoraToken(channel, role);
        if (fresh?.token) {
          try {
            await client.renewToken(fresh.token);
            logAgora("success", "token", "Token re-fetched after expiry");
          } catch (e: any) {
            logAgora("error", "token", `Re-fetch failed: ${e?.message || e}`);
          }
        }
      });

      // Voice activity detection
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const speakingNow = new Set<string>();
        let mySpeaking = false;
        const localUid = agoraUidRef.current;
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
      try {
        if ((navigator as any).permissions?.query) {
          const status = await (navigator as any).permissions.query({ name: "microphone" as PermissionName });
          logAgora("info", "mic-permission", `state=${status.state}`);
          if (status.state === "denied") {
            logAgora("error", "mic-permission", "Microphone permission DENIED in browser settings");
            return;
          }
        }
      } catch { /* not all browsers support this */ }

      logAgora("info", "mic", "Requesting microphone…");
      const track = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "music_standard",
        AEC: true,
        ANS: true,
        AGC: true,
      });
      localTrackRef.current = track;
      logAgora("success", "mic", "Microphone acquired");

      const client = getClient();
      if (currentRoleRef.current !== "host") {
        const channel = channelRef.current;
        if (channel) {
          const fresh = await fetchAgoraToken(channel, "host");
          if (fresh?.token) {
            try {
              await client.renewToken(fresh.token);
              logAgora("info", "token", "Renewed with host privileges");
            } catch (e: any) {
              logAgora("warn", "token", `Renew before host failed: ${e?.message || e}`);
            }
          }
        }
        await client.setClientRole("host");
        currentRoleRef.current = "host";
        logAgora("info", "role", "Switched to host");
      }
      if (joinedRef.current && !localPublishedRef.current) {
        await client.publish([track]);
        localPublishedRef.current = true;
        logAgora("success", "publish", "Local mic published to channel");
      } else {
        logAgora("warn", "publish", "Mic ready but channel not joined yet");
      }
    } catch (e: any) {
      const name = e?.name || e?.code || "Unknown";
      logAgora("error", "startLocalStream", `${name}: ${e?.message || e}`);
    }
  }, [getClient]);

  const stopLocalStream = useCallback(async () => {
    const client = clientRef.current;
    const track = localTrackRef.current;
    if (track) {
      try {
        if (client && joinedRef.current && localPublishedRef.current) {
          await client.unpublish([track]);
        }
      } catch { /* ignore */ }
      track.stop();
      track.close();
      localTrackRef.current = null;
      localPublishedRef.current = false;
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

    let cancelled = false;
    channelRef.current = roomId;

    (async () => {
      const client = getClient();
      try {
        const tok = await fetchAgoraToken(roomId, "audience");
        if (cancelled) return;
        if (!tok) {
          logAgora("error", "join", "No token returned — voice disabled");
          return;
        }

        channelRef.current = tok.channel;
        await client.setClientRole("audience");
        currentRoleRef.current = "audience";
        agoraUidRef.current = String(tok.uid);
        logAgora("info", "join", `Joining channel "${tok.channel}" as uid=${tok.uid}…`);
        await client.join(tok.appId, tok.channel, tok.token, tok.uid);
        if (cancelled) {
          await client.leave();
          return;
        }
        joinedRef.current = true;
        logAgora("success", "join", `Joined channel "${tok.channel}"`);
        if (isOnMicRef.current) {
          await startLocalStream();
        }
      } catch (e: any) {
        const code = e?.code || e?.name || "Unknown";
        logAgora("error", "join", `${code}: ${e?.message || e}`);
        if (String(code).includes("INVALID_VENDOR_KEY") || String(code).includes("DYNAMIC_KEY_TIMEOUT") || String(code).includes("INVALID_TOKEN")) {
          logAgora("error", "join", "Token rejected. Check AGORA_APP_ID and AGORA_APP_CERTIFICATE in Lovable Cloud secrets.");
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
          localPublishedRef.current = false;
          channelRef.current = null;
          agoraUidRef.current = null;
          remoteUsersRef.current.clear();
          setConnectedPeers(new Set());
          setSpeakingPeers(new Set());
          setLocalSpeaking(false);
          setAudioBlocked(false);
        }
      })();
    };
  }, [roomId, currentUserId, getClient, startLocalStream]);

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
