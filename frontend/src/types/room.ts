export interface Room {
  id: string;
  roomId: string;
  name: string;
  videoUrl: string;
  hasPassword: boolean;
  isPublic: boolean;
  mode: 'host_only' | 'collaborative';
  host: {
    id: string;
    displayName: string;
    avatar: string;
  };
  hostId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomData {
  name: string;
  videoUrl: string;
  password?: string;
  isPublic?: boolean;
  mode?: 'host_only' | 'collaborative';
}
