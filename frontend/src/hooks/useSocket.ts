import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { VideoState, MemberInfo, ChatMessage, WbItem } from '../types/socket';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface UseSocketReturn {
  socketRef: React.MutableRefObject<Socket | null>;
  connected: boolean;
  members: MemberInfo[];
  messages: ChatMessage[];
  videoState: VideoState | null;
  sendMessage: (text: string) => void;
  /** Latest URL received from a video:urlChanged broadcast (null until first change) */
  changedVideoUrl: string | null;
  /** True when the room has been deleted by the host */
  roomDeleted: boolean;
  /** Whiteboard items from server at join time */
  wbItems: WbItem[];
  /** Socket ID of the current screen sharer, null if nobody is sharing */
  screenSharerId: string | null;
}

export function useSocket(roomId: string): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [videoState, setVideoState] = useState<VideoState | null>(null);
  const [changedVideoUrl, setChangedVideoUrl] = useState<string | null>(null);
  const [roomDeleted, setRoomDeleted] = useState(false);
  const [wbItems, setWbItems] = useState<WbItem[]>([]);
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit(
        'joinRoom',
        { roomId },
        (res: {
          state: VideoState;
          members: MemberInfo[];
          messages: ChatMessage[];
          wbItems: WbItem[];
          screenSharerId: string | null;
        }) => {
          if (res) {
            setVideoState(res.state);
            setMembers(res.members ?? []);
            setMessages(res.messages ?? []);
            setWbItems(res.wbItems ?? []);
            setScreenSharerId(res.screenSharerId ?? null);
          }
        },
      );
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('members:update', (newMembers: MemberInfo[]) => {
      setMembers(newMembers);
    });

    socket.on('chat:receive', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Register here (not in RoomPage) so the listener is always active
    socket.on('video:urlChanged', ({ videoUrl }: { videoUrl: string }) => {
      setChangedVideoUrl(videoUrl);
    });

    socket.on('room:deleted', () => {
      setRoomDeleted(true);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      socketRef.current?.emit('chat:send', { roomId, message: text });
    },
    [roomId],
  );

  return { socketRef, connected, members, messages, videoState, sendMessage, changedVideoUrl, roomDeleted, wbItems, screenSharerId };
}
