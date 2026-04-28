# Time Tracker

Personal time tracking and routine management PWA.

## Quick start

```bash
npm install
npm run dev          # local dev server
npm run build        # production build
npm run deploy       # deploy to GitHub Pages
```

## Setup steps

1. **Create the GitHub repo** (e.g. `time-tracker`) under your account `alliskg`.

2. **Set the base path.** In `vite.config.js`, change `REPO_NAME` if your repo isn't named `time-tracker`:
   ```js
   const REPO_NAME = '/your-repo-name/';
   ```

3. **Push the code:**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/alliskg/time-tracker.git
   git push -u origin main
   ```

4. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```
   This builds and pushes the `dist/` folder to a `gh-pages` branch.

5. **Enable GitHub Pages.** On GitHub: Settings → Pages → Source = `gh-pages` branch, root.

6. **Install on iPhone:** Open the URL in Safari (e.g. `https://alliskg.github.io/time-tracker/`), tap Share → Add to Home Screen. The app runs full-screen and works offline.

## Replacing the placeholder icons

The icons in `public/` (favicon.svg, pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png) are simple orange clock placeholders. Replace them with your own art whenever you want — keep the same filenames and sizes.

## Architecture

- Single-file React component: `src/TimeTracker.jsx`
- All state in localStorage, namespaced with `tt_` prefix
- Backup/restore via JSON in Settings → Backup & restore
- No backend, no analytics, fully local

## Data model

Stored under these `tt_*` keys in localStorage:
- `tt_nodes` — category tree (arbitrary depth, soft-delete via `hidden`)
- `tt_entries` — completed time entries
- `tt_stopwatches` — active timers (persist across app close)
- `tt_routines` — routine definitions
- `tt_routineLogs` — per-day routine completion records
- `tt_dayPlans` — reserved for the future day-planning feature

The data is fully serializable JSON, so the planned AI analysis tab can ingest it directly.
