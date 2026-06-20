import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { WatchModule } from './watch/watch.module';
import { MovieNightModule } from './movie-night/movie-night.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>('DATABASE_URL') ?? '';
        const isSupabase = dbUrl.includes('supabase') || dbUrl.includes('pooler');
        return {
          type: 'postgres' as const,
          url: dbUrl,
          autoLoadEntities: true,
          synchronize: config.get<string>('NODE_ENV') !== 'production',
          // Keep connections alive — prevents Supabase/cloud DBs from killing idle conns
          extra: {
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
            ...(isSupabase && { ssl: { rejectUnauthorized: false } }),
          },
        };
      },
    }),
    UsersModule,
    AuthModule,
    RoomsModule,
    WatchModule,
    MovieNightModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
