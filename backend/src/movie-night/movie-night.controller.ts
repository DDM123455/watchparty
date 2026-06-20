import { Controller, Get, Param, Query } from '@nestjs/common';
import { TmdbService } from './tmdb.service';
import { FilterDto } from './dto/filter.dto';

@Controller('movie-night')
export class MovieNightController {
  constructor(private readonly tmdb: TmdbService) {}

  @Get('genres')
  genres(@Query('type') type: 'movie' | 'tv' = 'movie') {
    return this.tmdb.getGenres(type);
  }

  @Get('providers')
  providers() {
    return this.tmdb.getProviders();
  }

  // ── Random pickers ────────────────────────────────────────────

  @Get('random')
  async random(@Query() filter: FilterDto) {
    const movie = await this.tmdb.random(filter);
    if (!movie) return { movie: null, streaming: [] };
    const streaming = await this.tmdb.getWatchProviders(movie.id, movie.media_type);
    return { movie, streaming };
  }

  @Get('random/horror')
  async horror() {
    const movie = await this.tmdb.randomHorror();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  @Get('random/comedy')
  async comedy() {
    const movie = await this.tmdb.randomComedy();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  @Get('random/action')
  async action() {
    const movie = await this.tmdb.randomAction();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  @Get('random/anime')
  async anime() {
    const movie = await this.tmdb.randomAnime();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  @Get('random/netflix')
  async netflix() {
    const movie = await this.tmdb.randomNetflix();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  @Get('random/tv')
  async tv() {
    const movie = await this.tmdb.randomTv();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'tv') };
  }

  @Get('random/family')
  async family() {
    const movie = await this.tmdb.randomFamily();
    if (!movie) return { movie: null, streaming: [] };
    return { movie, streaming: await this.tmdb.getWatchProviders(movie.id, 'movie') };
  }

  // ── Candidates (wheel + battle) ───────────────────────────────

  @Get('candidates')
  async candidates(@Query() filter: FilterDto) {
    const count = filter.count ?? 15;
    const movies = await this.tmdb.candidates(filter, count);
    return { movies, total: movies.length };
  }

  // ── Streaming for a specific movie (after wheel/battle winner) ─

  @Get('movie/:id/providers')
  async movieProviders(
    @Param('id') id: string,
    @Query('type') type: 'movie' | 'tv' = 'movie',
  ) {
    return this.tmdb.getWatchProviders(Number(id), type);
  }
}
