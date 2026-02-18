# MCU Tracker (React + Vite + Tailwind)

Statische GitHub-Pages-Web-App zum Tracken deines MCU-Watch-Progress (Filme, Serien, Episoden) inkl. Supabase-Sync.

## Features

- Chronologie-Seed mit 125 Einträgen (`movie`, `tv_season`, `tv_episode`, `tv_range`, `special`)
- Dashboard Timeline + Grid, Filter und Sortierung
- TMDB-Metadaten (Movie/TV/Season/Episodes), lokale API-Cache-Strategie
- Progress-Tracking für Movie, Series und Episode
- Supabase Sync nach Login (Magic Link)
- Offline-Fallback mit Pending-Sync-Queue in localStorage
- Import/Export JSON
- Drag & Drop Reorder

## Setup

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## TMDB Key

1. App öffnen
2. `/settings` aufrufen
3. TMDB API Key speichern

Hinweis: Der TMDB-Key ist clientseitig sichtbar (statische App).

## Supabase (Progress Sync)

Der Client nutzt:

- URL: `https://vyuyyvuolbeuhsotbypn.supabase.co`
- Publishable Key: `sb_publishable_LJvwdEWybTE1XwagTOBz-w_x53pKLqw`

DB-Schema + RLS liegen in:

- `supabase/schema.sql`

Ausführen im Supabase SQL Editor.

## GitHub Pages Deployment

Workflow:

- `.github/workflows/deploy.yml`

Push auf `main` baut mit passendem `--base=/REPO_NAME/` und deployt nach Pages. jaja

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
# mcu_tracker
