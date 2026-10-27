"""Build the AutoRecipt SQLite database from recipt.json and the data/ folder:
data/lookups.json, data/ingredients/*.json, data/recipes/*.json, data/nutrition.json.

Usage:
    python db/build_db.py                      # -> db/autorecipt.db
    python db/build_db.py --root other/copy --out other.db

Ingredient and recipe files are read in name order. An entry with name_vi adds a new
ingredient / recipe; an entry without name_vi patches an existing one (ingredients:
commonness, category, pantry_staple, extra aliases; recipes: RECIPE_PATCH_FIELDS).

The output file is rebuilt from scratch every run. Uses only the Python standard library.
"""

import argparse
import json
import sqlite3
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# Lookup tables filled from plain codes in the recipes / ingredients.
LOOKUP_TABLES = [
    "ingredient_categories", "ingredient_groups", "cuisines", "regions",
    "dish_types", "proteins", "meal_types", "cooking_methods", "step_types",
]
# Every table data/lookups.json may fill (difficulty_levels has integer ids, 1-5).
LOOKUP_FILE_TABLES = LOOKUP_TABLES + ["difficulty_levels"]


class BuildError(Exception):
    """The data cannot be built; the message lists what to fix."""


def load_lookups(conn, lookups):
    """Insert data/lookups.json rows. Column names come from the rows themselves."""
    for table, rows in lookups.items():
        if table.startswith("_"):
            continue
        if table not in LOOKUP_FILE_TABLES:
            raise BuildError(f"lookups.json: unknown table '{table}'")
        for row in rows:
            cols = list(row)
            conn.execute(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                         [row[c] for c in cols])


def merge_ingredients(base, ingredient_dir):
    """Combine recipt.json's ingredients with the files in ingredient_dir."""
    catalog = {iid: dict(ing) for iid, ing in base.items()}
    errors = []
    for path in sorted(Path(ingredient_dir).glob("*.json")):
        for entry in json.loads(path.read_text(encoding="utf-8")):
            iid = entry["id"]
            where = f"{path.name}: {iid}"
            if "name_vi" in entry:
                if iid in catalog:
                    errors.append(f"{where} is defined twice")
                    continue
                missing = [k for k in ("name_en", "category") if k not in entry]
                if missing:
                    errors.append(f"{where} is missing {', '.join(missing)}")
                    continue
                catalog[iid] = {k: v for k, v in entry.items() if k != "id"}
            elif iid not in catalog:
                errors.append(f"{where} patches an ingredient that does not exist")
            else:
                ing = catalog[iid]
                for k in ("commonness", "category", "pantry_staple"):
                    if k in entry:
                        ing[k] = entry[k]
                aliases = ing.setdefault("aliases", [])
                aliases += [a for a in entry.get("aliases", []) if a not in aliases]
    if errors:
        raise BuildError("Ingredient file errors:\n  " + "\n  ".join(errors))
    return catalog


RECIPE_PATCH_FIELDS = ("difficulty", "tags", "meal_types", "notes", "image")


def merge_recipes(base, recipe_dir):
    """recipt.json's recipes plus data/recipes/*.json (same rules as merge_ingredients:
    an entry with name_vi adds a recipe, one without patches RECIPE_PATCH_FIELDS)."""
    recipes = [dict(r) for r in base]
    by_id = {r["id"]: r for r in recipes}
    errors = []
    for path in sorted(Path(recipe_dir).glob("*.json")):
        for entry in json.loads(path.read_text(encoding="utf-8")):
            rid = entry["id"]
            where = f"{path.name}: {rid}"
            if "name_vi" in entry:
                if rid in by_id:
                    errors.append(f"{where} is defined twice")
                    continue
                recipes.append(entry)
                by_id[rid] = entry
            elif rid not in by_id:
                errors.append(f"{where} patches a recipe that does not exist")
            else:
                unknown = set(entry) - {"id", *RECIPE_PATCH_FIELDS}
                if unknown:
                    errors.append(f"{where} cannot patch {', '.join(sorted(unknown))}")
                by_id[rid].update({k: v for k, v in entry.items() if k in RECIPE_PATCH_FIELDS})
    for r in recipes:
        if not isinstance(r.get("difficulty"), int) or not 1 <= r["difficulty"] <= 5:
            errors.append(f"{r['id']}: difficulty must be 1-5 stars, got {r.get('difficulty')!r}")
    if errors:
        raise BuildError("Recipe file errors:\n  " + "\n  ".join(errors))
    return recipes


