import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSeason, getStillUrlSync, getTv, getPosterUrlSync } from '../lib/tmdb';
import { episodeKey, formatPercent } from '../lib/utils';
import type { LibraryItem, TMDBEpisode, TMDBSeasonRef, TvProgress } from '../types';
import { MediaThumb } from './MediaThumb';

interface Props {
  apiKey: string;
  item: LibraryItem;
  progress?: TvProgress;
  onClose: () => void;
  onToggleEpisode: (season: number, episode: number, watched: boolean) => void;
  onMarkSeason: (season: number, episodeNumbers: number[], watched: boolean) => void;
  onMarkUntil: (season: number, targetEpisode: number, episodeNumbers: number[]) => void;
  onClear: () => void;
}

const scopeEpisodes = (item: LibraryItem, episodes: TMDBEpisode[]): TMDBEpisode[] => {
  if (item.kind === 'tv_episode' && item.episode) {
    return episodes.filter((episode) => episode.episode_number === item.episode);
  }

  if (item.kind === 'tv_range' && item.rangeStart && item.rangeEnd) {
    return episodes.filter(
      (episode) => episode.episode_number >= item.rangeStart! && episode.episode_number <= item.rangeEnd!
    );
  }

  return episodes;
};

export const TvProgressModal = ({
  apiKey,
  item,
  progress,
  onClose,
  onToggleEpisode,
  onMarkSeason,
  onMarkUntil,
  onClear
}: Props) => {
  const [seasons, setSeasons] = useState<TMDBSeasonRef[]>([]);
  const [activeSeason, setActiveSeason] = useState<number>(item.season ?? 1);
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [showUntilPicker, setShowUntilPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackPoster, setFallbackPoster] = useState<string | null>(item.imageUrl ?? null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!item.tmdbId || !apiKey) {
        setLoading(false);
        setEpisodes([]);
        setSeasons([]);
        setError('No TMDB series data available for this item.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const tvDetails = await getTv(apiKey, item.tmdbId);
        const validSeasons = tvDetails.seasons.filter((season) => season.season_number > 0);
        setSeasons(validSeasons);
        setFallbackPoster(getPosterUrlSync(tvDetails.poster_path, 'w342'));
        const firstSeason = item.season ?? validSeasons[0]?.season_number ?? 1;
        setActiveSeason(firstSeason);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load series details.');
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [apiKey, item.season, item.tmdbId]);

  useEffect(() => {
    const fetchSeason = async () => {
      if (!item.tmdbId || !apiKey || !activeSeason) return;
      setLoading(true);
      setError(null);
      try {
        const seasonDetails = await getSeason(apiKey, item.tmdbId, activeSeason);
        setEpisodes(scopeEpisodes(item, seasonDetails.episodes ?? []));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load season data.');
      } finally {
        setLoading(false);
      }
    };

    void fetchSeason();
  }, [activeSeason, apiKey, item]);

  const watchedInSeason = useMemo(() => {
    if (!episodes.length) return 0;
    return episodes.filter((episode) => progress?.episodes[episodeKey(activeSeason, episode.episode_number)]?.watched)
      .length;
  }, [activeSeason, episodes, progress?.episodes]);

  const seasonPercent = episodes.length ? (watchedInSeason / episodes.length) * 100 : 0;

  const title = item.title ?? `Series #${item.tmdbId ?? ''}`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Progress details for ${title}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-bold text-white">{title}</h2>
              <p className="text-xs text-slate-400">Season progress: {formatPercent(seasonPercent)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-3 py-1 text-sm text-slate-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="grid h-[calc(92vh-80px)] gap-4 p-5 md:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <MediaThumb
                src={fallbackPoster ?? item.imageUrl ?? null}
                alt="Series poster"
                variant="poster"
                className="max-h-72"
              />
              <label className="text-xs text-slate-300" htmlFor="season-select">
                Season
              </label>
              <select
                id="season-select"
                value={activeSeason}
                onChange={(event) => setActiveSeason(Number(event.target.value))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                disabled={item.kind === 'tv_episode' || (item.kind === 'tv_range' && item.season !== null)}
              >
                {seasons.map((season) => (
                  <option key={season.season_number} value={season.season_number}>
                    {season.name || `Season ${season.season_number}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => onMarkSeason(activeSeason, episodes.map((episode) => episode.episode_number), true)}
                className="w-full rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
              >
                Staffel komplett markieren
              </button>
              <button
                type="button"
                onClick={() => onClear()}
                className="w-full rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
              >
                Alles als ungesehen
              </button>
              <button
                type="button"
                onClick={() => setShowUntilPicker((prev) => !prev)}
                className="w-full rounded-lg border border-sky-300/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/20"
              >
                Bis hierhin markieren
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
              {error ? (
                <div className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
                  Loading season data...
                </div>
              ) : null}

              {!loading && !episodes.length ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
                  No episode data available from TMDB for this season.
                </div>
              ) : null}

              {!loading &&
                episodes.map((episode) => {
                  const epKey = episodeKey(activeSeason, episode.episode_number);
                  const checked = progress?.episodes[epKey]?.watched ?? false;
                  return (
                    <div
                      key={episode.id}
                      className="grid grid-cols-[160px_1fr_auto] gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                    >
                      <MediaThumb
                        src={
                          getStillUrlSync(episode.still_path, 'w780') ?? fallbackPoster ?? 'https://placehold.co/780x439?text=No+Still'
                        }
                        alt={`Still for ${episode.name}`}
                        variant="still"
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          E{episode.episode_number}: {episode.name}
                        </p>
                        <p className="text-xs text-slate-400">Runtime: {episode.runtime ? `${episode.runtime} min` : 'n/a'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              onToggleEpisode(activeSeason, episode.episode_number, event.target.checked)
                            }
                          />
                          Seen
                        </label>
                        {showUntilPicker ? (
                          <button
                            type="button"
                            onClick={() =>
                              onMarkUntil(
                                activeSeason,
                                episode.episode_number,
                                episodes.map((entry) => entry.episode_number)
                              )
                            }
                            className="rounded-md border border-sky-300/30 px-2 py-1 text-xs text-sky-200 hover:bg-sky-500/20"
                          >
                            Mark until here
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
