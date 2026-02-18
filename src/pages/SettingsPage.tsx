import { useMemo, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { exportState, importState, resetState } from '../lib/storage';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { searchMulti } from '../lib/tmdb';

export const SettingsPage = () => {
  const { state, dispatch, resolveTmdbId } = useApp();
  const { pushToast } = useToast();
  const { user, loading, signInWithMagicLink, signOut } = useAuth();
  const [keyInput, setKeyInput] = useState(state.settings.tmdbApiKey);
  const [includeKey, setIncludeKey] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const unresolved = useMemo(
    () => state.library.filter((item) => !item.tmdbId && item.tmdbType !== null).slice(0, 12),
    [state.library]
  );

  const saveKey = () => {
    dispatch({ type: 'SET_API_KEY', payload: keyInput });
    pushToast('TMDB API key saved locally.', 'success');
  };

  const exportJson = () => {
    const payload = exportState(state, includeKey);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mcu-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async (file: File) => {
    const text = await file.text();
    if (!window.confirm('Import überschreibt den aktuellen Zustand. Fortfahren?')) return;

    try {
      const imported = importState(text);
      dispatch({ type: 'IMPORT_STATE', payload: imported });
      setKeyInput(imported.settings.tmdbApiKey);
      pushToast('Import completed.', 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Import failed.', 'error');
    }
  };

  const resolveWithFirstMatch = async (itemId: string, title: string, tmdbType: 'movie' | 'tv') => {
    if (!state.settings.tmdbApiKey) {
      pushToast('Set TMDB API key first.', 'error');
      return;
    }

    setResolvingId(itemId);
    try {
      const results = await searchMulti(state.settings.tmdbApiKey, title);
      const first = results.find((result) => result.media_type === tmdbType);
      if (!first) {
        pushToast(`No ${tmdbType} match found for: ${title}`, 'error');
        return;
      }
      resolveTmdbId(itemId, tmdbType, first.id);
      pushToast(`Mapped ${title} -> TMDB ${first.id}`, 'success');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Resolve failed.', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-300">
          API keys are stored in localStorage and are visible client-side in static apps.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg font-semibold text-white">Account Sync (Supabase)</h2>
        {loading ? <p className="mt-2 text-sm text-slate-300">Checking session...</p> : null}
        {user ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-emerald-300">Signed in as {user.email}</p>
            <p className="text-xs text-slate-400">Supabase is now the source of truth for progress.</p>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                pushToast('Signed out.', 'success');
              }}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-slate-300">Sign in with email magic link for cross-device progress sync.</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                type="email"
                placeholder="you@example.com"
                className="min-w-[240px] rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await signInWithMagicLink(emailInput.trim());
                    pushToast('Magic link sent. Check your email.', 'success');
                  } catch (error) {
                    pushToast(error instanceof Error ? error.message : 'Login failed.', 'error');
                  }
                }}
                className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Send Magic Link
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg font-semibold text-white">TMDB API Key</h2>
        <label htmlFor="tmdb-key" className="mt-3 block text-xs text-slate-300">
          Enter your TMDB v3 API key
        </label>
        <input
          id="tmdb-key"
          value={keyInput}
          onChange={(event) => setKeyInput(event.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
        />
        <p className="mt-2 text-xs text-amber-300">
          Security note: On GitHub Pages, this key can be inspected in your browser.
        </p>
        <button
          type="button"
          onClick={saveKey}
          className="mt-3 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Save Key
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg font-semibold text-white">Resolve Missing TMDB IDs</h2>
        <p className="mt-1 text-xs text-slate-400">Uses multi-search and applies the first matching media type.</p>
        <ul className="mt-3 space-y-2">
          {unresolved.length === 0 ? (
            <li className="text-sm text-emerald-300">No unresolved TMDB IDs in the visible set.</li>
          ) : (
            unresolved.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
                <div>
                  <p className="text-sm text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">Type: {item.tmdbType}</p>
                </div>
                <button
                  type="button"
                  disabled={resolvingId === item.id || item.tmdbType === null}
                  onClick={() => resolveWithFirstMatch(item.id, item.title, item.tmdbType as 'movie' | 'tv')}
                  className="rounded-lg border border-sky-300/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 disabled:opacity-50"
                >
                  {resolvingId === item.id ? 'Resolving...' : 'Resolve'}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-display text-lg font-semibold text-white">Import / Export</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={includeKey}
              onChange={(event) => setIncludeKey(event.target.checked)}
            />
            Export with TMDB key
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="rounded-lg border border-sky-300/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200"
          >
            Import JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void runImport(file);
              event.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-rose-300/20 bg-rose-500/5 p-5">
        <h2 className="font-display text-lg font-semibold text-white">Danger Zone</h2>
        <p className="mt-2 text-sm text-slate-300">Reset deletes your local library and progress and restores seed data.</p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Alles zurücksetzen?')) return;
            const fresh = resetState();
            dispatch({ type: 'RESET_STATE', payload: fresh });
            setKeyInput(fresh.settings.tmdbApiKey);
            pushToast('State reset to seed.', 'success');
          }}
          className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
        >
          Reset App State
        </button>
      </section>
    </div>
  );
};