def lower(text):
    """Lowercase with accents kept, in NFC so typed and stored text compare equal."""
    return " ".join(unicodedata.normalize("NFC", text).lower().split())


def normalize(text):
    """Lowercase, strip Vietnamese diacritics and extra spaces: 'Thịt Ba Chỉ' -> 'thit ba chi'."""
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return " ".join(text.lower().split())


def health_score(per, methods, tags):
    """0-100 score for one serving, plus note codes explaining it (the app translates them:
    low_fat, high_fat, high_protein, veg_rich, fiber_rich, high_kcal, deep_fried)."""
    score, notes = 50, []
    kcal = per["kcal"] or 1
    fat_share = per["fat"] * 9 / kcal
    protein_share = per["protein"] * 4 / kcal
    # Share of energy alone would punish light dishes (a 95 kcal stir-fry is mostly oil
    # calories), so grams of fat decide too.
    if fat_share <= 0.30 or per["fat"] <= 10:
        score += 15
        notes.append("low_fat")
    elif fat_share > 0.45 and per["fat"] > 15:
        score -= 15
        notes.append("high_fat")
    if protein_share >= 0.20:
        score += 10
        notes.append("high_protein")
    if per["veg"] >= 150:
        score += 15
        notes.append("veg_rich")
    elif per["veg"] >= 80:
        score += 8
    if per["fiber"] >= 4:
        score += 5
        notes.append("fiber_rich")
    if per["kcal"] > 800:
        score -= 10
        notes.append("high_kcal")
    elif per["kcal"] < 650:
        score += 5
    if "fry" in methods:
        score -= 15
        notes.append("deep_fried")
    elif methods & {"steam", "boil", "toss"}:
        score += 5
    if "healthy" in tags:
        score += 5
    return max(0, min(100, score)), notes


