import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const STUN: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

type Signal =
  | RTCSessionDescriptionInit
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

export interface UseScreenShareReturn {
  sharing: boolean;
  remoteStream: MediaStream | null;
  sharerName: string | null;
  startShare: () => Promise<void>;
  stopShare: () => void;
  shareError: string | null;
}

export function useScreenShare(
  socketRef: React.MutableRefObject<Socket | null>,
  roomId: string,
  initialSharerId: string | null,
): UseScreenShareReturn {
  const [sharing, setSharing] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sharerName, setSharerName] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const isSharerRef = useRef(false);

  const closePeer = (id: string) => {
    peersRef.current.get(id)?.close();
    peersRef.current.delete(id);
  };

  const cleanupLocal = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    isSharerRef.current = false;
    setSharing(false);
  }, []);

  const createViewerPeer = useCallback(
    (sharerId: string, socket: Socket): RTCPeerConnection => {
      closePeer(sharerId);
      const pc = new RTCPeerConnection(STUN);
      peersRef.current.set(sharerId, pc);

      pc.ontrack = (e) => setRemoteStream(e.streams[0] ?? null);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('screen:signal', {
            to: sharerId,
            signal: { type: 'ice-candidate', candidate: e.candidate.toJSON() },
          });
        }
      };

      return pc;
    },
    [],
  );

  const createSharerPeer = useCallback(
    (viewerId: string, socket: Socket, stream: MediaStream) => {
      closePeer(viewerId);
      const pc = new RTCPeerConnection(STUN);
      peersRef.current.set(viewerId, pc);

      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('screen:signal', {
            to: viewerId,
            signal: { type: 'ice-candidate', candidate: e.candidate.toJSON() },
          });
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer).then(() => offer))
        .then((offer) => socket.emit('screen:signal', { to: viewerId, signal: offer }))
        .catch(console.error);

      return pc;
    },
    [],
  );

  // Register socket listeners once; use refs so callbacks always see fresh state
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onSharing = ({ sharerId, displayName }: { sharerId: string; displayName: string }) => {
      setSharerName(displayName);
      if (isSharerRef.current) return;
      createViewerPeer(sharerId, socket);
      socket.emit('screen:join', { roomId });
    };

    const onStopped = () => {
      if (isSharerRef.current) return;
      for (const id of peersRef.current.keys()) closePeer(id);
      setRemoteStream(null);
      setSharerName(null);
    };

    const onViewerJoin = ({ viewerId }: { viewerId: string }) => {
      if (!isSharerRef.current || !localStreamRef.current) return;
      createSharerPeer(viewerId, socket, localStreamRef.current);
    };

    const onSignal = async ({ from, signal }: { from: string; signal: Signal }) => {
      const pc = peersRef.current.get(from);
      if (!pc) return;
      try {
        if (signal.type === 'ice-candidate') {
          await pc.addIceCandidate(
            new RTCIceCandidate((signal as { type: 'ice-candidate'; candidate: RTCIceCandidateInit }).candidate),
          );
        } else if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('screen:signal', { to: from, signal: answer });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
        }
      } catch (err) {
        console.error('[screen:signal]', err);
      }
    };

    socket.on('screen:sharing', onSharing);
    socket.on('screen:stopped', onStopped);
    socket.on('screen:viewer-join', onViewerJoin);
    socket.on('screen:signal', onSignal);

    return () => {
      socket.off('screen:sharing', onSharing);
      socket.off('screen:stopped', onStopped);
      socket.off('screen:viewer-join', onViewerJoin);
      socket.off('screen:signal', onSignal);
    };
  }, [roomId, createViewerPeer, createSharerPeer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to sharer if one was already sharing when we joined the room
  useEffect(() => {
    if (!initialSharerId) return;
    const socket = socketRef.current;
    if (!socket) return;
    createViewerPeer(initialSharerId, socket);
    socket.emit('screen:join', { roomId });
  }, [initialSharerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopShare = useCallback(() => {
    const socket = socketRef.current;
    socket?.emit('screen:stop', { roomId });
    for (const id of peersRef.current.keys()) closePeer(id);
    cleanupLocal();
  }, [roomId, cleanupLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  const startShare = useCallback(async () => {
    setShareError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch {
      setShareError('Không thể truy cập màn hình');
      return;
    }

    localStreamRef.current = stream;
    isSharerRef.current = true;

    // If user stops via browser's built-in stop button
    stream.getVideoTracks()[0].addEventListener('ended', () => stopShare(), { once: true });

    const socket = socketRef.current;
    if (!socket) { cleanupLocal(); return; }

    const res = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      socket.emit('screen:start', { roomId }, resolve);
      // Fallback if server doesn't respond
      setTimeout(() => resolve({ ok: false, error: 'Timeout' }), 5000);
    });

    if (!res.ok) {
      stream.getTracks().forEach((t) => t.stop());
      cleanupLocal();
      setShareError(res.error ?? 'Không thể chia sẻ màn hình');
      return;
    }

    setSharing(true);
  }, [roomId, stopShare, cleanupLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    for (const id of peersRef.current.keys()) closePeer(id);
    cleanupLocal();
  }, [cleanupLocal]);

  return { sharing, remoteStream, sharerName, startShare, stopShare, shareError };
}
