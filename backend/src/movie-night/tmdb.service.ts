import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { FilterDto } from './dto/filter.dto';

const TMDB_BASE = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';

export const GENRE_IDS = {
  action: 28, adventure: 12, animation: 16, comedy: 35,
  crime: 80, documentary: 99, drama: 18, family: 10751,
  fantasy: 14, horror: 27, music: 10402, mystery: 9648,
  romance: 10749, scifi: 878, thriller: 53, war: 10752,
};

export const PROVIDER_IDS = {
  netflix: 8, prime: 9, disney: 337, hulu: 15,
  apple: 350, hbo: 384, peacock: 386, paramount: 531,
};

export const PROVIDERS_LIST = [
  { id: 8,   name: 'Netflix',      key: 'netflix'   },
  { id: 9,   name: 'Prime Video',  key: 'prime'     },
  { id: 337, name: 'Disney+',      key: 'disney'    },
  { id: 15,  name: 'Hulu',         key: 'hulu'      },
  { id: 350, name: 'Apple TV+',    key: 'apple'     },
  { id: 384, name: 'Max',          key: 'hbo'       },
  { id: 386, name: 'Peacock',      key: 'peacock'   },
  { id: 531, name: 'Paramount+',   key: 'paramount' },
];

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  display_title: string;
  display_year: string;
  overview: string;
  poster_path: string | null;
  poster_url: string | null;
  backdrop_path: string | null;
  backdrop_url: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  media_type: 'movie' | 'tv';
}

export interface ProviderInfo {
  id: number;
  name: string;
  logo_path: string;
  key: string;
}

interface CacheEntry { data: unknown; expiresAt: number }

@Injectable()
export class TmdbService {
  private readonly logger = new Logger(TmdbService.name);
  private readonly apiKey: string;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('TMDB_API_KEY') ?? '';
    if (!this.apiKey) this.logger.warn('TMDB_API_KEY not set');
    setInterval(() => this.cleanCache(), 10 * 60 * 1000);
  }

  // ── Public ────────────────────────────────────────────────────

  async getGenres(mediaType: 'movie' | 'tv' = 'movie') {
    const key = `genres:${mediaType}`;
    const hit = this.cacheGet(key);
    if (hit) return hit;
    const data = await this.tmdbFetch(`/genre/${mediaType}/list`);
    const result = (data as any).genres ?? [];
    this.cacheSet(key, result, 24 * 3600_000);
    return result;
  }

  getProviders() { return PROVIDERS_LIST; }

  async random(filter: FilterDto): Promise<TmdbMovie | null> {
    const pool = await this.getPool(filter);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  async candidates(filter: FilterDto, count = 15): Promise<TmdbMovie[]> {
    const pool = await this.getPool(filter);
    if (!pool.length) return [];
    return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  }

  async getWatchProviders(movieId: number, mediaType: 'movie' | 'tv', region = 'US'): Promise<ProviderInfo[]> {
    const key = `wp:${mediaType}:${movieId}:${region}`;
    const hit = this.cacheGet(key);
    if (hit) return hit as ProviderInfo[];
    try {
      const data = await this.tmdbFetch(`/${mediaType}/${movieId}/watch/providers`) as any;
      const regionData = data.results?.[region];
      const flatrate: ProviderInfo[] = (regionData?.flatrate ?? []).map((p: any) => ({
        id: p.provider_id,
        name: p.provider_name,
        logo_path: p.logo_path,
        key: PROVIDERS_LIST.find(pl => pl.id === p.provider_id)?.key ?? '',
      }));
      this.cacheSet(key, flatrate, 6 * 3600_000);
      return flatrate;
    } catch { return []; }
  }

  // ── Presets ───────────────────────────────────────────────────

  randomHorror()  { return this.random({ genres: String(GENRE_IDS.horror),    ratingMin: 5 }); }
  randomComedy()  { return this.random({ genres: String(GENRE_IDS.comedy),    ratingMin: 5 }); }
  randomAction()  { return this.random({ genres: String(GENRE_IDS.action),    ratingMin: 5 }); }
  randomAnime()   { return this.random({ genres: String(GENRE_IDS.animation), ratingMin: 6, language: 'ja' }); }
  randomNetflix() { return this.random({ providers: String(PROVIDER_IDS.netflix), ratingMin: 5 }); }
  randomTv()      { return this.random({ mediaType: 'tv', ratingMin: 5 }); }
  randomFamily()  { return this.random({ genres: String(GENRE_IDS.family), familyFriendly: true }); }

  // ── Private ───────────────────────────────────────────────────

  private async getPool(filter: FilterDto): Promise<TmdbMovie[]> {
    const key = `pool:${this.hashFilter(filter)}`;
    const hit = this.cacheGet(key);
    if (hit) return hit as TmdbMovie[];

    const mediaType = filter.mediaType ?? 'movie';
    const params: Record<string, string> = {
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
    };

    if (filter.genres)       params['with_genres']             = filter.genres;
    if (filter.language)     params['with_original_language']  = filter.language;
    if (filter.country)      params['with_origin_country']     = filter.country;
    if (filter.ratingMin)    params['vote_average.gte']        = String(filter.ratingMin);
    if (filter.runtimeMin)   params['with_runtime.gte']        = String(filter.runtimeMin);
    if (filter.runtimeMax)   params['with_runtime.lte']        = String(filter.runtimeMax);

    if (filter.yearFrom) {
      const k = mediaType === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte';
      params[k] = `${filter.yearFrom}-01-01`;
    }
    if (filter.yearTo) {
      const k = mediaType === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte';
      params[k] = `${filter.yearTo}-12-31`;
    }
    if (filter.providers) {
      params['with_watch_providers'] = filter.providers.split(',').join('|');
      params['watch_region']         = filter.country ?? 'US';
    }
    if (filter.familyFriendly) {
      params['certification_country'] = 'US';
      params['certification.lte']     = 'PG';
    }

    const pool: TmdbMovie[] = [];
    for (let page = 1; page <= 3; page++) {
      try {
        const data = await this.tmdbFetch(`/discover/${mediaType}`, { ...params, page: String(page) }) as any;
        const results: TmdbMovie[] = (data.results ?? []).map((m: any) => this.normalise(m, mediaType));
        pool.push(...results);
      } catch (e) {
        this.logger.error(`TMDB discover page ${page} failed: ${String(e)}`);
      }
    }

    this.cacheSet(key, pool, 2 * 3600_000);
    return pool;
  }

  normalise(m: any, mediaType: 'movie' | 'tv'): TmdbMovie {
    const date = m.release_date ?? m.first_air_date ?? '';
    return {
      ...m,
      media_type:    mediaType,
      display_title: m.title ?? m.name ?? 'Unknown',
      display_year:  date.slice(0, 4),
      poster_url:    m.poster_path   ? `${TMDB_IMG}/w500${m.poster_path}`    : null,
      backdrop_url:  m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
    };
  }

  private async tmdbFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
    const url = new URL(`${TMDB_BASE}${path}`);
    url.searchParams.set('api_key', this.apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB ${path} → HTTP ${res.status}`);
    return res.json();
  }

  private hashFilter(f: FilterDto): string {
    return crypto.createHash('md5').update(JSON.stringify(f)).digest('hex').slice(0, 12);
  }

  private cacheGet(key: string): unknown | null {
    const e = this.cache.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { this.cache.delete(key); return null; }
    return e.data;
  }

  private cacheSet(key: string, data: unknown, ttlMs: number): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [k, e] of this.cache) if (now > e.expiresAt) this.cache.delete(k);
  }
}
