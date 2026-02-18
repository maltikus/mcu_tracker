import { useMemo, useState } from 'react';
import { searchMulti } from '../lib/tmdb';
import type { TMDBSearchResult } from '../types';

interface Props {
  apiKey: string;
  onAddTmdb: (payload: { tmdbType: 'movie' | 'tv'; tmdbId: number; title?: string; imageUrl?: string }) => void;
  onAddCustom: (payload: { title: string; imageUrl: string; customType: 'movie' | 'tv' }) => void;
}

export const SearchAddPanel = ({ apiKey, onAddTmdb, onAddCustom }: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [customType, setCustomType] = useState<'movie' | 'tv'>('movie');

  const canSearch = apiKey.trim().length > 0;

  const onSearch = async () => {
    if (!canSearch || !query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const fetched = await searchMulti(apiKey, query.trim());
      setResults(fetched.slice(0, 10));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const disabledAddCustom = useMemo(() => !customTitle.trim(), [customTitle]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h2 className="font-display text-lg font-semibold text-white">Manuell via TMDB hinzufügen</h2>
        <p className="mt-1 text-xs text-slate-400">Nutze TMDB Multi-Search für Movies und Serien.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title..."
            className="flex-1 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={!canSearch || loading}
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>
        {!canSearch ? (
          <p className="mt-2 text-xs text-amber-300">Setze zuerst einen TMDB API Key in Settings.</p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {results.map((result) => {
            const title = result.title ?? result.name ?? `TMDB #${result.id}`;
            const image = result.poster_path ? `https://image.tmdb.org/t/p/w300${result.poster_path}` : '';
            return (
              <li key={`${result.media_type}-${result.id}`} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <img
                  src={image || 'https://placehold.co/200x300?text=No+Poster'}
                  alt={title}
                  className="h-14 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{title}</p>
                  <p className="text-xs text-slate-400">{result.media_type === 'tv' ? 'Series' : 'Movie'}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAddTmdb({
                      tmdbType: result.media_type === 'tv' ? 'tv' : 'movie',
                      tmdbId: result.id,
                      title,
                      imageUrl: image
                    })
                  }
                  className="rounded-md border border-cyan-300/30 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                >
                  Add
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <h2 className="font-display text-lg font-semibold text-white">Custom Item anlegen</h2>
        <p className="mt-1 text-xs text-slate-400">Falls ein Inhalt nicht auf TMDB verfügbar ist.</p>
        <div className="mt-3 space-y-2">
          <input
            value={customTitle}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder="Custom title"
            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
          />
          <input
            value={customImage}
            onChange={(event) => setCustomImage(event.target.value)}
            placeholder="Image URL (optional)"
            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
          />
          <select
            value={customType}
            onChange={(event) => setCustomType(event.target.value as 'movie' | 'tv')}
            className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
          >
            <option value="movie">Movie</option>
            <option value="tv">Series</option>
          </select>
          <button
            type="button"
            disabled={disabledAddCustom}
            onClick={() => {
              onAddCustom({ title: customTitle.trim(), imageUrl: customImage.trim(), customType });
              setCustomTitle('');
              setCustomImage('');
            }}
            className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create custom item
          </button>
        </div>
      </div>
    </section>
  );
};
