export const AboutPage = () => (
  <section className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
    <h1 className="font-display text-2xl font-bold text-white">About</h1>
    <p className="mt-2 text-slate-300">
      This app tracks Marvel Cinematic Universe watch progress with TMDB metadata.
    </p>
    <p className="mt-2 text-sm text-slate-400">
      This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
    <a
      href="https://developer.themoviedb.org/"
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-white/10"
    >
      TMDB Developer Docs
    </a>
  </section>
);
