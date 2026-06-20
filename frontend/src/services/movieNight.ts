import type { FilterState, Genre, ProviderInfo, TmdbMovie } from '../types/movieNight';
import * as tmdb from './tmdb';

export interface MovieResult {
  movie: TmdbMovie | null;
  streaming: ProviderInfo[];
}

export const movieNightApi = {
  async getGenres(type: 'movie' | 'tv' = 'movie'): Promise<Genre[]> {
    return tmdb.getGenres(type);
  },

  async getProviders() {
    return tmdb.getProviders();
  },

  async random(filter: Partial<FilterState> = {}): Promise<MovieResult> {
    const movie = await tmdb.randomMovie(filter);
    if (!movie) return { movie: null, streaming: [] };
    const streaming = await tmdb.getWatchProviders(movie.id, movie.media_type);
    return { movie, streaming };
  },

  async preset(slug: string): Promise<MovieResult> {
    const fn = tmdb.presets[slug as keyof typeof tmdb.presets] ?? tmdb.presets.random;
    const movie = await fn();
    if (!movie) return { movie: null, streaming: [] };
    const streaming = await tmdb.getWatchProviders(movie.id, movie.media_type);
    return { movie, streaming };
  },

  async candidates(filter: Partial<FilterState>, count = 15): Promise<TmdbMovie[]> {
    return tmdb.candidates(filter, count);
  },

  async getMovieProviders(id: number, type: 'movie' | 'tv' = 'movie'): Promise<ProviderInfo[]> {
    return tmdb.getWatchProviders(id, type);
  },

  async getList(
    filter: Partial<FilterState>,
    page = 1,
    pageSize = 10,
  ) {
    return tmdb.getList(filter, page, pageSize);
  },
};
