export const FooterAttribution = () => (
  <footer className="mt-12 border-t border-white/10 py-6 text-center text-xs text-slate-400">
    <p className="mb-2">
      This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
    <a
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200 transition hover:bg-white/10"
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noreferrer"
    >
      <img
        src={`${import.meta.env.BASE_URL}tmdb-logo.svg`}
        alt="TMDB"
        className="h-4 w-auto"
      />
      <span>TMDB</span>
    </a>
  </footer>
);
