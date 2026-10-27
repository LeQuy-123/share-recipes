-- AutoRecipt database schema (SQLite)
--
-- Layout
--   1. Lookup tables   : small code lists (cuisine, region, unit...). Add a row to extend.
--   2. Catalog tables  : ingredients and recipes, imported from recipt.json.
--   3. User tables     : pantry and meal history, written by the app on the phone.
--   4. Views           : derived data (used_in, recipe cards, pantry matching).
--
-- Catalog IDs are the stable text slugs from the JSON ("pork_belly", "canh-chua-ca-loc"),
-- so user data keeps pointing at the right rows when the catalog is rebuilt.
-- Child rows (steps, recipe ingredients...) use INTEGER ids.

PRAGMA foreign_keys = ON;

CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- ---------------------------------------------------------------------------
-- 1. Lookup tables
-- ---------------------------------------------------------------------------

CREATE TABLE units (
    id      TEXT PRIMARY KEY,                -- g, tbsp, clove...
    name_vi TEXT NOT NULL,
    name_en TEXT NOT NULL,
    type    TEXT NOT NULL CHECK (type IN ('weight', 'volume', 'count')),
    ml      REAL                             -- volume units only: ml per 1 unit
);

CREATE TABLE ingredient_categories (         -- what an ingredient is: meat, vegetable...
    id      TEXT PRIMARY KEY,
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ingredient_groups (             -- role inside a recipe: main, garnish, sauce...
    id      TEXT PRIMARY KEY,
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cuisines (
    id      TEXT PRIMARY KEY,                -- vietnamese, korean, japanese...
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE regions (
    id         TEXT PRIMARY KEY,             -- north, central, south, all
    cuisine_id TEXT REFERENCES cuisines(id),
    name_vi    TEXT,
    name_en    TEXT,
    sort       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE dish_types (
    id      TEXT PRIMARY KEY,                -- soup, stir_fry, noodle_soup...
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE proteins (
    id      TEXT PRIMARY KEY,                -- pork, beef, fish, none...
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE meal_types (
    id      TEXT PRIMARY KEY,                -- breakfast, lunch, dinner...
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cooking_methods (
    id      TEXT PRIMARY KEY,                -- fry, steam, grill...
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE step_types (
    id      TEXT PRIMARY KEY,                -- prep, marinate, cook, rest, serve
    name_vi TEXT,
    name_en TEXT,
    sort    INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 2. Catalog: ingredients
-- ---------------------------------------------------------------------------

-- Ranking columns:
--   commonness       curated, 1 = rare / specialty ... 5 = in almost every Vietnamese kitchen
--   recipe_count     recipes that use it (derived, see refresh_stats.sql)
--   substitute_count recipes where it is a listed substitute (derived)
--   popularity       0-100 search score mixing the three (derived, see refresh_stats.sql)
CREATE TABLE ingredients (
    id               TEXT PRIMARY KEY,       -- pork_belly
    name_vi          TEXT NOT NULL,
    name_en          TEXT NOT NULL,
    category_id      TEXT NOT NULL REFERENCES ingredient_categories(id),
    pantry_staple    INTEGER NOT NULL DEFAULT 0 CHECK (pantry_staple IN (0, 1)),
    commonness       INTEGER NOT NULL DEFAULT 2 CHECK (commonness BETWEEN 1 AND 5),
    recipe_count     INTEGER NOT NULL DEFAULT 0,
    substitute_count INTEGER NOT NULL DEFAULT 0,
    popularity       REAL    NOT NULL DEFAULT 0
);
CREATE INDEX idx_ingredients_popularity ON ingredients(popularity DESC);
CREATE INDEX idx_ingredients_category   ON ingredients(category_id, popularity DESC);

-- Every searchable name for an ingredient: its own names plus aliases
-- (spelling without accents, receipt abbreviations like "TH.BA CHI").
-- term_lower = lowercase with accents (SQLite's lower() only handles ASCII, so it is stored);
-- term_norm  = lowercase, no Vietnamese diacritics. Search matches on term_norm and uses
-- term_lower to rank accent-exact matches first ("cá" before "cà").
-- One term may belong to several ingredients ("rau om"), so it is not unique.
CREATE TABLE ingredient_aliases (
    id            INTEGER PRIMARY KEY,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    term          TEXT NOT NULL,
    term_lower    TEXT NOT NULL,
    term_norm     TEXT NOT NULL,
    kind          TEXT NOT NULL DEFAULT 'alias' CHECK (kind IN ('name_vi', 'name_en', 'alias')),
    UNIQUE (ingredient_id, term)
);
CREATE INDEX idx_ingredient_aliases_norm ON ingredient_aliases(term_norm);

-- Nutrition per 100 g as bought (data/nutrition.json). Approximate.
CREATE TABLE ingredient_nutrition (
    ingredient_id    TEXT PRIMARY KEY REFERENCES ingredients(id) ON DELETE CASCADE,
    kcal             REAL NOT NULL,
    protein_g        REAL NOT NULL,
    fat_g            REAL NOT NULL,
    carbs_g          REAL NOT NULL,          -- includes fiber
    fiber_g          REAL NOT NULL DEFAULT 0,
    density_g_per_ml REAL NOT NULL DEFAULT 1, -- converts ml / tbsp / tsp to grams
    edible_ratio     REAL NOT NULL DEFAULT 1  -- share eaten: shells, bones, whole spices removed
);

-- Grams in one piece / clove / stalk / leaf / bunch of an ingredient.
CREATE TABLE ingredient_unit_weights (
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    unit_id       TEXT NOT NULL REFERENCES units(id),
    grams         REAL NOT NULL,
    PRIMARY KEY (ingredient_id, unit_id)
);

-- ---------------------------------------------------------------------------
-- 2. Catalog: recipes
-- ---------------------------------------------------------------------------

-- How hard a recipe is to make, shown as 1-5 stars. The app ranks easy recipes first.
CREATE TABLE difficulty_levels (
    id             INTEGER PRIMARY KEY CHECK (id BETWEEN 1 AND 5),
    name_vi        TEXT NOT NULL,
    name_en        TEXT NOT NULL,
    description_vi TEXT
);

CREATE TABLE recipes (
    id              TEXT PRIMARY KEY,        -- canh-chua-ca-loc
    name_vi         TEXT NOT NULL,
    name_en         TEXT,
    description     TEXT,
    cuisine_id      TEXT NOT NULL REFERENCES cuisines(id),
    region_id       TEXT REFERENCES regions(id),
    dish_type_id    TEXT REFERENCES dish_types(id),
    main_protein_id TEXT REFERENCES proteins(id),
    difficulty      INTEGER NOT NULL REFERENCES difficulty_levels(id),  -- 1-5 stars
    servings        INTEGER CHECK (servings > 0),
    prep_min        INTEGER,
    cook_min        INTEGER,
    total_min       INTEGER,
    active_min      INTEGER,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_recipes_cuisine   ON recipes(cuisine_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty, total_min);
CREATE INDEX idx_recipes_dish_type ON recipes(dish_type_id);
CREATE INDEX idx_recipes_protein   ON recipes(main_protein_id);

CREATE TABLE recipe_other_names (            -- "Thịt kho tàu" for thit-kho-trung
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    name      TEXT NOT NULL,
    PRIMARY KEY (recipe_id, name)
);

CREATE TABLE recipe_meal_types (
    recipe_id    TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    meal_type_id TEXT NOT NULL REFERENCES meal_types(id),
    PRIMARY KEY (recipe_id, meal_type_id)
);

CREATE TABLE recipe_cooking_methods (
    recipe_id         TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    cooking_method_id TEXT NOT NULL REFERENCES cooking_methods(id),
    PRIMARY KEY (recipe_id, cooking_method_id)
);
CREATE INDEX idx_recipe_cooking_methods_method ON recipe_cooking_methods(cooking_method_id);

CREATE TABLE tags (                          -- free-form labels: healthy, nhanh, Tết...
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE recipe_tags (
    recipe_id TEXT    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id    INTEGER NOT NULL REFERENCES tags(id),
    PRIMARY KEY (recipe_id, tag_id)
);
CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);

-- Several images per recipe are allowed; is_primary marks the card image.
CREATE TABLE recipe_images (
    id           INTEGER PRIMARY KEY,
    recipe_id    TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    original_url TEXT,
    source_page  TEXT,
    license      TEXT,
    license_url  TEXT,
    author       TEXT,
    kind         TEXT NOT NULL CHECK (kind IN ('dish', 'ingredient', 'step')),
    is_primary   INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1))
);
CREATE INDEX idx_recipe_images_recipe ON recipe_images(recipe_id);

CREATE TABLE recipe_references (
    id        INTEGER PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    source    TEXT NOT NULL,
    url       TEXT NOT NULL
);

-- One row per ingredient line in a recipe.
-- is_key = in the JSON's key_ingredients (required, non-pantry, non-garnish);
-- the recommender matches the user's pantry against these.
CREATE TABLE recipe_ingredients (
    id            INTEGER PRIMARY KEY,
    recipe_id     TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
    position      INTEGER NOT NULL,
    amount        REAL,
    unit_id       TEXT REFERENCES units(id),
    group_id      TEXT REFERENCES ingredient_groups(id),
    optional      INTEGER NOT NULL DEFAULT 0 CHECK (optional IN (0, 1)),
    is_key        INTEGER NOT NULL DEFAULT 0 CHECK (is_key IN (0, 1)),
    note          TEXT,
    UNIQUE (recipe_id, ingredient_id)
);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- Substitutes for one ingredient line. ratio = amount of substitute per 1 unit
-- of the original; 0 means "use differently, see note".
CREATE TABLE ingredient_substitutes (
    id                   INTEGER PRIMARY KEY,
    recipe_ingredient_id INTEGER NOT NULL REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
    substitute_id        TEXT    NOT NULL REFERENCES ingredients(id),
    position             INTEGER NOT NULL,
    ratio                REAL    NOT NULL,
    note                 TEXT,
    UNIQUE (recipe_ingredient_id, substitute_id)
);
CREATE INDEX idx_ingredient_substitutes_sub ON ingredient_substitutes(substitute_id);

CREATE TABLE recipe_steps (
    id           INTEGER PRIMARY KEY,
    recipe_id    TEXT    NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    step_order   INTEGER NOT NULL,
    type_id      TEXT    NOT NULL REFERENCES step_types(id),
    duration_min INTEGER,
    title        TEXT,
    text         TEXT    NOT NULL,
    tip          TEXT,
    passive      INTEGER NOT NULL DEFAULT 0 CHECK (passive IN (0, 1)),  -- simmering, marinating...
    UNIQUE (recipe_id, step_order)
);

CREATE TABLE step_ingredients (
    step_id       INTEGER NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    ingredient_id TEXT    NOT NULL REFERENCES ingredients(id),
    PRIMARY KEY (step_id, ingredient_id)
);
CREATE INDEX idx_step_ingredients_ingredient ON step_ingredients(ingredient_id);

-- Per-serving nutrition, computed by build_db.py from recipe_ingredients and
-- ingredient_nutrition (optional lines are left out). coverage = share of the recipe's
-- ingredient lines that had nutrition data, so the app can flag rough numbers.
-- health_score 0-100 (see build_db.health_score); health_notes is a ';'-separated list of
-- codes (low_fat, high_protein, veg_rich, ...) that the app translates.
CREATE TABLE recipe_nutrition (
    recipe_id    TEXT PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
    kcal         REAL NOT NULL,
    protein_g    REAL NOT NULL,
    fat_g        REAL NOT NULL,
    carbs_g      REAL NOT NULL,
    fiber_g      REAL NOT NULL,
    veg_g        REAL NOT NULL,              -- vegetables, herbs, mushrooms, fruit
    coverage     REAL NOT NULL,
    health_score INTEGER NOT NULL,
    health_notes TEXT
);

-- ---------------------------------------------------------------------------
-- 3. User tables (filled by the app; empty after a catalog build)
-- ---------------------------------------------------------------------------

CREATE TABLE pantry_items (
    ingredient_id TEXT PRIMARY KEY REFERENCES ingredients(id) ON DELETE CASCADE,
    amount        REAL,
    unit_id       TEXT REFERENCES units(id),
    source        TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'photo', 'fridge_scan', 'receipt', 'barcode', 'cloud_scan')),
    confidence    REAL,                      -- detector score, NULL when added by hand
    added_at      TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at    TEXT
);

-- Feeds the "always recommend something new" option.
-- 'shown' and 'cooked' are kept apart so scrolling past a dish does not use it up.
CREATE TABLE meal_history (
    id        INTEGER PRIMARY KEY,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    event     TEXT NOT NULL CHECK (event IN ('shown', 'cooked', 'skipped', 'favorite')),
    at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_meal_history_recipe_at ON meal_history(recipe_id, at);

CREATE TABLE user_settings (                 -- e.g. no_repeat_days=7, cloud_scan_enabled=0
    key   TEXT PRIMARY KEY,
    value TEXT
);
INSERT INTO user_settings (key, value) VALUES
    ('cloud_scan_enabled', '0'),
    ('no_repeat_enabled',  '0'),
    ('no_repeat_days',     '7');

CREATE TABLE user_preferred_cuisines (
    cuisine_id TEXT PRIMARY KEY REFERENCES cuisines(id) ON DELETE CASCADE
);

-- Meal plan: one row per dish planned for a day and meal.
CREATE TABLE meal_plan (
    id        INTEGER PRIMARY KEY,
    plan_date TEXT NOT NULL,                 -- YYYY-MM-DD
    meal_type_id TEXT NOT NULL REFERENCES meal_types(id),
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    servings  REAL NOT NULL DEFAULT 1,       -- portions this person eats
    with_rice INTEGER NOT NULL DEFAULT 0 CHECK (with_rice IN (0, 1))
);
CREATE INDEX idx_meal_plan_date ON meal_plan(plan_date);

-- ---------------------------------------------------------------------------
-- 4. Views
-- ---------------------------------------------------------------------------

-- Replaces the JSON's used_in / can_substitute_in lists (derived, so never out of sync).
CREATE VIEW v_ingredient_usage AS
SELECT ri.ingredient_id, ri.recipe_id, 'ingredient' AS role
FROM recipe_ingredients ri
UNION
SELECT s.substitute_id, ri.recipe_id, 'substitute'
FROM ingredient_substitutes s
JOIN recipe_ingredients ri ON ri.id = s.recipe_ingredient_id;

-- One row per recipe with what a list screen needs.
CREATE VIEW v_recipe_cards AS
SELECT r.id, r.name_vi, r.name_en, r.cuisine_id, r.region_id, r.dish_type_id,
       r.main_protein_id, r.difficulty, r.servings, r.total_min,
       img.url AS image_url, img.kind AS image_kind,
       (SELECT COUNT(*) FROM recipe_ingredients k WHERE k.recipe_id = r.id AND k.is_key = 1) AS key_count,
       (SELECT group_concat(t.name, ', ') FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
         WHERE rt.recipe_id = r.id) AS tags
FROM recipes r
LEFT JOIN recipe_images img ON img.recipe_id = r.id AND img.is_primary = 1;

-- Key ingredients per recipe, matched against the pantry.
-- have = 'yes' (in pantry), 'substitute' (a listed substitute is in pantry) or 'no'.
CREATE VIEW v_recipe_key_match AS
SELECT ri.recipe_id, ri.ingredient_id,
       CASE
         WHEN EXISTS (SELECT 1 FROM pantry_items p WHERE p.ingredient_id = ri.ingredient_id) THEN 'yes'
         WHEN EXISTS (SELECT 1 FROM ingredient_substitutes s
                      JOIN pantry_items p ON p.ingredient_id = s.substitute_id
                      WHERE s.recipe_ingredient_id = ri.id) THEN 'substitute'
         ELSE 'no'
       END AS have
FROM recipe_ingredients ri
WHERE ri.is_key = 1;

-- Pantry score per recipe; sort by match_ratio DESC, missing_count ASC.
CREATE VIEW v_recipe_pantry_score AS
SELECT recipe_id,
       COUNT(*)                                     AS key_count,
       SUM(have = 'yes')                            AS have_count,
       SUM(have = 'substitute')                     AS substitute_count,
       SUM(have = 'no')                             AS missing_count,
       ROUND((SUM(have = 'yes') + 0.7 * SUM(have = 'substitute')) * 1.0 / COUNT(*), 3) AS match_ratio,
       group_concat(CASE WHEN have = 'no' THEN ingredient_id END, ',') AS missing
FROM v_recipe_key_match
GROUP BY recipe_id;

-- Last time each recipe was cooked (for the no-repeat window).
CREATE VIEW v_recipe_last_cooked AS
SELECT recipe_id, MAX(at) AS last_cooked_at
FROM meal_history
WHERE event = 'cooked'
GROUP BY recipe_id;
