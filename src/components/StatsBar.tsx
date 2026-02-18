import type { LibraryItem } from '../types';
import { formatDateTime, formatPercent } from '../lib/utils';

interface Props {
  library: LibraryItem[];
  watchedMovies: number;
  totalMovies: number;
  watchedEpisodes: number;
  totalEpisodesEstimate: number;
  lastActivity?: string;
}

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
  </div>
);

export const StatsBar = ({
  library,
  watchedMovies,
  totalMovies,
  watchedEpisodes,
  totalEpisodesEstimate,
  lastActivity
}: Props) => {
  const totalItems = library.length;
  const watchedItems = watchedMovies + watchedEpisodes;
  const totalTrackable = totalMovies + totalEpisodesEstimate;
  const overall = totalTrackable > 0 ? (watchedItems / totalTrackable) * 100 : 0;
  const moviePercent = totalMovies > 0 ? (watchedMovies / totalMovies) * 100 : 0;
  const tvPercent = totalEpisodesEstimate > 0 ? (watchedEpisodes / totalEpisodesEstimate) * 100 : 0;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatCard label="Overall Progress" value={formatPercent(overall)} sub={`${watchedItems}/${totalTrackable} units`} />
      <StatCard
        label="Movies"
        value={formatPercent(moviePercent)}
        sub={`${watchedMovies}/${totalMovies} watched`}
      />
      <StatCard
        label="Series Episodes"
        value={formatPercent(tvPercent)}
        sub={`${watchedEpisodes}/${totalEpisodesEstimate} watched`}
      />
      <StatCard label="Library Items" value={`${totalItems}`} sub={`Last activity: ${formatDateTime(lastActivity)}`} />
    </div>
  );
};
