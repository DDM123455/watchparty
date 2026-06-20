import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { WatchGateway } from './watch.gateway';
import { WatchService } from './watch.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    AuthModule,
    UsersModule,
    forwardRef(() => RoomsModule),
  ],
  providers: [WatchGateway, WatchService],
  exports: [WatchGateway],
})
export class WatchModule {}
