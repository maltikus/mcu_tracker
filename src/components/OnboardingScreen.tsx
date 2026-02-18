import { Link } from 'react-router-dom';

export const OnboardingScreen = () => (
  <section className="rounded-3xl border border-cyan-300/20 bg-cyan-500/10 p-8 text-center shadow-glow">
    <h1 className="font-display text-3xl font-bold text-white">TMDB API Key Required</h1>
    <p className="mx-auto mt-3 max-w-2xl text-slate-200">
      To load movie, TV, season, and episode metadata automatically, add your TMDB API key in Settings.
      The key is stored only in your browser localStorage and is visible client-side.
    </p>
    <Link
      to="/settings"
      className="mt-6 inline-flex rounded-full bg-cyan-400 px-5 py-2.5 font-semibold text-slate-900 transition hover:bg-cyan-300"
    >
      Go to Settings
    </Link>
  </section>
);
