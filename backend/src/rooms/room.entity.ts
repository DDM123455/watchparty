import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 8 })
  roomId: string;

  @Column()
  name: string;

  @Column()
  videoUrl: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ default: false })
  hasPassword: boolean;

  @Column({ default: true })
  isPublic: boolean;

  @Column({ default: 'host_only' })
  mode: 'host_only' | 'collaborative';

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  hostId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
