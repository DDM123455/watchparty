import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class WatchService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepo: Repository<Message>,
  ) {}

  async saveMessage(data: {
    content: string;
    userId: string;
    roomId: string; // Room DB UUID (FK)
  }): Promise<Message> {
    const message = this.messagesRepo.create(data);
    return this.messagesRepo.save(message);
  }

  async getRecentMessages(roomDbId: string, limit = 50): Promise<Message[]> {
    return this.messagesRepo.find({
      where: { roomId: roomDbId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }
}
