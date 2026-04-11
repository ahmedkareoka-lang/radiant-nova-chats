import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  roomId: string | null;
  currentUserId: string | null;
  isOnMic: boolean;
  isMuted: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
];

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const SPEAKING_THRESHOLD = 15; // audio level threshold (0-128)
const SPEAKING_CHECK_INTERVAL = 150; // ms

export const useWebRTC = ({ roomId, currentUserId, isOnMic, isMuted }: UseWebRTCOptions) => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const [localSpeaking, setLocalSpeaking] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const channelRef = useRef<any>(null);
  const isOnMicRef = useRef(isOnMic);
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  
  // Audio analysis refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map());
  const speakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { isOnMicRef.current = isOnMic; }, [isOnMic]);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Setup local audio analyser
  const setupLocalAnalyser = useCallback((stream: MediaStream) => {
    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
    } catch (e) {
      console.warn("[WebRTC] Failed to setup local analyser:", e);
    }
  }, [getAudioContext]);

  // Setup remote audio analyser for a peer
  const setupRemoteAnalyser = useCallback((peerId: string, stream: MediaStream) => {
    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      remoteAnalysersRef.current.set(peerId, analyser);
    } catch (e) {
      console.warn("[WebRTC] Failed to setup remote analyser for", peerId, e);
    }
  }, [getAudioContext]);

  // Polling loop: check audio levels
  useEffect(() => {
    if (!isOnMic) {
      setLocalSpeaking(false);
      setSpeakingPeers(new Set());
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }
      return;
    }

    speakingIntervalRef.current = setInterval(() => {
      const dataArray = new Uint8Array(128);

      // Check local
      if (localAnalyserRef.current && !isMuted) {
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setLocalSpeaking(avg > SPEAKING_THRESHOLD);
      } else {
        setLocalSpeaking(false);
      }

      // Check remotes
      const speaking = new Set<string>();
      remoteAnalysersRef.current.forEach((analyser, peerId) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        if (avg > SPEAKING_THRESHOLD) speaking.add(peerId);
      });
      setSpeakingPeers(speaking);
    }, SPEAKING_CHECK_INTERVAL);

    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
        speakingIntervalRef.current = null;
      }
    };
  }, [isOnMic, isMuted]);

  const startLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
        },
        video: false,
      });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      setupLocalAnalyser(stream);
      return stream;
    } catch (err) {
      console.error("[WebRTC] Failed to get audio stream:", err);
      return null;
    }
  }, [setupLocalAnalyser]);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    localAnalyserRef.current = null;
  }, []);

  // Auto-reconnect logic
  const attemptReconnect = useCallback((peerId: string) => {
    const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
    if (attempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("[WebRTC] Max reconnect attempts reached for", peerId);
      reconnectAttemptsRef.current.delete(peerId);
      return;
    }
    reconnectAttemptsRef.current.set(peerId, attempts + 1);
    console.log(`[WebRTC] Reconnecting to ${peerId} (attempt ${attempts + 1})`);

    setTimeout(() => {
      if (!isOnMicRef.current) return;
      // Clean old connection
      const oldPc = peersRef.current.get(peerId);
      if (oldPc) { oldPc.close(); peersRef.current.delete(peerId); }
      remoteAnalysersRef.current.delete(peerId);
      createPeerConnection(peerId, true);
    }, RECONNECT_DELAY * (attempts + 1));
  }, []);

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    if (!roomId || !currentUserId) return null;

    const existingPc = peersRef.current.get(peerId);
    if (existingPc) { existingPc.close(); peersRef.current.delete(peerId); }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
      // Set bitrate constraint for mobile efficiency
      const sender = pc.getSenders().find(s => s.track?.kind === "audio");
      if (sender) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = 32000; // 32kbps for voice
        sender.setParameters(params).catch(() => {});
      }
    } else {
      console.warn("[WebRTC] No local stream for", peerId);
    }

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      let audio = remoteAudiosRef.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.volume = 1.0;
        remoteAudiosRef.current.set(peerId, audio);
      }
      audio.srcObject = remoteStream;
      audio.play().catch(e => console.warn("[WebRTC] Audio play failed:", e));
      setupRemoteAnalyser(peerId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: {
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
            from: currentUserId,
            to: peerId,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("[WebRTC] Connection state with", peerId, ":", state);
      if (state === "connected") {
        setConnectedPeers(prev => { const n = new Set(prev); n.add(peerId); return n; });
        reconnectAttemptsRef.current.delete(peerId);
      } else if (state === "disconnected") {
        // Wait briefly — may recover on its own
        setTimeout(() => {
          if (pc.connectionState === "disconnected" && isOnMicRef.current) {
            attemptReconnect(peerId);
          }
        }, 3000);
      } else if (state === "failed") {
        setConnectedPeers(prev => { const n = new Set(prev); n.delete(peerId); return n; });
        remoteAnalysersRef.current.delete(peerId);
        if (isOnMicRef.current) attemptReconnect(peerId);
      } else if (state === "closed") {
        setConnectedPeers(prev => { const n = new Set(prev); n.delete(peerId); return n; });
        remoteAnalysersRef.current.delete(peerId);
      }
    };

    peersRef.current.set(peerId, pc);

    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true }).then(offer => {
        pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: { type: "offer", sdp: offer, from: currentUserId, to: peerId },
        });
      });
    }

    return pc;
  }, [roomId, currentUserId, setupRemoteAnalyser, attemptReconnect]);

  // Mute/unmute
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Signaling channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`webrtc-${roomId}`);

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }) => {
      if (!payload || payload.to !== currentUserId) return;
      const { type, from } = payload;

      if (type === "offer") {
        if (!isOnMicRef.current) return;
        let pc = peersRef.current.get(from);
        if (!pc) pc = createPeerConnection(from, false);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: { type: "answer", sdp: answer, from: currentUserId, to: from },
        });
      } else if (type === "answer") {
        const pc = peersRef.current.get(from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } else if (type === "ice-candidate") {
        const pc = peersRef.current.get(from);
        if (pc) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
          catch (e) { console.warn("[WebRTC] Failed to add ICE candidate:", e); }
        }
      }
    });

    channel.on("broadcast", { event: "mic-announce" }, async ({ payload }) => {
      if (payload.userId !== currentUserId && isOnMicRef.current) {
        await startLocalStream();
        if (!peersRef.current.has(payload.userId)) {
          createPeerConnection(payload.userId, true);
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (isOnMicRef.current) {
          await startLocalStream();
          setTimeout(() => {
            channel.send({
              type: "broadcast",
              event: "mic-announce",
              payload: { userId: currentUserId },
            });
          }, 500);
        }
      }
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, currentUserId, createPeerConnection, startLocalStream]);

  // Handle mic on/off
  useEffect(() => {
    if (isOnMic) {
      startLocalStream().then(stream => {
        if (stream) {
          setTimeout(() => {
            channelRef.current?.send({
              type: "broadcast",
              event: "mic-announce",
              payload: { userId: currentUserId },
            });
          }, 800);
        }
      });
    } else {
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      remoteAudiosRef.current.forEach(audio => { audio.srcObject = null; audio.remove(); });
      remoteAudiosRef.current.clear();
      remoteAnalysersRef.current.clear();
      reconnectAttemptsRef.current.clear();
      setConnectedPeers(new Set());
      stopLocalStream();
    }
  }, [isOnMic, currentUserId, startLocalStream, stopLocalStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      remoteAudiosRef.current.forEach(audio => { audio.srcObject = null; audio.remove(); });
      remoteAudiosRef.current.clear();
      remoteAnalysersRef.current.clear();
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      stopLocalStream();
    };
  }, [stopLocalStream]);

  return { connectedPeers, speakingPeers, localSpeaking, startLocalStream, stopLocalStream };
};
