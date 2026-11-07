# AutoRecipt — Hôm nay ăn gì?

Mobile-first web app (PWA) that suggests what to cook from the ingredients you have, with
step-by-step recipes, a weekly meal plan, calorie/macro tracking and a shopping list.
Vietnamese and English, light and dark mode. Runs fully in the browser — the recipe database is
SQLite loaded with sql.js, and personal data stays on the device.

253 recipes (140 Vietnamese, 56 Korean, 54 Japanese, a few Chinese/Thai/Western) and 480
ingredients. On first launch the app opens a landing page (`#/welcome`) that explains what it does;
it is also reachable from Profile → "Giới thiệu / About".

| Folder | What it is |
|---|---|
| `recipt.json`, `data/` | Source data: recipes, ingredients, nutrition, lookups (JSON) |
| `db/` | `build_db.py` builds the SQLite database; `fetch_images.py` caches recipe photos |
| `app/` | The recipe app (React + Vite + TypeScript) |
| `admin/` | Local admin dashboard to edit everything and publish to the app |

## Quick start

Requires Python 3.10+ and Node 20+.

```
python db/build_db.py          # build db/autorecipt.db from the JSON data
cd app
npm install
npm run dev                    # http://localhost:5173 (also on your Wi-Fi IP for phones)
npm test
npm run build                  # static site in app/dist/ — host anywhere over HTTPS
```

The `app/` folder is self-contained (the built database is committed as
`app/public/autorecipt.db`), so it deploys on its own. Vercel: set Root Directory to `app` —
see [app/DEPLOY.md](app/DEPLOY.md).

Admin dashboard (edit recipes, ingredients, nutrition, lookups; every save is validated, built
and published to the app):

```
cd admin/ui
npm install
npm start                      # http://127.0.0.1:8787
```

More detail: [app/README.md](app/README.md), [db/README.md](db/README.md),
[admin/README.md](admin/README.md).

## Data sources

Recipe text is written for this app and cross-checked against Bách hóa XANH, Điện máy XANH and
Wikipedia articles (linked in each recipe's `references`). Photos are from Wikimedia Commons under
free licenses; the author and license are shown in the app. Nutrition values are estimates.
