import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomsRepo: Repository<Room>,
    private readonly jwtService: JwtService,
  ) {}

  async create(hostId: string, dto: CreateRoomDto): Promise<Room> {
    const roomId = nanoid(8);

    const room = this.roomsRepo.create({
      roomId,
      name: dto.name,
      videoUrl: dto.videoUrl,
      hasPassword: !!dto.password,
      isPublic: dto.isPublic ?? true,
      mode: dto.mode ?? 'host_only',
      hostId,
    });

    if (dto.password) {
      room.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.roomsRepo.save(room);
  }

  async findPublicRooms(): Promise<Room[]> {
    return this.roomsRepo.find({
      where: { isPublic: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRoomId(roomId: string): Promise<Room> {
    const room = await this.roomsRepo.findOne({ where: { roomId } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async updateVideoUrl(roomId: string, videoUrl: string): Promise<void> {
    await this.roomsRepo.update({ roomId }, { videoUrl });
  }

  async deleteRoom(roomId: string, requesterId: string): Promise<void> {
    const room = await this.roomsRepo.findOne({ where: { roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== requesterId) throw new ForbiddenException('Only the host can delete this room');
    await this.roomsRepo.delete({ roomId });
  }

  async joinRoom(
    roomId: string,
    userId: string,
    dto: JoinRoomDto,
  ): Promise<{ roomToken: string }> {
    // Load passwordHash explicitly (excluded from default select)
    const room = await this.roomsRepo
      .createQueryBuilder('room')
      .addSelect('room.passwordHash')
      .where('room.roomId = :roomId', { roomId })
      .getOne();

    if (!room) throw new NotFoundException('Room not found');

    if (room.hasPassword) {
      if (!dto.password) throw new ForbiddenException('Password required');
      const valid = await bcrypt.compare(dto.password, room.passwordHash);
      if (!valid) throw new ForbiddenException('Invalid password');
    }

    const roomToken = this.jwtService.sign(
      { userId, roomId: room.roomId, type: 'room' },
      { expiresIn: '24h' },
    );

    return { roomToken };
  }
}
