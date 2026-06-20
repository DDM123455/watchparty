export interface WbItem {
  id: string;
  tool: 'pen' | 'eraser' | 'text';
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  text?: string;
  fontSize?: number;
}

export interface VideoState {
  isPlaying: boolean;
  timestamp: number;
  updatedAt: number;
}

export interface MemberInfo {
  id: string;
  displayName: string;
  avatar: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  user: MemberInfo;
  createdAt: string;
}
