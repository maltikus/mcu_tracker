import { mcuChronologySeed } from '../data/mcuChronology';
import type { AppState, ExportPayload, LibraryItem, SeedItem } from '../types';
import { nowIso } from './utils';

const APP_STORAGE_KEY = 'mcu-tracker-state-v2';

const toLibraryItem = (seedItem: SeedItem): LibraryItem => {
  const timestamp = nowIso();
  return {
    id: seedItem.id,
    source: 'seed',
    kind: seedItem.kind,
    tmdbType: seedItem.tmdbType,
    tmdbId: seedItem.tmdbId,
    season: seedItem.season,
    episode: seedItem.episode,
    rangeStart: seedItem.rangeStart,
    rangeEnd: seedItem.rangeEnd,
    title: seedItem.title,
    note: seedItem.note,
    orderIndex: seedItem.orderIndex,
    addedAt: timestamp,
    lastUpdated: timestamp
  };
};

export const defaultState = (): AppState => ({
  settings: {
    tmdbApiKey: '',
    theme: 'dark'
  },
  library: [...mcuChronologySeed].map(toLibraryItem).sort((a, b) => a.orderIndex - b.orderIndex),
  movieProgress: {},
  seriesProgress: {},
  tvProgress: {},
  pendingSync: {}
});

export const loadState = (): AppState => {
  const fallback = defaultState();
  const raw = localStorage.getItem(APP_STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.library || !Array.isArray(parsed.library)) return fallback;

    const normalizedLibrary = parsed.library.map((item, index) => {
      const legacy = item as unknown as { customType?: 'movie' | 'tv' };
      return {
        source: item.source ?? 'seed',
        kind: item.kind ?? ((item.tmdbType ?? legacy.customType) === 'tv' ? 'tv_season' : 'movie'),
        tmdbType: item.tmdbType ?? legacy.customType ?? null,
        tmdbId: item.tmdbId ?? null,
        season: item.season ?? null,
        episode: item.episode ?? null,
        rangeStart: item.rangeStart ?? null,
        rangeEnd: item.rangeEnd ?? null,
        title: item.title ?? `Item ${index + 1}`,
        note: item.note ?? null,
        orderIndex: item.orderIndex ?? index + 1,
        addedAt: item.addedAt ?? nowIso(),
        lastUpdated: item.lastUpdated ?? nowIso(),
        id: item.id,
        imageUrl: item.imageUrl
      };
    }) as LibraryItem[];

    return {
      settings: {
        tmdbApiKey: parsed.settings?.tmdbApiKey ?? '',
        theme: parsed.settings?.theme === 'light' ? 'light' : 'dark'
      },
      library: normalizedLibrary,
      movieProgress: parsed.movieProgress ?? {},
      seriesProgress: parsed.seriesProgress ?? {},
      tvProgress: parsed.tvProgress ?? {},
      pendingSync: parsed.pendingSync ?? {}
    };
  } catch {
    return fallback;
  }
};

export const saveState = (state: AppState): void => {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
};

export const resetState = (): AppState => {
  const next = defaultState();
  saveState(next);
  return next;
};

export const exportState = (state: AppState, includeKey: boolean): ExportPayload => {
  const payloadState: AppState = {
    ...state,
    settings: {
      ...state.settings,
      tmdbApiKey: includeKey ? state.settings.tmdbApiKey : ''
    }
  };
  return {
    version: 2,
    exportedAt: nowIso(),
    state: payloadState
  };
};

export const importState = (content: string): AppState => {
  const parsed = JSON.parse(content) as ExportPayload | { version?: number; state?: AppState };
  if (!parsed.state || (parsed.version !== 1 && parsed.version !== 2)) {
    throw new Error('Invalid export format.');
  }

  const next: AppState = {
    settings: {
      tmdbApiKey: parsed.state.settings?.tmdbApiKey ?? '',
      theme: parsed.state.settings?.theme === 'light' ? 'light' : 'dark'
    },
    library: parsed.state.library ?? [],
    movieProgress: parsed.state.movieProgress ?? {},
    seriesProgress: parsed.state.seriesProgress ?? {},
    tvProgress: parsed.state.tvProgress ?? {},
    pendingSync: parsed.state.pendingSync ?? {}
  };

  saveState(next);
  return next;
};
