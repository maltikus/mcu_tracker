import { getMovie, getPosterUrlSync, getTv } from './tmdb';
import type { LibraryItem, TMDBType } from '../types';

export interface MediaSummary {
  title: string;
  imageUrl: string | null;
  type: TMDBType;
  totalEpisodes?: number;
}

const summaryCache = new Map<string, MediaSummary>();

const summaryKey = (item: LibraryItem): string => `${item.source}:${item.tmdbType}:${item.tmdbId ?? item.id}`;

const fallbackTypeForItem = (item: LibraryItem): TMDBType => {
  if (item.tmdbType) return item.tmdbType;
  if (item.kind === 'movie' || item.kind === 'special') return 'movie';
  return 'tv';
};

export const fetchMediaSummary = async (apiKey: string, item: LibraryItem): Promise<MediaSummary> => {
  const key = summaryKey(item);
  const cached = summaryCache.get(key);
  if (cached) return cached;

  if (!apiKey || !item.tmdbId || !item.tmdbType) {
    const local: MediaSummary = {
      title: item.title,
      imageUrl: item.imageUrl ?? null,
      type: fallbackTypeForItem(item)
    };
    summaryCache.set(key, local);
    return local;
  }

  let summary: MediaSummary;
  if (item.tmdbType === 'movie') {
    const details = await getMovie(apiKey, item.tmdbId);
    summary = {
      title: details.title,
      imageUrl: getPosterUrlSync(details.poster_path, 'w500'),
      type: 'movie'
    };
  } else {
    const details = await getTv(apiKey, item.tmdbId);
    summary = {
      title: details.name,
      imageUrl: getPosterUrlSync(details.poster_path, 'w500'),
      type: 'tv',
      totalEpisodes: details.number_of_episodes
    };
  }

  summaryCache.set(key, summary);
  return summary;
};
