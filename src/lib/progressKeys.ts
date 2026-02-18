import type { LibraryItem } from '../types';

export const getMovieItemKey = (item: LibraryItem): string => {
  if (item.tmdbId) return `movie:${item.tmdbId}`;
  return `local:${item.id}`;
};

export const getSeriesItemKey = (item: LibraryItem): string => {
  if (item.tmdbId) return `tv:${item.tmdbId}`;
  return `local:${item.id}:series`;
};

export const getEpisodeItemKey = (item: LibraryItem, season: number, episode: number): string => {
  if (item.tmdbId) return `tv:${item.tmdbId}:s${season}:e${episode}`;
  return `local:${item.id}:s${season}:e${episode}`;
};
