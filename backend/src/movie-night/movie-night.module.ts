import { Module } from '@nestjs/common';
import { MovieNightController } from './movie-night.controller';
import { TmdbService } from './tmdb.service';

@Module({
  controllers: [MovieNightController],
  providers: [TmdbService],
})
export class MovieNightModule {}
