# Deploying the app to Vercel

The `app/` folder is a self-contained static site (Vite + React). Everything it needs to build is
inside this folder, including the recipe database (`public/autorecipt.db`) and recipe photos
(`public/img/`), so Vercel only needs this one folder.

## One-time setup (Vercel dashboard)

1. Push the repository to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repository.
3. Set **Root Directory** to `app`.
4. Leave the rest as detected. `app/vercel.json` already sets:
   - Framework: Vite
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Node.js version (Project Settings → Build and Deployment): 20.x or newer.
6. Click **Deploy**. No environment variables are needed: the site address used in canonical
   links, `sitemap.xml` and link previews comes from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`
   (your production domain, including a custom one). To force another address, add the
   environment variable `SITE_URL=https://your-domain.com`.

Every push to `main` then deploys to production; other branches and pull requests get preview URLs.

## Or from the command line

```
npm i -g vercel
cd app
vercel            # first run links the project; answer "./" for the code directory
vercel --prod     # production deploy
```

## Releasing new recipe data

The deployed database is the committed file `app/public/autorecipt.db`. To release data changes:

1. Edit the data, either in the admin dashboard (its *Publish* writes `app/public/autorecipt.db`
   and `app/public/db-version.json`) or by hand in `recipt.json` / `data/` followed by
   `python db/build_db.py` and `npm run build` (or `npm run dev`) in `app/`, which copies the new
   database into `public/`.
2. Commit `app/public/autorecipt.db` and `app/public/db-version.json` and push.

Open copies of the app notice the new `db-version.json` within a minute and show a "new data,
reload" banner.

New recipe photos (`python db/fetch_images.py`) land in `app/public/img/recipes/`; commit them too.

## What `vercel.json` does

| Path | Caching |
|---|---|
| `/assets/*` (hashed JS, CSS, sql.js WebAssembly) | 1 year, immutable |
| `/img/*`, `/icons/*` | 1 week |
| `/`, `index.html`, `sw.js`, `precache.json`, `db-version.json`, `autorecipt.db`, `manifest.webmanifest` | always revalidated, so a deploy is picked up right away |

It also sets basic security headers, `cleanUrls` (so `/recipe/pho-bo` serves the built
`recipe/pho-bo.html`), and a rewrite that sends every other path (`/profile`, `/cook/…`) to
`index.html`. Old `#/recipe/pho-bo` links are turned into `/recipe/pho-bo` by the app.

## Release number

Every screen shows the release at the bottom, e.g. `AutoRecipt v0.2.0 · 1a2b3c4`: the `version`
in `app/package.json` and the commit Vercel built. For a new release, bump `version` (e.g.
`npm version minor --no-git-tag-version` in `app/`), commit and push.

## SEO

The build (`scripts/seo.ts`) writes, from the recipe database:

- one HTML page per recipe (`/recipe/<id>`) and per ingredient used in recipes
  (`/ingredient/<id>`), plus `/welcome`, `/explore`, `/pantry`, `/plan`, each with its own
  `<title>`, description, canonical link, Open Graph / Twitter tags (photo of the dish), and
  readable text in the body for crawlers and link previews that do not run JavaScript;
- schema.org `Recipe` data on recipe pages (ingredients, steps, times, calories), which Google
  uses for recipe results;
- `sitemap.xml` (all of the above) and `robots.txt` (points to the sitemap; `/cook/` and
  `/profile` are not indexed).

In the app, `<title>` and the description follow the screen. Source maps (`assets/*.js.map`) are
published for debugging and marked `noindex`.

After the first production deploy, add the site in
[Google Search Console](https://search.google.com/search-console) and submit
`https://<your-domain>/sitemap.xml`. Check a recipe with the
[Rich Results Test](https://search.google.com/test/rich-results).

## Check after deploying

On a computer:

- The site opens on the landing page; "Start" leads to the home screen with dishes.
- A recipe link opened in a new tab (e.g. `https://<your-app>.vercel.app/recipe/pho-bo`) shows
  the recipe, and its back arrow goes to Explore. Reloading any screen works.
- `https://<your-app>.vercel.app/robots.txt` and `/sitemap.xml` open; the sitemap lists your
  domain, not `localhost`.
- The release at the bottom of a screen matches the commit you pushed.
- DevTools → Application: the service worker is active and the manifest has no errors.

On an iPhone (Safari):

- Pages fit the screen with no sideways scrolling, in portrait and landscape.
- Share → **Add to Home Screen**, then open it from the home screen: it runs full screen, the tab
  bar sits above the home indicator.
- Turn on Airplane mode and reopen it: the app and recipes still load (photos you have viewed
  before are cached).
- Cook mode: start a step timer, lock the phone for a while, unlock: the time left is correct and
  the alarm sounds when it reaches zero (the ring/silent switch must be on ring).
- Profile → Backup saves a `.json` file to Files; Restore can pick it again.

## Troubleshooting

- **Build fails with "Missing public/autorecipt.db"**: the database was not committed. Run
  `python db/build_db.py`, then `npm run build` in `app/`, and commit `app/public/autorecipt.db`.
- **Old version still showing after a deploy**: the service worker serves the cached copy while
  offline only; online it fetches the new files first. A normal reload is enough; if a browser
  still holds an old copy, close all its tabs of the app and open it again.
- **Photos missing**: check that `app/public/img/recipes/` (and its `index.json`) is committed.
  Without local photos the app falls back to the Wikimedia URLs.
