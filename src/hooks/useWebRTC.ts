import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseWebRTCOptions {
  roomId: string | null;
  currentUserId: string | null;
  isOnMic: boolean;
  isMuted: boolean;
}

export const useWebRTC = ({ roomId, currentUserId, isOnMic, isMuted }: UseWebRTCOptions) => {
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const channelRef = useRef<any>(null);
  const isOnMicRef = useRef(isOnMic);

  // Keep ref in sync
  useEffect(() => {
    isOnMicRef.current = isOnMic;
  }, [isOnMic]);

  // Start local audio stream
  const startLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });
      localStreamRef.current = stream;
      // Set initial mute state
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      return stream;
    } catch (err) {
      console.error("Failed to get audio stream:", err);
      return null;
    }
  }, []);

  // Stop local audio stream
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    if (!roomId || !currentUserId) return null;

    // Close existing connection if any
    const existingPc = peersRef.current.get(peerId);
    if (existingPc) {
      existingPc.close();
      peersRef.current.delete(peerId);
    }
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    // Add local stream tracks - CRITICAL for audio to work
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
      console.log("[WebRTC] Added local tracks to peer connection for", peerId);
    } else {
      console.warn("[WebRTC] No local stream when creating peer connection for", peerId);
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track from", peerId);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        let audio = remoteAudiosRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audio.volume = 1.0;
          remoteAudiosRef.current.set(peerId, audio);
        }
        audio.srcObject = remoteStream;
        audio.play().catch((e) => console.warn("[WebRTC] Audio play failed:", e));
      }
    };

    // Handle ICE candidates
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
      console.log("[WebRTC] Connection state with", peerId, ":", pc.connectionState);
      if (pc.connectionState === "connected") {
        setConnectedPeers((prev) => { const n = new Set(prev); n.add(peerId); return n; });
      } else if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setConnectedPeers((prev) => {
          const next = new Set(prev);
          next.delete(peerId);
          return next;
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state with", peerId, ":", pc.iceConnectionState);
    };

    peersRef.current.set(peerId, pc);

    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true }).then((offer) => {
        pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: {
            type: "offer",
            sdp: offer,
            from: currentUserId,
            to: peerId,
          },
        });
        console.log("[WebRTC] Sent offer to", peerId);
      });
    }

    return pc;
  }, [roomId, currentUserId]);

  // Mute/unmute local stream
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      console.log("[WebRTC] Mute state:", isMuted);
    }
  }, [isMuted]);

  // Setup signaling channel
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`webrtc-${roomId}`);

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }) => {
      if (!payload || payload.to !== currentUserId) return;

      const { type, from } = payload;
      console.log("[WebRTC] Received signal:", type, "from", from);

      if (type === "offer") {
        // Only accept offers if we're on mic
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
        console.log("[WebRTC] Sent answer to", from);
      } else if (type === "answer") {
        const pc = peersRef.current.get(from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      } else if (type === "ice-candidate") {
        const pc = peersRef.current.get(from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("[WebRTC] Failed to add ICE candidate:", e);
          }
        }
      }
    });

    // Announce presence on mic
    channel.on("broadcast", { event: "mic-announce" }, async ({ payload }) => {
      if (payload.userId !== currentUserId && isOnMicRef.current) {
        console.log("[WebRTC] Peer announced on mic:", payload.userId);
        // Ensure we have local stream before connecting
        await startLocalStream();
        if (!peersRef.current.has(payload.userId)) {
          createPeerConnection(payload.userId, true);
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        console.log("[WebRTC] Signaling channel subscribed");
        if (isOnMicRef.current) {
          await startLocalStream();
          // Small delay to ensure stream is ready
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
      startLocalStream().then((stream) => {
        if (stream) {
          console.log("[WebRTC] Local stream ready, announcing on mic");
          // Announce after a short delay to ensure channel is ready
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
      // Leave mic - close all peer connections and stop stream
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      remoteAudiosRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      remoteAudiosRef.current.clear();
      setConnectedPeers(new Set());
      stopLocalStream();
    }
  }, [isOnMic, currentUserId, startLocalStream, stopLocalStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      remoteAudiosRef.current.forEach((audio) => {
        audio.srcObject = null;
        audio.remove();
      });
      remoteAudiosRef.current.clear();
      stopLocalStream();
    };
  }, [stopLocalStream]);

  return { connectedPeers, startLocalStream, stopLocalStream };
};
