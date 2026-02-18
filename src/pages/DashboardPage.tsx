import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { MediaItemCard } from '../components/MediaItemCard';
import { StatsBar } from '../components/StatsBar';
import { TvProgressModal } from '../components/TvProgressModal';
import type { LibraryItem } from '../types';
import { fetchMediaSummary, type MediaSummary } from '../lib/media';
import { useAuth } from '../contexts/AuthContext';

type Filter = 'all' | 'movie' | 'tv' | 'unwatched';
type SortMode = 'mcu' | 'alpha' | 'updated';
type ViewMode = 'timeline' | 'grid';

const isSeriesItem = (item: LibraryItem, summary?: MediaSummary): boolean =>
  summary?.type === 'tv' || item.kind === 'tv_episode' || item.kind === 'tv_season' || item.kind === 'tv_range';

export const DashboardPage = () => {
  const { state, dispatch, toggleMovie, toggleSeries, toggleEpisode, markSeason, markUntil, clearTv } = useApp();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const [selectedTv, setSelectedTv] = useState<LibraryItem | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('mcu');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [summaryMap, setSummaryMap] = useState<Record<string, MediaSummary>>({});

  useEffect(() => {
    let mounted = true;
    const loadSummaries = async () => {
      const entries = await Promise.all(
        state.library.map(async (item) => {
          try {
            const summary = await fetchMediaSummary(state.settings.tmdbApiKey, item);
            return [item.id, summary] as const;
          } catch {
            return null;
          }
        })
      );
      if (!mounted) return;
      const next: Record<string, MediaSummary> = {};
      entries.forEach((entry) => {
        if (entry) next[entry[0]] = entry[1];
      });
      setSummaryMap(next);
    };
    void loadSummaries();
    return () => {
      mounted = false;
    };
  }, [state.library, state.settings.tmdbApiKey]);

  const filtered = useMemo(() => {
    const base = state.library.filter((item) => {
      const isSeries = isSeriesItem(item, summaryMap[item.id]);
      if (filter === 'movie') return !isSeries;
      if (filter === 'tv') return isSeries;
      if (filter === 'unwatched') {
        if (!isSeries) return !state.movieProgress[item.id]?.watched;
        return !state.seriesProgress[item.id]?.watched;
      }
      return true;
    });

    if (sortMode === 'alpha') {
      return [...base].sort((a, b) => a.title.localeCompare(b.title));
    }

    if (sortMode === 'updated') {
      return [...base].sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    }

    return [...base].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [filter, sortMode, state.library, state.movieProgress, state.seriesProgress, summaryMap]);

  const watchedMovies = state.library.filter((item) => !isSeriesItem(item, summaryMap[item.id]) && state.movieProgress[item.id]?.watched).length;

  const totalMovies = state.library.filter((item) => !isSeriesItem(item, summaryMap[item.id])).length;

  const watchedEpisodes = Object.values(state.tvProgress).reduce(
    (acc, tv) => acc + Object.values(tv.episodes).filter((entry) => entry.watched).length,
    0
  );

  const totalEpisodesEstimate = state.library.reduce((acc, item) => {
    if (!isSeriesItem(item, summaryMap[item.id])) return acc;
    return acc + (summaryMap[item.id]?.totalEpisodes ?? 0);
  }, 0);

  const lastActivity = [...state.library]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0]?.lastUpdated;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-white/10 bg-mesh bg-slate-900/70 p-6 shadow-glow backdrop-blur"
      >
        <h1 className="font-display text-3xl font-bold text-white">Marvel Watch Progress</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Track the MCU in chronological order, monitor movie completion, and drill into episode-level series progress.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Sync status: {user ? 'Logged in - Supabase sync active' : 'Local only - sign in in Settings for sync'}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <select
            aria-label="Filter media"
            value={filter}
            onChange={(event) => setFilter(event.target.value as Filter)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <option value="all">All</option>
            <option value="movie">Movies</option>
            <option value="tv">Series</option>
            <option value="unwatched">Unwatched</option>
          </select>
          <select
            aria-label="Sort items"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            <option value="mcu">MCU Order</option>
            <option value="alpha">Alphabetical</option>
            <option value="updated">Zuletzt geändert</option>
          </select>
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'timeline' ? 'grid' : 'timeline'))}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            View: {viewMode === 'timeline' ? 'Timeline' : 'Grid'}
          </button>
        </div>
      </motion.section>

      <StatsBar
        library={state.library}
        watchedMovies={watchedMovies}
        totalMovies={totalMovies}
        watchedEpisodes={watchedEpisodes}
        totalEpisodesEstimate={totalEpisodesEstimate}
        lastActivity={lastActivity}
      />

      {viewMode === 'timeline' ? (
        <ol className="space-y-4">
          {filtered.map((item) => (
            <li key={item.id} className="relative rounded-2xl border border-white/10 bg-white/5 p-3">
              <span className="absolute -left-2 top-4 h-3 w-3 rounded-full bg-cyan-300" />
              <MediaItemCard
                item={item}
                apiKey={state.settings.tmdbApiKey}
                variant="timeline"
                movieWatched={state.movieProgress[item.id]?.watched ?? false}
                seriesWatched={state.seriesProgress[item.id]?.watched ?? false}
                tvWatchedCount={Object.values(state.tvProgress[item.id]?.episodes ?? {}).filter((entry) => entry.watched).length}
                tvTotalCount={summaryMap[item.id]?.totalEpisodes ?? 0}
                onToggleMovie={async (watched) => {
                  const ok = await toggleMovie(item.id, watched);
                  if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
                }}
                onToggleSeries={async (watched) => {
                  const ok = await toggleSeries(item.id, watched);
                  if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
                }}
                onOpenTv={() => setSelectedTv(item)}
                onRemove={() => {
                  dispatch({ type: 'REMOVE_ITEM', payload: { itemId: item.id } });
                  pushToast('Item removed.', 'success');
                }}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <MediaItemCard
              key={item.id}
              item={item}
              apiKey={state.settings.tmdbApiKey}
              variant="grid"
              movieWatched={state.movieProgress[item.id]?.watched ?? false}
              seriesWatched={state.seriesProgress[item.id]?.watched ?? false}
              tvWatchedCount={Object.values(state.tvProgress[item.id]?.episodes ?? {}).filter((entry) => entry.watched).length}
              tvTotalCount={summaryMap[item.id]?.totalEpisodes ?? 0}
              onToggleMovie={async (watched) => {
                const ok = await toggleMovie(item.id, watched);
                if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
              }}
              onToggleSeries={async (watched) => {
                const ok = await toggleSeries(item.id, watched);
                if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
              }}
              onOpenTv={() => setSelectedTv(item)}
              onRemove={() => {
                dispatch({ type: 'REMOVE_ITEM', payload: { itemId: item.id } });
                pushToast('Item removed.', 'success');
              }}
            />
          ))}
        </div>
      )}

      {selectedTv ? (
        <TvProgressModal
          apiKey={state.settings.tmdbApiKey}
          item={selectedTv}
          progress={state.tvProgress[selectedTv.id]}
          onClose={() => setSelectedTv(null)}
          onToggleEpisode={async (seasonNumber, episodeNumber, watched) => {
            const ok = await toggleEpisode(selectedTv.id, seasonNumber, episodeNumber, watched);
            if (!ok) pushToast('Episode sync failed. Pending retry.', 'error');
          }}
          onMarkSeason={async (seasonNumber, episodeNumbers, watched) => {
            const ok = await markSeason(selectedTv.id, seasonNumber, episodeNumbers, watched);
            if (!ok) pushToast('Season sync partially failed. Pending retry.', 'error');
          }}
          onMarkUntil={async (seasonNumber, targetEpisodeNumber, episodeNumbers) => {
            const ok = await markUntil(selectedTv.id, seasonNumber, targetEpisodeNumber, episodeNumbers);
            if (!ok) pushToast('Sync partially failed. Pending retry.', 'error');
          }}
          onClear={async () => {
            const ok = await clearTv(selectedTv.id);
            if (!ok) pushToast('Clear sync failed. Pending retry.', 'error');
          }}
        />
      ) : null}
    </div>
  );
};
