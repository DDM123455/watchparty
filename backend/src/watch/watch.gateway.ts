import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RoomsService } from '../rooms/rooms.service';
import { WatchService } from './watch.service';
import type { User } from '../users/user.entity';
import type { VideoState, MemberInfo, WbItem } from './types';

interface AuthSocket extends Socket {
  data: {
    user?: User;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class WatchGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // roomId (short 8-char) → VideoState
  private readonly roomStates = new Map<string, VideoState>();
  // roomId (short) → Map<userId, MemberInfo>
  private readonly roomMembers = new Map<string, Map<string, MemberInfo>>();
  // socketId → Set of roomIds this socket is in
  private readonly socketRooms = new Map<string, Set<string>>();
  // roomId (short) → host's User UUID
  private readonly roomHosts = new Map<string, string>();
  // roomId (short) → Room DB UUID (for message FK)
  private readonly roomDbIds = new Map<string, string>();
  // roomId (short) → control mode
  private readonly roomModes = new Map<string, 'host_only' | 'collaborative'>();
  // roomId → whiteboard items
  private readonly roomWhiteboards = new Map<string, WbItem[]>();
  // roomId → socketId of current screen sharer (null = no one sharing)
  private readonly roomScreenSharerId = new Map<string, string>();
  // socketId → roomId where this socket is screen sharing
  private readonly socketScreenRoom = new Map<string, string>();
  // roomId → Map<socketId, displayName> for voice chat members
  private readonly roomVoiceMembers = new Map<string, Map<string, string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly watchService: WatchService,
  ) {}

