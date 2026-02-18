import type {
  TMDBMovieDetails,
  TMDBSearchResult,
  TMDBSeasonDetails,
  TMDBTvDetails,
  TMDBType
} from '../types';

const API_BASE = 'https://api.themoviedb.org/3';
const CACHE_PREFIX = 'mcu-tmdb-cache-v1';
const TTL_MS = 24 * 60 * 60 * 1000;

interface TMDBConfigResponse {
  images: {
    secure_base_url: string;
    poster_sizes: string[];
    still_sizes: string[];
  };
}

interface CachedEntry<T> {
  savedAt: number;
  value: T;
}

const cacheKey = (resource: string): string => `${CACHE_PREFIX}:${resource}`;

const readCache = <T>(key: string): T | null => {
  const raw = localStorage.getItem(cacheKey(key));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedEntry<T>;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(cacheKey(key));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = <T>(key: string, value: T): void => {
  const payload: CachedEntry<T> = {
    savedAt: Date.now(),
    value
  };
  localStorage.setItem(cacheKey(key), JSON.stringify(payload));
};

const request = async <T>(apiKey: string, endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('language', 'en-US');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const cacheId = `${endpoint}?${url.searchParams.toString()}`;
  const cached = readCache<T>(cacheId);
  if (cached) return cached;

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB request failed (${response.status}).`);
  }

  const json = (await response.json()) as T;
  writeCache(cacheId, json);
  return json;
};

const getConfiguration = async (apiKey: string): Promise<TMDBConfigResponse> =>
  request<TMDBConfigResponse>(apiKey, '/configuration');

export const searchMulti = async (apiKey: string, query: string): Promise<TMDBSearchResult[]> => {
  if (!query.trim()) return [];
  const result = await request<{ results: TMDBSearchResult[] }>(apiKey, '/search/multi', {
    query,
    include_adult: 'false',
    page: '1'
  });
  return result.results.filter((item) => item.media_type === 'movie' || item.media_type === 'tv');
};

export const getMovie = async (apiKey: string, id: number): Promise<TMDBMovieDetails> =>
  request<TMDBMovieDetails>(apiKey, `/movie/${id}`);

export const getTv = async (apiKey: string, id: number): Promise<TMDBTvDetails> =>
  request<TMDBTvDetails>(apiKey, `/tv/${id}`);

export const getSeason = async (
  apiKey: string,
  tvId: number,
  seasonNumber: number
): Promise<TMDBSeasonDetails> => request<TMDBSeasonDetails>(apiKey, `/tv/${tvId}/season/${seasonNumber}`);

export const getImageUrl = async (
  apiKey: string,
  path: string | null,
  kind: 'poster' | 'still' = 'poster'
): Promise<string | null> => {
  if (!path) return null;
  const config = await getConfiguration(apiKey);
  const base = config.images?.secure_base_url ?? 'https://image.tmdb.org/t/p/';
  const sizes = kind === 'poster' ? config.images.poster_sizes : config.images.still_sizes;
  const preferred = sizes.includes('w500') ? 'w500' : sizes[sizes.length - 1] ?? 'original';
  return `${base}${preferred}${path}`;
};

export const getPosterUrlSync = (path: string | null, size: 'w342' | 'w500' = 'w500'): string | null => {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getStillUrlSync = (path: string | null, size: 'w300' | 'w780' = 'w780'): string | null => {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getKindFromType = (type: TMDBType): string => (type === 'movie' ? 'Movie' : 'Series');
