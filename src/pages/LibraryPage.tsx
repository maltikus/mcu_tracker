import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { SearchAddPanel } from '../components/SearchAddPanel';
import { SortableTimeline } from '../components/SortableTimeline';
import { MediaItemCard } from '../components/MediaItemCard';
import { TvProgressModal } from '../components/TvProgressModal';

export const LibraryPage = () => {
  const {
    state,
    dispatch,
    toggleMovie,
    toggleSeries,
    toggleEpisode,
    markSeason,
    markUntil,
    clearTv
  } = useApp();
  const { pushToast } = useToast();
  const [selectedTvId, setSelectedTvId] = useState<string | null>(null);

  const selectedTv = selectedTvId ? state.library.find((item) => item.id === selectedTvId) ?? null : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h1 className="font-display text-2xl font-bold text-white">Library</h1>
        <p className="mt-1 text-sm text-slate-300">
          Search TMDB to add new entries, create custom items, and drag items to adjust MCU order.
        </p>
      </section>

      <SearchAddPanel
        apiKey={state.settings.tmdbApiKey}
        onAddTmdb={(payload) => {
          dispatch({ type: 'ADD_TMDB_ITEM', payload });
          pushToast('Item added from TMDB.', 'success');
        }}
        onAddCustom={(payload) => {
          dispatch({ type: 'ADD_CUSTOM_ITEM', payload });
          pushToast('Custom item added.', 'success');
        }}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 font-display text-lg font-semibold text-white">Reorder Timeline</h2>
          <SortableTimeline
            items={[...state.library].sort((a, b) => a.orderIndex - b.orderIndex)}
            onReorder={(ids) => {
              dispatch({ type: 'REORDER_LIBRARY', payload: { itemIds: ids } });
              pushToast('Timeline order updated.', 'success');
            }}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...state.library]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((item) => (
              <MediaItemCard
                key={item.id}
                item={item}
                apiKey={state.settings.tmdbApiKey}
                variant="grid"
                movieWatched={state.movieProgress[item.id]?.watched ?? false}
                seriesWatched={state.seriesProgress[item.id]?.watched ?? false}
                tvWatchedCount={Object.values(state.tvProgress[item.id]?.episodes ?? {}).filter((entry) => entry.watched).length}
                tvTotalCount={0}
                onToggleMovie={async (watched) => {
                  const ok = await toggleMovie(item.id, watched);
                  if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
                }}
                onToggleSeries={async (watched) => {
                  const ok = await toggleSeries(item.id, watched);
                  if (!ok) pushToast('Sync failed. Stored locally and queued for retry.', 'error');
                }}
                onOpenTv={() => setSelectedTvId(item.id)}
                onRemove={() => dispatch({ type: 'REMOVE_ITEM', payload: { itemId: item.id } })}
              />
            ))}
        </div>
      </section>

      {selectedTv ? (
        <TvProgressModal
          apiKey={state.settings.tmdbApiKey}
          item={selectedTv}
          progress={state.tvProgress[selectedTv.id]}
          onClose={() => setSelectedTvId(null)}
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