class Builder:
    def __init__(self, conn):
        self.conn = conn
        self.warnings = []
        self.known = {
            t: {row[0] for row in conn.execute(f"SELECT id FROM {t}")} for t in LOOKUP_TABLES
        }

    def code(self, table, value):
        """Return value as a lookup code, adding an unlabelled row if it is new."""
        if value is None:
            return None
        if value not in self.known[table]:
            self.conn.execute(f"INSERT INTO {table} (id) VALUES (?)", (value,))
            self.known[table].add(value)
            self.warnings.append(f"{table}: added '{value}' without labels (add it to data/lookups.json)")
        return value

    def tag_id(self, name):
        self.conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (name,))
        return self.conn.execute("SELECT id FROM tags WHERE name = ?", (name,)).fetchone()[0]

    def load_meta(self, data):
        rows = [(k, data[k]) for k in ("schema_version", "generated_at", "language", "description")]
        rows.append(("built_at", datetime.now(timezone.utc).isoformat(timespec="seconds")))
        rows.append(("field_notes", json.dumps(data.get("field_notes", {}), ensure_ascii=False)))
        self.conn.executemany("INSERT INTO meta (key, value) VALUES (?, ?)", rows)

    def load_units(self, units):
        self.conn.executemany(
            "INSERT INTO units (id, name_vi, name_en, type, ml) VALUES (?, ?, ?, ?, ?)",
            [(uid, u["vi"], u["en"], u["type"], u.get("ml")) for uid, u in units.items()],
        )

    def load_ingredients(self, ingredients):
        seen_names = {}
        for iid, ing in ingredients.items():
            if "commonness" not in ing:
                self.warnings.append(f"ingredient {iid}: no commonness, using default 2")
            name_norm = ing["name_vi"].lower()  # keep accents: "gân bò" and "gan bò" differ
            if name_norm in seen_names:
                self.warnings.append(f"ingredient {iid}: same name_vi as {seen_names[name_norm]}")
            seen_names[name_norm] = iid
            self.conn.execute(
                "INSERT INTO ingredients (id, name_vi, name_en, category_id, pantry_staple, "
                "commonness) VALUES (?, ?, ?, ?, ?, ?)",
                (iid, ing["name_vi"], ing["name_en"],
                 self.code("ingredient_categories", ing["category"]),
                 int(ing.get("pantry_staple", False)), ing.get("commonness", 2)),
            )
            terms = [(ing["name_vi"], "name_vi"), (ing["name_en"], "name_en")]
            terms += [(a, "alias") for a in ing.get("aliases", [])]
            self.conn.executemany(
                "INSERT OR IGNORE INTO ingredient_aliases (ingredient_id, term, term_lower, "
                "term_norm, kind) VALUES (?, ?, ?, ?, ?)",
                [(iid, term, lower(term), normalize(term), kind) for term, kind in terms],
            )
        # used_in / can_substitute_in are not stored: see view v_ingredient_usage.

    def load_recipe(self, r):
        c = self.conn
        t = r.get("time") or {}
        c.execute(
            "INSERT INTO recipes (id, name_vi, name_en, description, cuisine_id, region_id, "
            "dish_type_id, main_protein_id, difficulty, servings, prep_min, cook_min, total_min, "
            "active_min, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (r["id"], r["name_vi"], r.get("name_en"), r.get("description"),
             self.code("cuisines", r["cuisine"]), self.code("regions", r.get("region")),
             self.code("dish_types", r.get("dish_type")),
             self.code("proteins", r.get("main_protein")),
             r.get("difficulty"), r.get("servings"), t.get("prep_min"), t.get("cook_min"),
             t.get("total_min"), t.get("active_min"), r.get("notes")),
        )
        rid = r["id"]

        c.executemany("INSERT INTO recipe_other_names (recipe_id, name) VALUES (?, ?)",
                      [(rid, n) for n in r.get("other_names", [])])
        c.executemany("INSERT INTO recipe_meal_types (recipe_id, meal_type_id) VALUES (?, ?)",
                      [(rid, self.code("meal_types", m)) for m in r.get("meal_types", [])])
        c.executemany(
            "INSERT INTO recipe_cooking_methods (recipe_id, cooking_method_id) VALUES (?, ?)",
            [(rid, self.code("cooking_methods", m)) for m in r.get("cooking_methods", [])])
        c.executemany("INSERT OR IGNORE INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)",
                      [(rid, self.tag_id(tag)) for tag in r.get("tags", [])])

        img = r.get("image")
        if img:
            c.execute(
                "INSERT INTO recipe_images (recipe_id, url, original_url, source_page, license, "
                "license_url, author, kind, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
                (rid, img["url"], img.get("original_url"), img.get("source_page"),
                 img.get("license"), img.get("license_url"), img.get("author"), img["kind"]),
            )

        c.executemany(
            "INSERT INTO recipe_references (recipe_id, position, source, url) VALUES (?, ?, ?, ?)",
            [(rid, i, ref["source"], ref["url"]) for i, ref in enumerate(r.get("references", []), 1)])

        key = set(r.get("key_ingredients", []))
        line_ids = set()
        for pos, line in enumerate(r["ingredients"], 1):
            cur = c.execute(
                "INSERT INTO recipe_ingredients (recipe_id, ingredient_id, position, amount, "
                "unit_id, group_id, optional, is_key, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (rid, line["ingredient_id"], pos, line.get("amount"), line.get("unit"),
                 self.code("ingredient_groups", line.get("group")), int(line.get("optional", False)),
                 int(line["ingredient_id"] in key), line.get("note")),
            )
            line_ids.add(line["ingredient_id"])
            c.executemany(
                "INSERT INTO ingredient_substitutes (recipe_ingredient_id, substitute_id, position, "
                "ratio, note) VALUES (?, ?, ?, ?, ?)",
                [(cur.lastrowid, s["ingredient_id"], i, s["ratio"], s.get("note"))
                 for i, s in enumerate(line.get("substitutes", []), 1)],
            )
        for k in key - line_ids:
            self.warnings.append(f"{rid}: key ingredient '{k}' is not in its ingredient list")

        for step in r.get("steps", []):
            cur = c.execute(
                "INSERT INTO recipe_steps (recipe_id, step_order, type_id, duration_min, title, "
                "text, tip, passive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (rid, step["order"], self.code("step_types", step["type"]),
                 step.get("duration_min"), step.get("title"), step["text"], step.get("tip"),
                 int(step.get("passive", False))),
            )
            used = step.get("ingredients_used", [])
            for u in used:
                if u not in line_ids:
                    self.warnings.append(f"{rid} step {step['order']}: '{u}' is not in the recipe")
            c.executemany("INSERT OR IGNORE INTO step_ingredients (step_id, ingredient_id) VALUES (?, ?)",
                          [(cur.lastrowid, u) for u in used])

    def load_nutrition(self, nutrition):
        for iid, n in nutrition["ingredients"].items():
            self.conn.execute(
                "INSERT INTO ingredient_nutrition (ingredient_id, kcal, protein_g, fat_g, carbs_g, "
                "fiber_g, density_g_per_ml, edible_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (iid, n["kcal"], n["protein"], n["fat"], n["carbs"], n.get("fiber", 0),
                 n.get("density", 1), n.get("edible", 1)),
            )
            self.conn.executemany(
                "INSERT INTO ingredient_unit_weights (ingredient_id, unit_id, grams) VALUES (?, ?, ?)",
                [(iid, unit, grams) for unit, grams in n.get("units", {}).items()],
            )

    def compute_recipe_nutrition(self, frying_oil):
        """Per-serving nutrition and health score for every recipe."""
        c = self.conn
        nut = {row[0]: row[1:] for row in c.execute(
            "SELECT ingredient_id, kcal, protein_g, fat_g, carbs_g, fiber_g, density_g_per_ml, "
            "edible_ratio FROM ingredient_nutrition")}
        unit_g = {(i, u): g for i, u, g in c.execute(
            "SELECT ingredient_id, unit_id, grams FROM ingredient_unit_weights")}
        units = {u: (t, ml) for u, t, ml in c.execute("SELECT id, type, ml FROM units")}
        veg_categories = {"vegetable", "herb", "mushroom", "fruit"}
        category = dict(c.execute("SELECT id, category_id FROM ingredients"))

        for rid, servings in c.execute("SELECT id, servings FROM recipes").fetchall():
            methods = {m for (m,) in c.execute(
                "SELECT cooking_method_id FROM recipe_cooking_methods WHERE recipe_id = ?", (rid,))}
            tags = {t for (t,) in c.execute(
                "SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id "
                "WHERE rt.recipe_id = ?", (rid,))}
            lines = c.execute(
                "SELECT ingredient_id, amount, unit_id FROM recipe_ingredients "
                "WHERE recipe_id = ? AND optional = 0", (rid,)).fetchall()
            total = dict(kcal=0.0, protein=0.0, fat=0.0, carbs=0.0, fiber=0.0, veg=0.0)
            known = 0
            for iid, amount, unit in lines:
                n = nut.get(iid)
                if n is None:
                    self.warnings.append(f"{rid}: no nutrition for '{iid}'")
                    continue
                kcal, protein, fat, carbs, fiber, density, edible = n
                utype, ml = units[unit]
                if unit == "g":
                    grams = amount
                elif unit == "kg":
                    grams = amount * 1000
                elif utype == "volume":
                    grams = amount * (ml or 1) * density
                elif (iid, unit) in unit_g:
                    grams = amount * unit_g[(iid, unit)]
                else:
                    self.warnings.append(f"{rid}: no gram weight for 1 {unit} of '{iid}'")
                    continue
                known += 1
                volume_ml = amount * (ml or 1) if utype == "volume" else 0
                if iid == "cooking_oil" and volume_ml >= frying_oil["min_ml"]:
                    edible = frying_oil["absorbed"]  # deep-frying: only part soaks in
                eaten = grams * edible / 100
                total["kcal"] += kcal * eaten
                total["protein"] += protein * eaten
                total["fat"] += fat * eaten
                total["carbs"] += carbs * eaten
                total["fiber"] += fiber * eaten
                if category[iid] in veg_categories:
                    total["veg"] += grams * edible
            per = {k: v / (servings or 1) for k, v in total.items()}
            score, notes = health_score(per, methods, tags)
            c.execute(
                "INSERT INTO recipe_nutrition (recipe_id, kcal, protein_g, fat_g, carbs_g, fiber_g, "
                "veg_g, coverage, health_score, health_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (rid, round(per["kcal"]), round(per["protein"], 1), round(per["fat"], 1),
                 round(per["carbs"], 1), round(per["fiber"], 1), round(per["veg"]),
                 round(known / len(lines), 2) if lines else 0, score, ";".join(notes)),
            )

    def check_derived_lists(self, ingredients):
        """The JSON's used_in / can_substitute_in must not name recipes that don't use the
        ingredient. (Recipes from data/recipes add uses the JSON lists don't know about.)"""
        for role, field in (("ingredient", "used_in"), ("substitute", "can_substitute_in")):
            for iid, ing in ingredients.items():
                if field not in ing:  # added from data/ingredients, no list to compare
                    continue
                got = {row[0] for row in self.conn.execute(
                    "SELECT recipe_id FROM v_ingredient_usage WHERE ingredient_id = ? AND role = ?",
                    (iid, role))}
                stale = set(ing.get(field, [])) - got
                if stale:
                    self.warnings.append(f"ingredient {iid}: {field} lists {sorted(stale)} but they don't use it")


