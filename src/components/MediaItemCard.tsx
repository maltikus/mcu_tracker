import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { LibraryItem } from '../types';
import type { MediaSummary } from '../lib/media';
import { fetchMediaSummary } from '../lib/media';
import { formatPercent } from '../lib/utils';
import { MediaThumb } from './MediaThumb';

interface Props {
  item: LibraryItem;
  apiKey: string;
  variant?: 'grid' | 'timeline';
  movieWatched: boolean;
  seriesWatched: boolean;
  tvWatchedCount: number;
  tvTotalCount: number;
  onToggleMovie: (watched: boolean) => void;
  onToggleSeries: (watched: boolean) => void;
  onOpenTv: () => void;
  onRemove: () => void;
}

const isSeriesKind = (item: LibraryItem, summary?: MediaSummary | null): boolean =>
  summary?.type === 'tv' || item.kind === 'tv_episode' || item.kind === 'tv_range' || item.kind === 'tv_season';

export const MediaItemCard = ({
  item,
  apiKey,
  variant = 'grid',
  movieWatched,
  seriesWatched,
  tvWatchedCount,
  tvTotalCount,
  onToggleMovie,
  onToggleSeries,
  onOpenTv,
  onRemove
}: Props) => {
  const [summary, setSummary] = useState<MediaSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const resolve = async () => {
      setLoading(true);
      try {
        const result = await fetchMediaSummary(apiKey, item);
        if (mounted) setSummary(result);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void resolve();
    return () => {
      mounted = false;
    };
  }, [apiKey, item]);

  const series = isSeriesKind(item, summary);
  const title = summary?.title ?? item.title ?? `TMDB #${item.tmdbId ?? ''}`;
  const image = summary?.imageUrl ?? item.imageUrl ?? null;
  const tvPercent = tvTotalCount > 0 ? (tvWatchedCount / tvTotalCount) * 100 : 0;

  const badge = useMemo(() => {
    if (!series) return movieWatched ? 'Seen' : 'Unwatched';
    return `${tvWatchedCount}/${tvTotalCount || summary?.totalEpisodes || 0} eps`;
  }, [series, movieWatched, summary?.totalEpisodes, tvTotalCount, tvWatchedCount]);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-white/10 bg-white/5 p-3 shadow-glow backdrop-blur"
    >
      <div className={variant === 'timeline' ? 'flex gap-3' : ''}>
        <div className={variant === 'grid' ? 'relative mx-auto w-full max-w-[190px]' : 'relative w-24 shrink-0'}>
          <MediaThumb src={image} alt={`Poster for ${title}`} variant="poster" />
          <span className="absolute left-2 top-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs text-white">
            {loading ? 'Loading...' : badge}
          </span>
        </div>

        <div className={variant === 'timeline' ? 'min-w-0 flex-1' : ''}>
          <div className="mt-3 space-y-2">
            <div>
              <h3 className="line-clamp-2 text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs text-slate-400">{series ? 'Series / Episode' : 'Movie / Special'}</p>
              {item.note ? <p className="line-clamp-2 text-xs text-slate-500">{item.note}</p> : null}
            </div>

            {!series ? (
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  aria-label={`Toggle watched for ${title}`}
                  type="checkbox"
                  checked={movieWatched}
                  onChange={(event) => onToggleMovie(event.target.checked)}
                />
                Gesehen
              </label>
            ) : (
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                  <input
                    aria-label={`Toggle series watched for ${title}`}
                    type="checkbox"
                    checked={seriesWatched}
                    onChange={(event) => onToggleSeries(event.target.checked)}
                  />
                  Serie gesehen
                </label>
                <p className="text-xs text-slate-300">Series progress: {formatPercent(tvPercent)}</p>
                <button
                  type="button"
                  onClick={onOpenTv}
                  className="mt-1 rounded-lg border border-sky-300/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
                >
                  Episoden verwalten
                </button>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-xs text-slate-500">Order #{item.orderIndex}</span>
              <button
                type="button"
                onClick={onRemove}
                className="text-xs text-rose-300 hover:text-rose-200"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
