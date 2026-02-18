import { Link, NavLink } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { cn } from '../lib/utils';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/library', label: 'Library' },
  { to: '/settings', label: 'Settings' },
  { to: '/about', label: 'About' }
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const {
    state: {
      settings: { theme }
    },
    dispatch
  } = useApp();

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <header className="sticky top-4 z-50 mb-8 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 shadow-glow backdrop-blur dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-white">
            MCU Tracker
          </Link>
          <nav className="flex items-center gap-2" aria-label="Main">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3 py-1.5 text-sm transition',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              dispatch({ type: 'SET_THEME', payload: next });
              document.body.classList.toggle('light', next === 'light');
            }}
            className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
          >
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};
