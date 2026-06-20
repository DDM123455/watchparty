import type { FilterState, Genre, ProviderInfo, TmdbMovie } from '../types/movieNight';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string;
const BASE    = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p';

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
  { id: 8,   name: 'Netflix',     key: 'netflix'   },
  { id: 9,   name: 'Prime Video', key: 'prime'     },
  { id: 337, name: 'Disney+',     key: 'disney'    },
  { id: 15,  name: 'Hulu',        key: 'hulu'      },
  { id: 350, name: 'Apple TV+',   key: 'apple'     },
  { id: 384, name: 'Max',         key: 'hbo'       },
  { id: 386, name: 'Peacock',     key: 'peacock'   },
  { id: 531, name: 'Paramount+',  key: 'paramount' },
];

// ── In-memory cache ────────────────────────────────────────────
interface CacheEntry { data: unknown; expiresAt: number }
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): unknown | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.data;
}
function cacheSet(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ── Core fetch ─────────────────────────────────────────────────
async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json();
}

// ── Normalise raw TMDB result ──────────────────────────────────
function normalise(m: Record<string, unknown>, mediaType: 'movie' | 'tv'): TmdbMovie {
  const date = (m.release_date ?? m.first_air_date ?? '') as string;
  return {
    id:               m.id as number,
    title:            m.title as string | undefined,
    name:             m.name as string | undefined,
    display_title:    (m.title ?? m.name ?? 'Unknown') as string,
    display_year:     date.slice(0, 4),
    overview:         (m.overview ?? '') as string,
    poster_path:      (m.poster_path ?? null) as string | null,
    poster_url:       m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop_url:     m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
    vote_average:     (m.vote_average ?? 0) as number,
    vote_count:       (m.vote_count ?? 0) as number,
    genre_ids:        (m.genre_ids ?? []) as number[],
    original_language:(m.original_language ?? '') as string,
    media_type:       mediaType,
  };
}

// ── Filter → TMDB params ───────────────────────────────────────
function buildParams(filter: Partial<FilterState>, page = 1): Record<string, string> {
  const p: Record<string, string> = {
    sort_by:          'popularity.desc',
    'vote_count.gte': '50',
    page:             String(page),
  };
  const mt = filter.mediaType ?? 'movie';

  if (filter.genres?.length)    p['with_genres']            = filter.genres.join(',');
  if (filter.language)          p['with_original_language'] = filter.language;
  if (filter.country)           p['with_origin_country']    = filter.country;
  if (filter.ratingMin)         p['vote_average.gte']       = String(filter.ratingMin);
  if (filter.runtimeMin)        p['with_runtime.gte']       = String(filter.runtimeMin);
  if (filter.runtimeMax)        p['with_runtime.lte']       = String(filter.runtimeMax);
  if (filter.yearFrom)          p[mt === 'tv' ? 'first_air_date.gte' : 'primary_release_date.gte'] = `${filter.yearFrom}-01-01`;
  if (filter.yearTo)            p[mt === 'tv' ? 'first_air_date.lte' : 'primary_release_date.lte'] = `${filter.yearTo}-12-31`;
  if (filter.providers?.length) {
    p['with_watch_providers'] = filter.providers.join('|');
    p['watch_region']         = filter.country ?? 'US';
  }
  if (filter.familyFriendly) {
    p['certification_country'] = 'US';
    p['certification.lte']     = 'PG';
  }
  return p;
}

function hashFilter(f: Partial<FilterState>): string {
  return JSON.stringify(f);
}

// ── Public API ─────────────────────────────────────────────────

export async function getGenres(mediaType: 'movie' | 'tv' = 'movie'): Promise<Genre[]> {
  const key = `genres:${mediaType}`;
  const hit = cacheGet(key);
  if (hit) return hit as Genre[];
  const data = await tmdbFetch(`/genre/${mediaType}/list`) as { genres: Genre[] };
  cacheSet(key, data.genres, 24 * 3600_000);
  return data.genres;
}

export function getProviders(): typeof PROVIDERS_LIST {
  return PROVIDERS_LIST;
}

async function getPool(filter: Partial<FilterState>): Promise<TmdbMovie[]> {
  const key = `pool:${hashFilter(filter)}`;
  const hit = cacheGet(key);
  if (hit) return hit as TmdbMovie[];

  const mt     = filter.mediaType ?? 'movie';
  const pool: TmdbMovie[] = [];

  for (let page = 1; page <= 3; page++) {
    try {
      const data = await tmdbFetch(`/discover/${mt}`, buildParams(filter, page)) as { results: Record<string, unknown>[] };
      pool.push(...(data.results ?? []).map(m => normalise(m, mt)));
    } catch { break; }
  }

  cacheSet(key, pool, 2 * 3600_000);
  return pool;
}

export async function randomMovie(filter: Partial<FilterState> = {}): Promise<TmdbMovie | null> {
  const pool = await getPool(filter);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function candidates(filter: Partial<FilterState>, count = 15): Promise<TmdbMovie[]> {
  const pool = await getPool(filter);
  if (!pool.length) return [];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
}

// Returns a page of movies sorted by popularity (stable order, not random)
export async function getList(
  filter: Partial<FilterState>,
  page = 1,
  pageSize = 10,
): Promise<{ movies: TmdbMovie[]; hasMore: boolean }> {
  const pool = await getPool(filter);
  if (!pool.length) return { movies: [], hasMore: false };
  const start  = (page - 1) * pageSize;
  const movies = pool.slice(start, start + pageSize);
  return { movies, hasMore: start + pageSize < pool.length };
}

export async function getWatchProviders(id: number, mediaType: 'movie' | 'tv', region = 'US'): Promise<ProviderInfo[]> {
  const key = `wp:${mediaType}:${id}:${region}`;
  const hit = cacheGet(key);
  if (hit) return hit as ProviderInfo[];

  try {
    const data = await tmdbFetch(`/${mediaType}/${id}/watch/providers`) as { results: Record<string, { flatrate?: { provider_id: number; provider_name: string; logo_path: string }[] }> };
    const flatrate = (data.results?.[region]?.flatrate ?? []).map(p => ({
      id:        p.provider_id,
      name:      p.provider_name,
      logo_path: p.logo_path,
      key:       PROVIDERS_LIST.find(pl => pl.id === p.provider_id)?.key ?? '',
    }));
    cacheSet(key, flatrate, 6 * 3600_000);
    return flatrate;
  } catch { return []; }
}

// ── Presets ────────────────────────────────────────────────────
export const presets = {
  horror:  () => randomMovie({ genres: [GENRE_IDS.horror],    ratingMin: 5 }),
  comedy:  () => randomMovie({ genres: [GENRE_IDS.comedy],    ratingMin: 5 }),
  action:  () => randomMovie({ genres: [GENRE_IDS.action],    ratingMin: 5 }),
  anime:   () => randomMovie({ genres: [GENRE_IDS.animation], ratingMin: 6, language: 'ja' }),
  netflix: () => randomMovie({ providers: [PROVIDER_IDS.netflix], ratingMin: 5 }),
  tv:      () => randomMovie({ mediaType: 'tv', ratingMin: 5 }),
  family:  () => randomMovie({ genres: [GENRE_IDS.family], familyFriendly: true }),
  random:  () => randomMovie({}),
};
