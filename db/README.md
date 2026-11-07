# AutoRecipt database

SQLite, built from `recipt.json` (recipes + their ingredients) and `data/ingredients/*.json`
(the wider ingredient catalog). The JSON is the source of truth; the `.db` file is generated.

```
python db/build_db.py          # -> db/autorecipt.db
```

Easier: edit everything in the admin app (`admin/README.md`), which validates, builds and
publishes on every save.

| File | What it is |
|---|---|
| `schema.sql`        | Tables, keys, indexes, views |
| `../data/lookups.json` | Labels (vi/en) for cuisines, regions, dish types, methods, difficulty levels... |
| `refresh_stats.sql` | Recomputes ingredient `recipe_count` / `popularity` (run after adding recipes) |
| `build_db.py`       | Imports the JSON, checks every reference, reports warnings |
| `queries.sql`       | Example queries: search, recommend, no-repeat, recipe detail |

## Recipes and difficulty

`recipt.json` holds the first 50 recipes; `data/recipes/*.json` adds more in the same format
(`10_vietnamese_everyday.json`, `20_international.json`, `30_vietnamese_more.json`,
`40_korean.json`, `50_japanese.json`). Same rules as the ingredient files:
an entry with `name_vi` adds a recipe, an entry with only `id` patches one (`difficulty`, `tags`,
`meal_types`, `notes`, `image`). Every recipe cites at least one source in `references`.

`difficulty` is **1-5 stars** (table `difficulty_levels`): 1 rất dễ (luộc, hấp, ốp la),
2 dễ (xào, canh), 3 trung bình (kho, rim, chiên rồi sốt), 4 khó (cuốn, nướng, nhiều món phụ),
5 rất khó (ninh nước dùng nhiều giờ). `data/recipes/00_existing.json` re-rates the 50 recipes
from `recipt.json`, whose own `difficulty` field is the older 1-3 scale. The app ranks easy
recipes first among those with a similar pantry match.

## Cuisines

Every recipe has a `cuisine` (`recipes.cuisine_id` → `cuisines`, indexed): today 140 Vietnamese,
56 Korean, 54 Japanese and a few Chinese/Thai/Western dishes (253 in all). Query 7 in
`queries.sql` lists the counts and one cuisine's dishes; the app's Explore tab has a tile per
cuisine (`/explore?cuisine=korean`). Korean and Japanese recipes also use the dish types
`hotpot`, `side_dish` (banchan), `pickle` (kimchi), `snack` and `dessert`; pickles, snacks and
desserts are never picked for a meal tray or the auto-plan.

## Nutrition

`data/nutrition.json` holds approximate values per 100 g (kcal, protein, fat, carbs, fiber) for
the ingredients recipes use, plus grams per piece/clove/stalk/bunch, density for ml/tbsp/tsp, and
the edible share (shells, bones, whole spices). The build computes `recipe_nutrition` per serving
(optional lines left out, deep-frying oil counted at 15% absorbed) and a 0-100 `health_score`
with short notes (see `health_score()` in `build_db.py`). A missing value is reported as a warning.

`meal_plan` is the plan table for a future synced version; the web app currently keeps the
user's pantry, history and plan in the browser (see `app/src/store/user.ts`).

## Ingredient catalog and search ranking

`data/ingredients/` holds one file per group (meat, seafood, vegetables...). An entry with
`name_vi` adds an ingredient; an entry with only `id` patches one from `recipt.json`
(`00_existing.json` sets `commonness` for those). Defining the same id twice fails the build.

```json
{"id": "enoki", "name_vi": "Nấm kim châm", "name_en": "Enoki mushroom",
 "category": "mushroom", "commonness": 4, "aliases": ["nấm kim"]}
```

- `commonness` 1-5 is set by hand: 5 = in almost every Vietnamese kitchen, 1 = rare.
- Aliases are other names people use (regional words, receipt abbreviations). Versions without
  accents are generated automatically, so don't add "nam kim cham" by hand.
- `popularity` (0-100) is derived: 60% how many recipes use it, 10% how often it is a substitute,
  30% `commonness`. As recipes are added, real usage takes over from the hand-set score.
- Search (`queries.sql` #1) ranks whole-word matches first, then accent-exact ones
  ("cá" finds fish before "cà chua"), main names before aliases, Vietnamese before English, and
  then by `popularity`.

## How the tables link

```
cuisines ─┐  regions ─┐  dish_types ─┐  proteins ─┐
          └───────────┴──────────────┴───────────┴─> recipes
recipes ─< recipe_ingredients >─ ingredients ─< ingredient_aliases
                 └─< ingredient_substitutes >─ ingredients
recipes ─< recipe_steps ─< step_ingredients >─ ingredients
recipes ─< recipe_tags >─ tags        recipes ─< recipe_images / recipe_references
recipes ─< recipe_meal_types >─ meal_types
recipes ─< recipe_cooking_methods >─ cooking_methods
ingredients ─< pantry_items          recipes ─< meal_history     (user data)
```

`used_in` / `can_substitute_in` from the JSON are not stored; they come from the view
`v_ingredient_usage`, so they can't drift out of sync.

## Extending

- **New recipe or ingredient**: add it to `recipt.json`, rebuild. Unknown ingredient IDs fail the build.
- **New cuisine / method / dish type**: add a row to `data/lookups.json` (or in the admin app). A
  code used in the JSON but missing there is still added, with a warning.
- **New field**: add a column in `schema.sql` and one line in `build_db.py`.
- **On the phone**: the same `.db` file opens in the browser with sql.js or wa-sqlite.
  Catalog IDs are text slugs, so user tables (`pantry_items`, `meal_history`) stay valid when
  a new catalog version replaces the old one.