def build(out_path, root=ROOT):
    """Build the database from the data under root (recipt.json + data/). Returns warnings;
    raises BuildError when the data is invalid (out_path is then left incomplete)."""
    root = Path(root)

    def read(rel):
        return json.loads((root / rel).read_text(encoding="utf-8"))

    data = read("recipt.json")
    ingredients = merge_ingredients(data["ingredients"], root / "data" / "ingredients")
    recipes = merge_recipes(data["recipes"], root / "data" / "recipes")
    nutrition = read("data/nutrition.json")
    lookups = read("data/lookups.json")
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        out_path.unlink()

    conn = sqlite3.connect(out_path)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript((HERE / "schema.sql").read_text(encoding="utf-8"))
        with conn:
            load_lookups(conn, lookups)

        b = Builder(conn)
        with conn:
            b.load_meta(data)
            b.load_units(data["units"])
            b.load_ingredients(ingredients)
            for recipe in recipes:
                b.load_recipe(recipe)
            b.load_nutrition(nutrition)
            b.compute_recipe_nutrition(nutrition["frying_oil"])
        conn.executescript((HERE / "refresh_stats.sql").read_text(encoding="utf-8"))
        b.check_derived_lists(ingredients)

        broken = conn.execute("PRAGMA foreign_key_check").fetchall()
        if broken:
            raise BuildError(f"Foreign key errors: {broken[:10]}")

        conn.execute("VACUUM")
    finally:
        conn.close()
    return b.warnings


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--root", default=ROOT, help="folder holding recipt.json and data/")
    p.add_argument("--out", default=HERE / "autorecipt.db")
    args = p.parse_args()

    try:
        warnings = build(args.out, args.root)
    except BuildError as e:
        raise SystemExit(str(e))

    conn = sqlite3.connect(args.out)
    tables = [row[0] for row in conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")]
    print(f"Built {args.out}")
    for t in tables:
        print(f"  {t:<26} {conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]:>6}")
    conn.close()
    for w in warnings:
        print("WARNING:", w)


if __name__ == "__main__":
    main()
