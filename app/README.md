# AutoRecipt app

Mobile-first web app: "Hôm nay ăn gì?" — dishes you can cook from what is at home, step-by-step
recipes, a weekly meal plan with calories, and a shopping list. Runs fully in the browser:
the recipe database (`public/autorecipt.db`, a committed copy of `../db/autorecipt.db`) is opened
with sql.js, and the user's own data is
kept in localStorage on the device. Nothing is sent to a server.

## Run

```
npm install
npm run dev                   # http://localhost:5173, also on your Wi-Fi IP for a phone
npm test                      # logic + screen tests against the real database
npm run build                 # static site in dist/ (any static host, relative paths)
```

This folder builds on its own. After changing `recipt.json` or `data/*.json`, run
`python ../db/build_db.py`; the next `npm run dev` / `npm run build` copies the new database into
`public/`. Commit `public/autorecipt.db` and `public/db-version.json` to release it.

Deploying to Vercel (Root Directory = `app`): see [DEPLOY.md](DEPLOY.md).

On a phone, open the Network URL that `npm run dev` prints (same Wi-Fi). Installing it to the home
screen and offline use need HTTPS, so use a deployed build for that.

## Screens

| Tab | What it does |
|---|---|
| Hôm nay | Dishes ranked by pantry match ("Nấu được ngay", "Chỉ thiếu 1–2"), a balanced *mâm cơm* (main + soup + vegetable), filters by meal, healthy, ≤30 min, cooking method, "Luôn gợi ý món mới" |
| Tủ lạnh | Ingredient search ranked by popularity, one-tap common items, browse by category. Camera / receipt scan placeholders (next version) |
| Khám phá | Search by dish or ingredient name (accents optional), filter by dish type, method, meal, protein, healthy; favorites |
| Kế hoạch | Week view, kcal and macros vs target per day with advice, auto-plan 7 days (no repeats, prefers pantry), shopping list |
| Cá nhân | Body info → daily kcal target (Mifflin-St Jeor), no-repeat window, cooked history, backup/restore |
| Recipe | Servings scaler, have/missing/substitute per ingredient, nutrition per serving, steps, add to plan |
| Cook mode | One step per screen, big text, step ingredients with scaled amounts, timers with alarm, screen kept on, swipe or arrow keys; at the end marks the dish cooked and clears used-up ingredients |

## Code map

```
src/db/sqlite.ts      open the database, all()/get() helpers
src/db/catalog.ts     recipe/ingredient queries, ingredient search ranking, pantry matching
src/db/text.ts        normalize()/lower(): same rules as db/build_db.py
src/store/user.ts     pantry, history, favorites, plan, settings, profile (localStorage)
src/lib/planner.ts    recommend, mâm cơm, auto-plan, shopping list
src/lib/nutrition.ts  targets, rice bowl, day advice
src/pages/*           one file per screen
public/sw.js          offline cache (app + database: network first; photos: cache first)
```
