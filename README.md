# Sinumerik Backplot · GROB

Live: https://sosgrob.vercel.app

A browser tool for GROB machining centres with a SINUMERIK 840D sl control:
- 3D backplot of Sinumerik programs (playback, measure, DXF, tools, analytics, right-click explanations)
- ESPRIT ListCL (`.lst`, `.cl`) and APT CLS (`.cls`) → Sinumerik program

Single-file app: `src/cnc-backplot.html`. All edits are made there.

## Repository

| Path | Role |
|---|---|
| `src/cnc-backplot.html` | The application source, readable. Never served. |
| `build.js` | Stamps the build time, minifies the script with terser → `public/index.html`. |
| `protect.mjs` | Domain lock + obfuscation of `public/*.html`. |
| `api/explain.mjs` | Vercel function for the right-click AI explanations (Google Gemini). |
| `vercel.json` | Build command, output folder `public`, security headers. |
| `assets/` | Icon sources (SVG, 180 px PNG); the page carries them inline. |
| `local/GROB-Backplot.bat` | Opens the source in a browser on your PC. Not protected, not to be distributed. |
| `public/` | Build output, git-ignored, the only folder Vercel serves. |

## 1. GitHub

1. github.com → **New repository** → name `grob-backplot` → **Private** → Create (no README).
2. On your PC, in this folder:
   ```
   git init
   git add .
   git commit -m "Sinumerik Backplot GROB 1.0"
   git branch -M main
   git remote add origin https://github.com/<your-account>/grob-backplot.git
   git push -u origin main
   ```
   (Or GitHub Desktop: File → Add local repository → this folder → Publish repository, Private.)

## 2. Vercel

1. vercel.com → **Add New… → Project** → Import `grob-backplot` from GitHub.
2. Framework preset: **Other**. Build command, output folder and install are read from
   `vercel.json` / `package.json`; leave them as they are.
3. **Environment Variables** (before the first deploy):
   - `CNC_ALLOWED_HOSTS`: leave it unset; the site is locked to `sosgrob.vercel.app`, the
     default in `protect.mjs`. Set it only to add or change addresses (comma-separated, wildcards
     like `*.gearmoto.ro`); a value here replaces the default, so include `sosgrob.vercel.app`.
     Any other address (including Vercel's preview URLs) shows "This copy is not licensed to run here".
   - `GEMINI_API_KEY` = key from aistudio.google.com/apikey (put a spend limit on it). Optional:
     without it the offline decode still works, the AI part says it is not connected.
   - `GEMINI_MODEL` optional, tried first.
4. **Deploy**. Every push to `main` deploys again.

Custom domain (e.g. `backplot.gearmoto.ro`): add it to `CNC_ALLOWED_HOSTS` **first**, redeploy,
then add the domain under Settings → Domains.

Emergency: `CNC_PROTECT=0` builds without lock and obfuscation (remove it afterwards).

## 3. Local

```
npm install
npm run build        # public/index.html, protected
npm run serve        # http://localhost:3000 (localhost is always allowed)
```
To work on the source, open `src/cnc-backplot.html` directly (or `local/GROB-Backplot.bat`).

See `HANDOVER.md` for the technical details and the open items for the GROB samples.
