import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findOrCreate(profile: {
    googleId: string;
    displayName: string;
    email: string;
    avatar?: string;
  }): Promise<User> {
    let user = await this.usersRepo.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = this.usersRepo.create(profile);
      await this.usersRepo.save(user);
    }

    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }
}
