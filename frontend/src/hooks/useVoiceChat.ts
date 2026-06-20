import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const STUN: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

type Signal =
  | RTCSessionDescriptionInit
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit };

export interface VoiceMember {
  socketId: string;
  displayName: string;
  stream: MediaStream | null;
}

export interface UseVoiceChatReturn {
  inVoice: boolean;
  voiceMembers: VoiceMember[];
  micMuted: boolean;
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  toggleMic: () => void;
  voiceError: string | null;
}

export function useVoiceChat(
  socketRef: React.MutableRefObject<Socket | null>,
  roomId: string,
): UseVoiceChatReturn {
  const [inVoice, setInVoice] = useState(false);
  const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const inVoiceRef = useRef(false);

  const closePeerConn = (socketId: string) => {
    peersRef.current.get(socketId)?.close();
    peersRef.current.delete(socketId);
  };

  const removeMember = useCallback((socketId: string) => {
    closePeerConn(socketId);
    setVoiceMembers(prev => prev.filter(m => m.socketId !== socketId));
  }, []);

  const createPeer = useCallback((
    remoteId: string,
    initiator: boolean,
    socket: Socket,
    displayName: string,
  ): RTCPeerConnection => {
    closePeerConn(remoteId);
    const pc = new RTCPeerConnection(STUN);
    peersRef.current.set(remoteId, pc);

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      setVoiceMembers(prev => {
        const i = prev.findIndex(m => m.socketId === remoteId);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], stream };
          return next;
        }
        return [...prev, { socketId: remoteId, displayName, stream }];
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice:signal', {
          to: remoteId,
          signal: { type: 'ice-candidate', candidate: e.candidate.toJSON() },
        });
      }
    };

    if (initiator) {
      pc.createOffer()
        .then(o => pc.setLocalDescription(o).then(() => o))
        .then(o => socket.emit('voice:signal', { to: remoteId, signal: o }))
        .catch(console.error);
    }

    return pc;
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onJoined = ({ socketId, displayName }: { socketId: string; displayName: string }) => {
      if (!inVoiceRef.current) return;
      setVoiceMembers(prev => {
        if (prev.some(m => m.socketId === socketId)) return prev;
        return [...prev, { socketId, displayName, stream: null }];
      });
    };

    const onLeft = ({ socketId }: { socketId: string }) => removeMember(socketId);

    const onSignal = async ({ from, signal, displayName }: { from: string; signal: Signal; displayName?: string }) => {
      if (!inVoiceRef.current) return;
      let pc = peersRef.current.get(from);

      if (!pc && (signal as RTCSessionDescriptionInit).type === 'offer') {
        pc = createPeer(from, false, socket, displayName ?? '');
        setVoiceMembers(prev => {
          if (prev.some(m => m.socketId === from)) return prev;
          return [...prev, { socketId: from, displayName: displayName ?? '', stream: null }];
        });
      }

      if (!pc) return;
      try {
        const s = signal as { type: string; candidate?: RTCIceCandidateInit };
        if (s.type === 'ice-candidate' && s.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(s.candidate));
        } else if (s.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          socket.emit('voice:signal', { to: from, signal: ans });
        } else if (s.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal as RTCSessionDescriptionInit));
        }
      } catch (err) {
        console.error('[voice:signal]', err);
      }
    };

    socket.on('voice:member-joined', onJoined);
    socket.on('voice:member-left', onLeft);
    socket.on('voice:signal', onSignal);
    return () => {
      socket.off('voice:member-joined', onJoined);
      socket.off('voice:member-left', onLeft);
      socket.off('voice:signal', onSignal);
    };
  }, [roomId, createPeer, removeMember]); // eslint-disable-line react-hooks/exhaustive-deps

  const leaveVoice = useCallback(() => {
    socketRef.current?.emit('voice:leave', { roomId });
    for (const id of [...peersRef.current.keys()]) closePeerConn(id);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    inVoiceRef.current = false;
    setInVoice(false);
    setVoiceMembers([]);
    setMicMuted(false);
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const joinVoice = useCallback(async () => {
    setVoiceError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setVoiceError('Không thể truy cập microphone. Vui lòng cấp quyền.');
      return;
    }
    localStreamRef.current = stream;

    const socket = socketRef.current;
    if (!socket) { leaveVoice(); return; }

    const res = await new Promise<{ members: Array<{ socketId: string; displayName: string }> }>((resolve) => {
      socket.emit('voice:join', { roomId }, (d: { members: Array<{ socketId: string; displayName: string }> }) =>
        resolve(d ?? { members: [] }),
      );
      setTimeout(() => resolve({ members: [] }), 5000);
    });

    inVoiceRef.current = true;
    setInVoice(true);

    for (const m of res.members) {
      createPeer(m.socketId, true, socket, m.displayName);
      setVoiceMembers(prev => {
        if (prev.some(x => x.socketId === m.socketId)) return prev;
        return [...prev, { socketId: m.socketId, displayName: m.displayName, stream: null }];
      });
    }
  }, [roomId, leaveVoice, createPeer]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicMuted(!track.enabled);
  }, []);

  useEffect(() => () => {
    if (inVoiceRef.current) leaveVoice();
  }, [leaveVoice]);

  return { inVoice, voiceMembers, micMuted, joinVoice, leaveVoice, toggleMic, voiceError };
}