  async handleConnection(socket: AuthSocket): Promise<void> {
    // Auth is deferred to joinRoom — allows socket.io transport to establish
    // before verifying credentials (avoids 400 loops from StrictMode double-invoke)
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const token = this.extractToken(cookieHeader);
      if (!token) return;
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (user) socket.data.user = user;
    } catch {
      // Will be caught in joinRoom
    }
  }

  handleDisconnect(socket: AuthSocket): void {
    // If this socket was sharing screen, stop the share for the room
    const screenRoom = this.socketScreenRoom.get(socket.id);
    if (screenRoom) {
      this.clearScreenShare(socket.id, screenRoom);
      this.server.to(screenRoom).emit('screen:stopped');
    }

    const rooms = this.socketRooms.get(socket.id);
    if (!rooms) return;

    const user = socket.data.user;
    if (user) {
      for (const roomId of rooms) {
        this.removeMember(roomId, user.id);
        this.removeVoiceMember(socket.id, roomId);
      }
    }

    this.socketRooms.delete(socket.id);
  }

  @SubscribeMessage('joinRoom')
  async joinRoom(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    let user = socket.data.user;

    // Retry auth in case handleConnection raced ahead of the cookie arriving
    if (!user) {
      try {
        const cookieHeader = socket.handshake.headers.cookie ?? '';
        const token = this.extractToken(cookieHeader);
        if (token) {
          const payload2 = this.jwtService.verify<{ sub: string }>(token);
          user = await this.usersService.findById(payload2.sub) ?? undefined;
          if (user) socket.data.user = user;
        }
      } catch { /* token invalid */ }
    }

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Cache room metadata if not yet seen
    if (!this.roomHosts.has(roomId)) {
      const room = await this.roomsService.findByRoomId(roomId);
      this.roomHosts.set(roomId, room.hostId);
      this.roomDbIds.set(roomId, room.id);
      this.roomModes.set(roomId, room.mode ?? 'host_only');
    }

    socket.join(roomId);

    if (!this.socketRooms.has(socket.id)) {
      this.socketRooms.set(socket.id, new Set());
    }
    this.socketRooms.get(socket.id)!.add(roomId);

    if (!this.roomMembers.has(roomId)) {
      this.roomMembers.set(roomId, new Map());
    }
    this.roomMembers.get(roomId)!.set(user.id, {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
    });

    const members = Array.from(this.roomMembers.get(roomId)!.values());
    this.server.to(roomId).emit('members:update', members);

    const state: VideoState = this.roomStates.get(roomId) ?? {
      isPlaying: false,
      timestamp: 0,
      updatedAt: Date.now(),
    };

    const roomDbId = this.roomDbIds.get(roomId)!;
    const recentMsgs = await this.watchService.getRecentMessages(roomDbId);
    const messages = recentMsgs.map((m) => ({
      id: m.id,
      content: m.content,
      user: {
        id: m.user.id,
        displayName: m.user.displayName,
        avatar: m.user.avatar,
      },
      createdAt: m.createdAt,
    }));

    return {
      state,
      members,
      messages,
      wbItems: this.roomWhiteboards.get(roomId) ?? [],
      screenSharerId: this.roomScreenSharerId.get(roomId) ?? null,
    };
  }

  @SubscribeMessage('video:play')
  handleVideoPlay(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; timestamp: number },
  ): void {
    if (!this.canControl(socket, payload.roomId)) return;

    this.roomStates.set(payload.roomId, {
      isPlaying: true,
      timestamp: payload.timestamp,
      updatedAt: Date.now(),
    });

    socket.to(payload.roomId).emit('video:play', {
      timestamp: payload.timestamp,
      serverTime: Date.now(),
    });
  }

  @SubscribeMessage('video:pause')
  handleVideoPause(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; timestamp: number },
  ): void {
    if (!this.canControl(socket, payload.roomId)) return;

    this.roomStates.set(payload.roomId, {
      isPlaying: false,
      timestamp: payload.timestamp,
      updatedAt: Date.now(),
    });

    socket.to(payload.roomId).emit('video:pause', {
      timestamp: payload.timestamp,
    });
  }

  @SubscribeMessage('video:seek')
  handleVideoSeek(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; timestamp: number },
  ): void {
    if (!this.canControl(socket, payload.roomId)) return;

    const prev = this.roomStates.get(payload.roomId);
    this.roomStates.set(payload.roomId, {
      isPlaying: prev?.isPlaying ?? false,
      timestamp: payload.timestamp,
      updatedAt: Date.now(),
    });

    socket.to(payload.roomId).emit('video:seek', {
      timestamp: payload.timestamp,
    });
  }

  @SubscribeMessage('video:heartbeat')
  handleVideoHeartbeat(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; timestamp: number },
  ): void {
    if (!this.canControl(socket, payload.roomId)) return;

    const prev = this.roomStates.get(payload.roomId);
    if (prev?.isPlaying) {
      this.roomStates.set(payload.roomId, {
        ...prev,
        timestamp: payload.timestamp,
        updatedAt: Date.now(),
      });
    }

    socket.to(payload.roomId).emit('video:heartbeat', {
      timestamp: payload.timestamp,
      serverTime: Date.now(),
    });
  }

  @SubscribeMessage('video:changeUrl')
  async handleChangeVideoUrl(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; videoUrl: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = socket.data.user;
    if (!user) return { ok: false, error: 'Not authenticated' };

    // Repopulate cache if it was cleared (e.g. everyone left briefly)
    if (!this.roomHosts.has(payload.roomId)) {
      try {
        const room = await this.roomsService.findByRoomId(payload.roomId);
        this.roomHosts.set(payload.roomId, room.hostId);
        this.roomDbIds.set(payload.roomId, room.id);
        this.roomModes.set(payload.roomId, room.mode ?? 'host_only');
      } catch {
        return { ok: false, error: 'Room not found' };
      }
    }

    if (!this.canControl(socket, payload.roomId)) {
      return { ok: false, error: 'Only the host can change the video' };
    }

    const videoUrl = payload.videoUrl?.trim();
    if (!videoUrl) return { ok: false, error: 'Invalid URL' };

    await this.roomsService.updateVideoUrl(payload.roomId, videoUrl);

    this.roomStates.set(payload.roomId, {
      isPlaying: false,
      timestamp: 0,
      updatedAt: Date.now(),
    });

    // Broadcast to entire room including host (server-as-source-of-truth)
    this.server.to(payload.roomId).emit('video:urlChanged', { videoUrl });

    return { ok: true };
  }

  @SubscribeMessage('video:state')
  handleVideoState(
    @MessageBody() payload: { roomId: string },
  ): VideoState {
    return (
      this.roomStates.get(payload.roomId) ?? {
        isPlaying: false,
        timestamp: 0,
        updatedAt: Date.now(),
      }
    );
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; message: string },
  ): Promise<void> {
    const user = socket.data.user;
    const roomDbId = this.roomDbIds.get(payload.roomId);
    if (!user || !roomDbId || !payload.message?.trim()) return;

    const saved = await this.watchService.saveMessage({
      content: payload.message.trim(),
      userId: user.id,
      roomId: roomDbId,
    });

    this.server.to(payload.roomId).emit('chat:receive', {
      id: saved.id,
      content: saved.content,
      user: {
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
      },
      createdAt: saved.createdAt,
    });
  }

  // ── Whiteboard ─────────────────────────────────────────────────────────────

  @SubscribeMessage('wb:stroke')
  handleWbStroke(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string; item: WbItem },
  ): void {
    if (!socket.data.user) return;
    const items = this.roomWhiteboards.get(payload.roomId) ?? [];
    items.push(payload.item);
    this.roomWhiteboards.set(payload.roomId, items);
    socket.to(payload.roomId).emit('wb:stroke', payload.item);
  }

  @SubscribeMessage('wb:clear')
  handleWbClear(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    if (!socket.data.user) return;
    this.roomWhiteboards.set(payload.roomId, []);
    socket.to(payload.roomId).emit('wb:clear');
  }

  // ── Screen Share ────────────────────────────────────────────────────────────

  @SubscribeMessage('screen:start')
  handleScreenStart(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): { ok: boolean; error?: string } {
    if (!socket.data.user) return { ok: false, error: 'Not authenticated' };
    const existing = this.roomScreenSharerId.get(payload.roomId);
    if (existing && existing !== socket.id) {
      return { ok: false, error: 'Đang có người chia sẻ màn hình' };
    }
    this.roomScreenSharerId.set(payload.roomId, socket.id);
    this.socketScreenRoom.set(socket.id, payload.roomId);
    socket.to(payload.roomId).emit('screen:sharing', {
      sharerId: socket.id,
      displayName: socket.data.user.displayName,
    });
    return { ok: true };
  }

  @SubscribeMessage('screen:stop')
  handleScreenStop(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    this.clearScreenShare(socket.id, payload.roomId);
    this.server.to(payload.roomId).emit('screen:stopped');
  }

  @SubscribeMessage('screen:join')
  handleScreenJoin(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    const sharerId = this.roomScreenSharerId.get(payload.roomId);
    if (!sharerId || sharerId === socket.id) return;
    this.server.to(sharerId).emit('screen:viewer-join', { viewerId: socket.id });
  }

  @SubscribeMessage('screen:signal')
  handleScreenSignal(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { to: string; signal: unknown },
  ): void {
    this.server.to(payload.to).emit('screen:signal', {
      from: socket.id,
      signal: payload.signal,
    });
  }

  // ── Voice Chat ──────────────────────────────────────────────────────────────

  @SubscribeMessage('voice:join')
  handleVoiceJoin(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): { members: Array<{ socketId: string; displayName: string }> } {
    if (!socket.data.user) return { members: [] };

    if (!this.roomVoiceMembers.has(payload.roomId)) {
      this.roomVoiceMembers.set(payload.roomId, new Map());
    }
    const voiceMap = this.roomVoiceMembers.get(payload.roomId)!;

    const existing = Array.from(voiceMap.entries()).map(([socketId, displayName]) => ({ socketId, displayName }));
    voiceMap.set(socket.id, socket.data.user.displayName);

    socket.to(payload.roomId).emit('voice:member-joined', {
      socketId: socket.id,
      displayName: socket.data.user.displayName,
    });

    return { members: existing };
  }

  @SubscribeMessage('voice:leave')
  handleVoiceLeave(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { roomId: string },
  ): void {
    this.removeVoiceMember(socket.id, payload.roomId);
  }

  @SubscribeMessage('voice:signal')
  handleVoiceSignal(
    @ConnectedSocket() socket: AuthSocket,
    @MessageBody() payload: { to: string; signal: unknown },
  ): void {
    this.server.to(payload.to).emit('voice:signal', {
      from: socket.id,
      signal: payload.signal,
      displayName: socket.data.user?.displayName ?? '',
    });
  }

  private isHost(socket: AuthSocket, roomId: string): boolean {
    const hostId = this.roomHosts.get(roomId);
    return !!hostId && socket.data.user?.id === hostId;
  }

  private canControl(socket: AuthSocket, roomId: string): boolean {
    if (this.roomModes.get(roomId) === 'collaborative') return !!socket.data.user;
    return this.isHost(socket, roomId);
  }

  private removeMember(roomId: string, userId: string): void {
    const members = this.roomMembers.get(roomId);
    if (!members) return;

    members.delete(userId);

    if (members.size === 0) {
      this.roomMembers.delete(roomId);
      this.roomStates.delete(roomId);
      this.roomHosts.delete(roomId);
      this.roomDbIds.delete(roomId);
      this.roomModes.delete(roomId);
      this.roomWhiteboards.delete(roomId);
      this.roomScreenSharerId.delete(roomId);
      this.roomVoiceMembers.delete(roomId);
    } else {
      this.server
        .to(roomId)
        .emit('members:update', Array.from(members.values()));
    }
  }

  private removeVoiceMember(socketId: string, roomId: string): void {
    const voiceMap = this.roomVoiceMembers.get(roomId);
    if (!voiceMap?.has(socketId)) return;
    voiceMap.delete(socketId);
    this.server.to(roomId).emit('voice:member-left', { socketId });
  }

  /** Called by RoomsController after DB deletion — notifies and cleans up in-memory state. */
  kickRoom(roomId: string): void {
    this.server.to(roomId).emit('room:deleted');
    this.roomMembers.delete(roomId);
    this.roomStates.delete(roomId);
    this.roomHosts.delete(roomId);
    this.roomDbIds.delete(roomId);
    this.roomModes.delete(roomId);
    this.roomWhiteboards.delete(roomId);
    this.roomScreenSharerId.delete(roomId);
    this.roomVoiceMembers.delete(roomId);
  }

  private clearScreenShare(socketId: string, roomId: string): void {
    this.socketScreenRoom.delete(socketId);
    if (this.roomScreenSharerId.get(roomId) === socketId) {
      this.roomScreenSharerId.delete(roomId);
    }
  }

  private extractToken(cookieHeader: string): string | null {
    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? match[1] : null;
  }
}
