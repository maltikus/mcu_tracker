import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type PropsWithChildren
} from 'react';
import type {
  AppState,
  LibraryItem,
  PendingSyncItem,
  ProgressRow,
  ThemeMode,
  TMDBType
} from '../types';
import { loadState, saveState } from '../lib/storage';
import { episodeKey, nowIso } from '../lib/utils';
import { flushPendingRows, fetchProgressRows, upsertProgressRow } from '../lib/progressSync';
import { getEpisodeItemKey, getMovieItemKey, getSeriesItemKey } from '../lib/progressKeys';
import { useAuth } from './AuthContext';

type Action =
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_THEME'; payload: ThemeMode }
  | { type: 'ADD_TMDB_ITEM'; payload: { tmdbType: 'movie' | 'tv'; tmdbId: number; title?: string; imageUrl?: string } }
  | { type: 'ADD_CUSTOM_ITEM'; payload: { title: string; imageUrl: string; customType: 'movie' | 'tv' } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'REORDER_LIBRARY'; payload: { itemIds: string[] } }
  | { type: 'TOGGLE_MOVIE_LOCAL'; payload: { itemId: string; watched: boolean } }
  | { type: 'TOGGLE_SERIES_LOCAL'; payload: { itemId: string; watched: boolean } }
  | {
      type: 'SET_EPISODE_LOCAL';
      payload: { itemId: string; seasonNumber: number; episodeNumber: number; watched: boolean };
    }
  | { type: 'SET_SEASON_LOCAL'; payload: { itemId: string; seasonNumber: number; episodeNumbers: number[]; watched: boolean } }
  | {
      type: 'SET_EPISODES_UNTIL_LOCAL';
      payload: { itemId: string; seasonNumber: number; targetEpisodeNumber: number; episodeNumbers: number[] };
    }
  | { type: 'CLEAR_TV'; payload: { itemId: string } }
  | { type: 'MARK_PENDING_SYNC'; payload: PendingSyncItem }
  | { type: 'CLEAR_PENDING_SYNC'; payload: { keys: string[] } }
  | {
      type: 'APPLY_REMOTE_PROGRESS';
      payload: {
        movieProgress: AppState['movieProgress'];
        seriesProgress: AppState['seriesProgress'];
        tvProgress: AppState['tvProgress'];
      };
    }
  | { type: 'UPDATE_ITEM_TMDB_ID'; payload: { itemId: string; tmdbId: number; tmdbType: TMDBType } }
  | { type: 'IMPORT_STATE'; payload: AppState }
  | { type: 'RESET_STATE'; payload: AppState };

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  toggleMovie: (itemId: string, watched: boolean) => Promise<boolean>;
  toggleSeries: (itemId: string, watched: boolean) => Promise<boolean>;
  toggleEpisode: (itemId: string, seasonNumber: number, episodeNumber: number, watched: boolean) => Promise<boolean>;
  markSeason: (itemId: string, seasonNumber: number, episodeNumbers: number[], watched: boolean) => Promise<boolean>;
  markUntil: (
    itemId: string,
    seasonNumber: number,
    targetEpisodeNumber: number,
    episodeNumbers: number[]
  ) => Promise<boolean>;
  clearTv: (itemId: string) => Promise<boolean>;
  resolveTmdbId: (itemId: string, tmdbType: TMDBType, tmdbId: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const sortLibrary = (library: LibraryItem[]): LibraryItem[] => [...library].sort((a, b) => a.orderIndex - b.orderIndex);

const reducer = (state: AppState, action: Action): AppState => {
  const timestamp = nowIso();
  switch (action.type) {
    case 'SET_API_KEY':
      return {
        ...state,
        settings: {
          ...state.settings,
          tmdbApiKey: action.payload.trim()
        }
      };
    case 'SET_THEME':
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: action.payload
        }
      };
    case 'ADD_TMDB_ITEM': {
      const nextOrder = state.library.length + 1;
      const next: LibraryItem = {
        id: `tmdb-${action.payload.tmdbType}-${action.payload.tmdbId}-${Date.now()}`,
        source: 'tmdb',
        kind: action.payload.tmdbType === 'tv' ? 'tv_season' : 'movie',
        tmdbType: action.payload.tmdbType,
        tmdbId: action.payload.tmdbId,
        season: action.payload.tmdbType === 'tv' ? 1 : null,
        episode: null,
        rangeStart: null,
        rangeEnd: null,
        title: action.payload.title ?? `TMDB #${action.payload.tmdbId}`,
        imageUrl: action.payload.imageUrl,
        note: null,
        orderIndex: nextOrder,
        addedAt: timestamp,
        lastUpdated: timestamp
      };
      return { ...state, library: sortLibrary([...state.library, next]) };
    }
    case 'ADD_CUSTOM_ITEM': {
      const nextOrder = state.library.length + 1;
      const next: LibraryItem = {
        id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        source: 'custom',
        kind: action.payload.customType === 'tv' ? 'tv_season' : 'special',
        tmdbType: action.payload.customType,
        tmdbId: null,
        season: action.payload.customType === 'tv' ? 1 : null,
        episode: null,
        rangeStart: null,
        rangeEnd: null,
        title: action.payload.title,
        imageUrl: action.payload.imageUrl,
        note: null,
        orderIndex: nextOrder,
        addedAt: timestamp,
        lastUpdated: timestamp
      };
      return { ...state, library: sortLibrary([...state.library, next]) };
    }
    case 'REMOVE_ITEM': {
      const filtered = state.library.filter((item) => item.id !== action.payload.itemId);
      const reindexed = filtered.map((item, index) => ({ ...item, orderIndex: index + 1 }));
      const movieProgress = { ...state.movieProgress };
      const seriesProgress = { ...state.seriesProgress };
      const tvProgress = { ...state.tvProgress };
      delete movieProgress[action.payload.itemId];
      delete seriesProgress[action.payload.itemId];
      delete tvProgress[action.payload.itemId];
      return {
        ...state,
        library: reindexed,
        movieProgress,
        seriesProgress,
        tvProgress
      };
    }
    case 'REORDER_LIBRARY': {
      const next = action.payload.itemIds
        .map((id, index) => {
          const item = state.library.find((entry) => entry.id === id);
          if (!item) return null;
          return {
            ...item,
            orderIndex: index + 1,
            lastUpdated: timestamp
          };
        })
        .filter(Boolean) as LibraryItem[];
      return {
        ...state,
        library: next
      };
    }
    case 'TOGGLE_MOVIE_LOCAL': {
      const movieProgress = {
        ...state.movieProgress,
        [action.payload.itemId]: {
          watched: action.payload.watched,
          watchedAt: action.payload.watched ? timestamp : undefined
        }
      };

      return {
        ...state,
        movieProgress,
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'TOGGLE_SERIES_LOCAL': {
      const seriesProgress = {
        ...state.seriesProgress,
        [action.payload.itemId]: {
          watched: action.payload.watched,
          watchedAt: action.payload.watched ? timestamp : undefined
        }
      };

      return {
        ...state,
        seriesProgress,
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'SET_EPISODE_LOCAL': {
      const existing = state.tvProgress[action.payload.itemId] ?? { episodes: {} };
      const key = episodeKey(action.payload.seasonNumber, action.payload.episodeNumber);
      return {
        ...state,
        tvProgress: {
          ...state.tvProgress,
          [action.payload.itemId]: {
            episodes: {
              ...existing.episodes,
              [key]: {
                watched: action.payload.watched,
                watchedAt: action.payload.watched ? timestamp : undefined
              }
            },
            lastTouchedAt: timestamp
          }
        },
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'SET_SEASON_LOCAL': {
      const existing = state.tvProgress[action.payload.itemId] ?? { episodes: {} };
      const episodeMap = { ...existing.episodes };
      action.payload.episodeNumbers.forEach((episodeNumber) => {
        episodeMap[episodeKey(action.payload.seasonNumber, episodeNumber)] = {
          watched: action.payload.watched,
          watchedAt: action.payload.watched ? timestamp : undefined
        };
      });

      return {
        ...state,
        tvProgress: {
          ...state.tvProgress,
          [action.payload.itemId]: {
            episodes: episodeMap,
            lastTouchedAt: timestamp
          }
        },
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'SET_EPISODES_UNTIL_LOCAL': {
      const existing = state.tvProgress[action.payload.itemId] ?? { episodes: {} };
      const episodeMap = { ...existing.episodes };
      action.payload.episodeNumbers.forEach((episodeNumber) => {
        episodeMap[episodeKey(action.payload.seasonNumber, episodeNumber)] = {
          watched: episodeNumber <= action.payload.targetEpisodeNumber,
          watchedAt: episodeNumber <= action.payload.targetEpisodeNumber ? timestamp : undefined
        };
      });
      return {
        ...state,
        tvProgress: {
          ...state.tvProgress,
          [action.payload.itemId]: {
            episodes: episodeMap,
            lastTouchedAt: timestamp
          }
        },
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'CLEAR_TV': {
      return {
        ...state,
        tvProgress: {
          ...state.tvProgress,
          [action.payload.itemId]: {
            episodes: {},
            lastTouchedAt: timestamp
          }
        },
        library: state.library.map((item) =>
          item.id === action.payload.itemId ? { ...item, lastUpdated: timestamp } : item
        )
      };
    }
    case 'MARK_PENDING_SYNC': {
      return {
        ...state,
        pendingSync: {
          ...state.pendingSync,
          [action.payload.itemKey]: action.payload
        }
      };
    }
    case 'CLEAR_PENDING_SYNC': {
      const next = { ...state.pendingSync };
      action.payload.keys.forEach((key) => {
        delete next[key];
      });
      return {
        ...state,
        pendingSync: next
      };
    }
    case 'APPLY_REMOTE_PROGRESS':
      return {
        ...state,
        movieProgress: action.payload.movieProgress,
        seriesProgress: action.payload.seriesProgress,
        tvProgress: action.payload.tvProgress,
        pendingSync: {}
      };
    case 'UPDATE_ITEM_TMDB_ID':
      return {
        ...state,
        library: state.library.map((item) =>
          item.id === action.payload.itemId
            ? {
                ...item,
                tmdbId: action.payload.tmdbId,
                tmdbType: action.payload.tmdbType,
                lastUpdated: timestamp
              }
            : item
        )
      };
    case 'IMPORT_STATE':
      return action.payload;
    case 'RESET_STATE':
      return action.payload;
    default:
      return state;
  }
};

const hasLocalProgress = (state: AppState): boolean =>
  Object.keys(state.movieProgress).length > 0 ||
  Object.keys(state.seriesProgress).length > 0 ||
  Object.keys(state.tvProgress).length > 0;

const getItemById = (library: LibraryItem[], itemId: string): LibraryItem => {
  const item = library.find((entry) => entry.id === itemId);
  if (!item) throw new Error(`Item not found: ${itemId}`);
  return item;
};

const mapRowsToState = (library: LibraryItem[], rows: ProgressRow[]) => {
  const movieProgress: AppState['movieProgress'] = {};
  const seriesProgress: AppState['seriesProgress'] = {};
  const tvProgress: AppState['tvProgress'] = {};

  library.forEach((item) => {
    if (!item.tmdbId) return;

    const movieKey = getMovieItemKey(item);
    const seriesKey = getSeriesItemKey(item);
    const movieRow = rows.find((row) => row.item_key === movieKey);
    const seriesRow = rows.find((row) => row.item_key === seriesKey);

    if (movieRow) {
      movieProgress[item.id] = {
        watched: movieRow.watched,
        watchedAt: movieRow.watched_at ?? undefined
      };
    }

    if (seriesRow) {
      seriesProgress[item.id] = {
        watched: seriesRow.watched,
        watchedAt: seriesRow.watched_at ?? undefined
      };
    }

    const prefix = `tv:${item.tmdbId}:s`;
    const episodeRows = rows.filter((row) => row.item_key.startsWith(prefix));
    if (!episodeRows.length) return;

    tvProgress[item.id] = {
      episodes: episodeRows.reduce<Record<string, { watched: boolean; watchedAt?: string }>>((acc, row) => {
        const match = row.item_key.match(/:s(\d+):e(\d+)$/);
        if (!match) return acc;
        const season = Number(match[1]);
        const episode = Number(match[2]);
        acc[episodeKey(season, episode)] = {
          watched: row.watched,
          watchedAt: row.watched_at ?? undefined
        };
        return acc;
      }, {})
    };
  });

  return { movieProgress, seriesProgress, tvProgress };
};

const buildLocalRows = (state: AppState, userId: string): ProgressRow[] => {
  const rows: ProgressRow[] = [];

  state.library.forEach((item) => {
    const movie = state.movieProgress[item.id];
    if (movie) {
      rows.push({
        user_id: userId,
        item_key: getMovieItemKey(item),
        watched: movie.watched,
        watched_at: movie.watchedAt ?? null,
        updated_at: nowIso()
      });
    }

    const series = state.seriesProgress[item.id];
    if (series) {
      rows.push({
        user_id: userId,
        item_key: getSeriesItemKey(item),
        watched: series.watched,
        watched_at: series.watchedAt ?? null,
        updated_at: nowIso()
      });
    }

    const tv = state.tvProgress[item.id];
    if (!tv) return;
    Object.entries(tv.episodes).forEach(([localEpisodeKey, watchedState]) => {
      const [season, episode] = localEpisodeKey.split(':').map(Number);
      rows.push({
        user_id: userId,
        item_key: getEpisodeItemKey(item, season, episode),
        watched: watchedState.watched,
        watched_at: watchedState.watchedAt ?? null,
        updated_at: nowIso()
      });
    });
  });

  return rows;
};

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.settings.theme === 'dark');
  }, [state.settings.theme]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    const run = async () => {
      try {
        const rows = await fetchProgressRows(user.id);
        if (cancelled) return;

        if (!rows.length && hasLocalProgress(state)) {
          const localRows = buildLocalRows(state, user.id);
          for (const row of localRows) {
            await upsertProgressRow(row);
          }
          return;
        }

        const mapped = mapRowsToState(state.library, rows);
        dispatch({
          type: 'APPLY_REMOTE_PROGRESS',
          payload: mapped
        });
      } catch {
        // keep local progress if remote sync is temporarily unavailable
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const syncRow = useCallback(
    async (itemKey: string, watched: boolean, watchedAt?: string): Promise<boolean> => {
      const updatedAt = nowIso();

      if (!user?.id) return true;

      const error = await upsertProgressRow({
        user_id: user.id,
        item_key: itemKey,
        watched,
        watched_at: watchedAt ?? null,
        updated_at: updatedAt
      });

      if (error) {
        dispatch({
          type: 'MARK_PENDING_SYNC',
          payload: {
            itemKey,
            watched,
            watchedAt,
            updatedAt
          }
        });
        return false;
      }

      dispatch({ type: 'CLEAR_PENDING_SYNC', payload: { keys: [itemKey] } });
      return true;
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id || !Object.keys(state.pendingSync).length || !isOnline) return;

    let cancelled = false;
    const run = async () => {
      const { synced } = await flushPendingRows(user.id, state.pendingSync);
      if (cancelled || !synced.length) return;
      dispatch({ type: 'CLEAR_PENDING_SYNC', payload: { keys: synced } });
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOnline, state.pendingSync, user?.id]);

  const toggleMovie = useCallback(
    async (itemId: string, watched: boolean) => {
      dispatch({ type: 'TOGGLE_MOVIE_LOCAL', payload: { itemId, watched } });
      const item = getItemById(state.library, itemId);
      return syncRow(getMovieItemKey(item), watched, watched ? nowIso() : undefined);
    },
    [state.library, syncRow]
  );

  const toggleSeries = useCallback(
    async (itemId: string, watched: boolean) => {
      dispatch({ type: 'TOGGLE_SERIES_LOCAL', payload: { itemId, watched } });
      const item = getItemById(state.library, itemId);
      return syncRow(getSeriesItemKey(item), watched, watched ? nowIso() : undefined);
    },
    [state.library, syncRow]
  );

  const toggleEpisode = useCallback(
    async (itemId: string, seasonNumber: number, episodeNumber: number, watched: boolean) => {
      dispatch({ type: 'SET_EPISODE_LOCAL', payload: { itemId, seasonNumber, episodeNumber, watched } });
      const item = getItemById(state.library, itemId);
      return syncRow(getEpisodeItemKey(item, seasonNumber, episodeNumber), watched, watched ? nowIso() : undefined);
    },
    [state.library, syncRow]
  );

  const markSeason = useCallback(
    async (itemId: string, seasonNumber: number, episodeNumbers: number[], watched: boolean) => {
      dispatch({ type: 'SET_SEASON_LOCAL', payload: { itemId, seasonNumber, episodeNumbers, watched } });
      const item = getItemById(state.library, itemId);
      let ok = true;
      for (const episodeNumber of episodeNumbers) {
        const synced = await syncRow(
          getEpisodeItemKey(item, seasonNumber, episodeNumber),
          watched,
          watched ? nowIso() : undefined
        );
        if (!synced) ok = false;
      }
      return ok;
    },
    [state.library, syncRow]
  );

  const markUntil = useCallback(
    async (itemId: string, seasonNumber: number, targetEpisodeNumber: number, episodeNumbers: number[]) => {
      dispatch({
        type: 'SET_EPISODES_UNTIL_LOCAL',
        payload: { itemId, seasonNumber, targetEpisodeNumber, episodeNumbers }
      });
      const item = getItemById(state.library, itemId);
      let ok = true;
      for (const episodeNumber of episodeNumbers) {
        const watched = episodeNumber <= targetEpisodeNumber;
        const synced = await syncRow(
          getEpisodeItemKey(item, seasonNumber, episodeNumber),
          watched,
          watched ? nowIso() : undefined
        );
        if (!synced) ok = false;
      }
      return ok;
    },
    [state.library, syncRow]
  );

  const clearTv = useCallback(
    async (itemId: string) => {
      const current = state.tvProgress[itemId]?.episodes ?? {};
      dispatch({ type: 'CLEAR_TV', payload: { itemId } });
      const item = getItemById(state.library, itemId);
      let ok = true;
      for (const key of Object.keys(current)) {
        const [season, episode] = key.split(':').map(Number);
        const synced = await syncRow(getEpisodeItemKey(item, season, episode), false, undefined);
        if (!synced) ok = false;
      }
      return ok;
    },
    [state.library, state.tvProgress, syncRow]
  );

  const resolveTmdbId = useCallback((itemId: string, tmdbType: TMDBType, tmdbId: number) => {
    dispatch({ type: 'UPDATE_ITEM_TMDB_ID', payload: { itemId, tmdbType, tmdbId } });
  }, []);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      toggleMovie,
      toggleSeries,
      toggleEpisode,
      markSeason,
      markUntil,
      clearTv,
      resolveTmdbId
    }),
    [state, toggleMovie, toggleSeries, toggleEpisode, markSeason, markUntil, clearTv, resolveTmdbId]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
