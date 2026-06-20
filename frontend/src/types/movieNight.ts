export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  display_title: string;
  display_year: string;
  overview: string;
  poster_path: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  media_type: 'movie' | 'tv';
}

export interface ProviderInfo {
  id: number;
  name: string;
  logo_path?: string;
  key: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface FilterState {
  mediaType: 'movie' | 'tv';
  genres: number[];
  yearFrom?: number;
  yearTo?: number;
  ratingMin?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  language?: string;
  country?: string;
  providers: number[];
  familyFriendly: boolean;
}

export type PickerPreset = 'random' | 'horror' | 'comedy' | 'action' | 'anime' | 'netflix' | 'tv' | 'family';

export const DEFAULT_FILTER: FilterState = {
  mediaType: 'movie',
  genres: [],
  providers: [],
  familyFriendly: false,
};

export const PRESET_LABELS: Record<PickerPreset, string> = {
  random:  'Random Movie',
  horror:  'Horror',
  comedy:  'Comedy',
  action:  'Action',
  anime:   'Anime',
  netflix: 'Netflix',
  tv:      'TV Show',
  family:  'Family',
};

export const PRESET_EMOJIS: Record<PickerPreset, string> = {
  random:  '🎲',
  horror:  '😱',
  comedy:  '😂',
  action:  '💥',
  anime:   '🎌',
  netflix: '🔴',
  tv:      '📺',
  family:  '👨‍👩‍👧',
};
