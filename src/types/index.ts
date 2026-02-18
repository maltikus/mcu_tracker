export type TMDBType = 'movie' | 'tv';
export type ThemeMode = 'dark' | 'light';

export type ChronologyKind = 'movie' | 'tv_season' | 'tv_episode' | 'tv_range' | 'special';

export interface LibraryItem {
  id: string;
  source: 'seed' | 'tmdb' | 'custom';
  kind: ChronologyKind;
  tmdbType: TMDBType | null;
  tmdbId: number | null;
  season: number | null;
  episode: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  title: string;
  imageUrl?: string;
  note?: string | null;
  orderIndex: number;
  addedAt: string;
  lastUpdated: string;
}

export interface WatchedState {
  watched: boolean;
  watchedAt?: string;
}

export interface MovieProgress extends WatchedState {
  rating?: number;
}

export interface TvProgress {
  episodes: Record<string, WatchedState>;
  lastTouchedAt?: string;
}

export interface AppSettings {
  tmdbApiKey: string;
  theme: ThemeMode;
}

export interface PendingSyncItem {
  itemKey: string;
  watched: boolean;
  watchedAt?: string;
  updatedAt: string;
}

export interface AppState {
  settings: AppSettings;
  library: LibraryItem[];
  movieProgress: Record<string, MovieProgress>;
  seriesProgress: Record<string, WatchedState>;
  tvProgress: Record<string, TvProgress>;
  pendingSync: Record<string, PendingSyncItem>;
}

export interface SeedItem {
  id: string;
  title: string;
  kind: ChronologyKind;
  tmdbType: TMDBType | null;
  tmdbId: number | null;
  season: number | null;
  episode: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  note: string | null;
  orderIndex: number;
}

export interface TMDBSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  name?: string;
  title?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
}

export interface TMDBSeasonRef {
  season_number: number;
  episode_count: number;
  name: string;
  poster_path: string | null;
}

export interface TMDBTvDetails {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  number_of_episodes: number;
  number_of_seasons: number;
  seasons: TMDBSeasonRef[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  runtime: number | null;
  still_path: string | null;
}

export interface TMDBSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  episodes: TMDBEpisode[];
}

export interface ProgressRow {
  id?: string;
  user_id: string;
  item_key: string;
  watched: boolean;
  watched_at: string | null;
  updated_at?: string;
}

export interface ExportPayload {
  version: 2;
  exportedAt: string;
  state: AppState;
}
