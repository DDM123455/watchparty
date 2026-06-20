import { forwardRef, Module } from '@nestjs/common';
import { WatchGateway } from './watch.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    forwardRef(() => RoomsModule),
  ],
  providers: [WatchGateway],
  exports: [WatchGateway],
})
export class WatchModule {}
