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

  const createPeerConnection = useCallback((peerId: string, isInitiator: boolean) => {
    if (!roomId || !currentUserId) return null;
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteStream) {
        let audio = remoteAudiosRef.current.get(peerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          remoteAudiosRef.current.set(peerId, audio);
        }
        audio.srcObject = remoteStream;
        audio.play().catch(() => {});
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
            candidate: event.candidate,
            from: currentUserId,
            to: peerId,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
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

    peersRef.current.set(peerId, pc);

    if (isInitiator) {
      pc.createOffer().then((offer) => {
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
      });
    }

    return pc;
  }, [roomId, currentUserId]);

  // Start local audio stream
  const startLocalStream = useCallback(async () => {
    try {
      if (localStreamRef.current) return localStreamRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
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

  // Mute/unmute local stream
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Setup signaling channel and handle mic state
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const channel = supabase.channel(`webrtc-${roomId}-${Date.now()}`);

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }) => {
      if (!payload || payload.to !== currentUserId) return;

      const { type, from } = payload;

      if (type === "offer") {
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
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (type === "ice-candidate") {
        const pc = peersRef.current.get(from);
        if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    // Announce presence on mic
    channel.on("broadcast", { event: "mic-announce" }, ({ payload }) => {
      if (payload.userId !== currentUserId && isOnMic) {
        // Another user announced they're on mic, connect to them
        if (!peersRef.current.has(payload.userId)) {
          createPeerConnection(payload.userId, true);
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && isOnMic) {
        await startLocalStream();
        // Announce that we're on mic
        channel.send({
          type: "broadcast",
          event: "mic-announce",
          payload: { userId: currentUserId },
        });
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, isOnMic, createPeerConnection, startLocalStream]);

  // Handle mic on/off
  useEffect(() => {
    if (isOnMic) {
      startLocalStream().then(() => {
        // Re-announce on mic
        channelRef.current?.send({
          type: "broadcast",
          event: "mic-announce",
          payload: { userId: currentUserId },
        });
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
