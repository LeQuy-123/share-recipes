# AutoRecipt admin

Local dashboard to add, edit, delete and check recipes, ingredients (with nutrition), lookups
and units. Saving publishes straight to the main app.

```
cd admin/ui
npm install
npm start            # builds the UI, then runs the server: http://127.0.0.1:8787
```

While working on the admin UI itself: `npm run server` in one terminal and `npm run dev` in
another (http://localhost:5174, `/api` is proxied to the server).

## What a save does

1. The change is applied to an in-memory copy of all data files.
2. That copy is written to a temp folder and built with `db/build_db.py`.
3. **Only if the build succeeds** the changed files are rewritten — the previous version goes to
   `.admin-backups/<time>/` — and the new database is published to `db/autorecipt.db` and
   `app/public/autorecipt.db`, with `app/public/db-version.json`.
4. The main app checks `db-version.json` every minute and when the tab is shown again, and offers
   “Có dữ liệu món ăn mới — Tải lại”.

A failed check or build changes nothing; the error is shown in the form.

## Where data is saved

| Item | File |
|---|---|
| Original 50 recipes, 141 ingredients, units | `recipt.json` (edited in place) |
| Later recipes / ingredients | the `data/recipes/*.json` / `data/ingredients/*.json` file that defines them |
| New recipes / ingredients | `data/recipes/90_added.json` / `data/ingredients/90_added.json` |
| Nutrition | `data/nutrition.json` |
| Cuisines, dish types, methods, difficulty labels… | `data/lookups.json` |

Saving an item that had a patch entry (e.g. a difficulty in `data/recipes/00_existing.json`)
folds the patch into the item and removes the patch. Saving an ingredient from `recipt.json`
drops its `used_in` / `can_substitute_in` lists — they are derived from the recipes anyway.

Rules the server enforces: IDs can't be renamed after creation; an ingredient used by a recipe
can't be deleted; a lookup code or unit in use can't be removed; recipe times are recalculated
from the steps (prep + marinate + rest = prep time, non-“chờ” steps = hands-on time).

Edited a JSON file by hand? Press **Build lại & xuất bản** in the sidebar (or restart the server)
to reload the files and publish.

## Safety

The server listens on 127.0.0.1 only and has no login. Don't expose it to a network as is;
putting it online needs authentication first.
