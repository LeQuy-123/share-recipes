"""AutoRecipt admin server: edit ingredients, recipes and lookups, then publish to the app.

    python admin/server.py            # http://127.0.0.1:8787  (serves admin/ui/dist + /api)
    python admin/server.py --root COPY --port 8788   # work on a copy of the data

The JSON files (recipt.json, data/) stay the source of truth. Every save:
  1. applies the change to an in-memory copy of all data files,
  2. writes that copy to a temp folder and runs build_db.build() on it,
  3. only if the build succeeds: backs up and rewrites the changed files, then publishes the
     new database to db/autorecipt.db and app/public/autorecipt.db (+ db-version.json).
A failed build changes nothing. Binds to 127.0.0.1 only: there is no login.
"""

import copy
import json
import mimetypes
import shutil
import sqlite3
import sys
import tempfile
import threading
import urllib.parse
import urllib.request
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "db"))
import build_db  # noqa: E402

DIST = ROOT / "admin" / "ui" / "dist"
# Relative to the workspace root (tests run the workspace on a copy of the data).
BACKUPS = ".admin-backups"
PUBLISH_TO = ["db/autorecipt.db", "app/public/autorecipt.db"]
NEW_INGREDIENT_FILE = "data/ingredients/90_added.json"
NEW_RECIPE_FILE = "data/recipes/90_added.json"
INGREDIENT_FIELDS = ("name_vi", "name_en", "category", "commonness", "pantry_staple", "aliases")
UA = {"User-Agent": "AutoReciptAdmin/0.1 (local recipe admin)"}


class ApiError(Exception):
    def __init__(self, status, message, details=None):
        super().__init__(message)
        self.status, self.message, self.details = status, message, details


# ---------------------------------------------------------------------------
# File formats: keep each file in the style it was written in, so diffs stay small.
# ---------------------------------------------------------------------------

def _line_list(items):
    return "[\n" + ",\n".join(json.dumps(e, ensure_ascii=False) for e in items) + "\n]\n"


def _nutrition(d):
    rows = ",\n".join(f"    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in d["ingredients"].items())
    head = "".join(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},\n" for k, v in d.items() if k != "ingredients")
    return "{\n" + head + '  "ingredients": {\n' + rows + "\n  }\n}\n"


def _lookups(d):
    parts = []
    for k, v in d.items():
        if isinstance(v, list):
            rows = ",\n".join("    " + json.dumps(r, ensure_ascii=False) for r in v)
            parts.append(f'  "{k}": [\n{rows}\n  ]')
        else:
            parts.append(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}")
    return "{\n" + ",\n".join(parts) + "\n}\n"


def serialize(rel, obj):
    if rel == "data/nutrition.json":
        return _nutrition(obj)
    if rel == "data/lookups.json":
        return _lookups(obj)
    if rel.startswith("data/ingredients/"):
        return _line_list(obj)
    if rel.startswith("data/recipes/"):
        return json.dumps(obj, ensure_ascii=False, indent=1) + "\n"
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


# ---------------------------------------------------------------------------
# Workspace: all data files in memory, merged views, transactional saves.
# ---------------------------------------------------------------------------

class Workspace:
    def __init__(self, root):
        self.root = Path(root)
        self.lock = threading.Lock()
        self.files = self._read_all()
        self.warnings = []
        self.built_at = None
        with self.lock:
            self._commit(copy.deepcopy(self.files), publish=True)

    def _read_all(self):
        rels = ["recipt.json", "data/lookups.json", "data/nutrition.json"]
        for folder in ("data/ingredients", "data/recipes"):
            rels += sorted(f"{folder}/{p.name}" for p in (self.root / folder).glob("*.json"))
        return {rel: json.loads((self.root / rel).read_text(encoding="utf-8")) for rel in rels}

    # -- merged views -------------------------------------------------------

    @staticmethod
    def _list_files(files, folder):
        return [rel for rel in sorted(files) if rel.startswith(folder + "/")]

    def ingredients(self, files=None):
        """id -> merged ingredient (patches applied) with '_home' = file defining it."""
        files = files or self.files
        out = {iid: {**{k: v for k, v in ing.items() if k in INGREDIENT_FIELDS}, "_home": "recipt.json"}
               for iid, ing in files["recipt.json"]["ingredients"].items()}
        for rel in self._list_files(files, "data/ingredients"):
            for e in files[rel]:
                if "name_vi" in e:
                    out[e["id"]] = {**{k: v for k, v in e.items() if k in INGREDIENT_FIELDS}, "_home": rel}
        for rel in self._list_files(files, "data/ingredients"):
            for e in files[rel]:
                if "name_vi" not in e and e["id"] in out:
                    ing = out[e["id"]]
                    for k in ("commonness", "category", "pantry_staple"):
                        if k in e:
                            ing[k] = e[k]
                    ing["aliases"] = ing.get("aliases", []) + [a for a in e.get("aliases", []) if a not in ing.get("aliases", [])]
        return out

    def recipes(self, files=None):
        files = files or self.files
        out = {r["id"]: {**r, "_home": "recipt.json"} for r in files["recipt.json"]["recipes"]}
        for rel in self._list_files(files, "data/recipes"):
            for e in files[rel]:
                if "name_vi" in e:
                    out[e["id"]] = {**e, "_home": rel}
        for rel in self._list_files(files, "data/recipes"):
            for e in files[rel]:
                if "name_vi" not in e and e["id"] in out:
                    out[e["id"]].update({k: v for k, v in e.items() if k in build_db.RECIPE_PATCH_FIELDS})
        return out

    def usage(self, files=None):
        """ingredient id -> {recipe id: role} over all recipes."""
        use = {}
        for r in self.recipes(files).values():
            for line in r.get("ingredients", []):
                use.setdefault(line["ingredient_id"], {})[r["id"]] = "ingredient"
                for s in line.get("substitutes", []):
                    use.setdefault(s["ingredient_id"], {}).setdefault(r["id"], "substitute")
        return use

    # -- commit -----------------------------------------------------------

    def _commit(self, new_files, publish=True):
        """Build new_files in a temp folder; on success write changed files and publish."""
        with tempfile.TemporaryDirectory(prefix="autorecipt-") as tmp:
            tmp = Path(tmp)
            for rel, obj in new_files.items():
                (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
                (tmp / rel).write_text(serialize(rel, obj), encoding="utf-8")
            db_path = tmp / "autorecipt.db"
            try:
                warnings = build_db.build(db_path, tmp)
            except build_db.BuildError as e:
                raise ApiError(400, "Dữ liệu không hợp lệ, chưa lưu.", str(e))
            changed = [rel for rel in new_files
                       if rel not in self.files or serialize(rel, new_files[rel]) != serialize(rel, self.files[rel])]
            removed = [rel for rel in self.files if rel not in new_files]
            if changed or removed:
                stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
                for rel in changed + removed:
                    src = self.root / rel
                    if src.exists():
                        dest = self.root / BACKUPS / stamp / rel
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dest)
                for rel in changed:
                    (self.root / rel).parent.mkdir(parents=True, exist_ok=True)
                    (self.root / rel).write_text(serialize(rel, new_files[rel]), encoding="utf-8")
                for rel in removed:
                    (self.root / rel).unlink(missing_ok=True)
            if publish:
                self._publish(db_path)
        self.files = new_files
        self.warnings = warnings
        return changed

    def _publish(self, db_path):
        conn = sqlite3.connect(db_path)
        built_at = conn.execute("SELECT value FROM meta WHERE key = 'built_at'").fetchone()[0]
        counts = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("recipes", "ingredients")}
        conn.close()
        for rel in PUBLISH_TO:
            dest = self.root / rel
            if dest.parent.exists():
                shutil.copy2(db_path, dest)
        version = self.root / "app" / "public" / "db-version.json"
        if version.parent.exists():
            version.write_text(json.dumps({"built_at": built_at, **counts}) + "\n", encoding="utf-8")
        self.built_at = built_at

    def db(self):
        conn = sqlite3.connect(self.root / PUBLISH_TO[0])
        conn.row_factory = sqlite3.Row
        return conn

    # -- ingredients ------------------------------------------------------

    def save_ingredient(self, iid, body, create):
        iid = (iid or "").strip()
        if not iid or not all(c.isalnum() or c == "_" for c in iid) or iid.lower() != iid:
            raise ApiError(400, "ID chỉ gồm chữ thường không dấu, số và dấu gạch dưới (vd: pork_belly).")
        with self.lock:
            files = copy.deepcopy(self.files)
            current = self.ingredients(files)
            if create and iid in current:
                raise ApiError(409, f"Đã có nguyên liệu '{iid}'.")
            if not create and iid not in current:
                raise ApiError(404, f"Không có nguyên liệu '{iid}'.")
            fields = {
                "name_vi": str(body.get("name_vi", "")).strip(),
                "name_en": str(body.get("name_en", "")).strip(),
                "category": body.get("category"),
                "commonness": int(body.get("commonness") or 2),
                "pantry_staple": bool(body.get("pantry_staple")),
                "aliases": [a.strip() for a in body.get("aliases", []) if a and a.strip()],
            }
            if not fields["name_vi"] or not fields["name_en"] or not fields["category"]:
                raise ApiError(400, "Cần tên tiếng Việt, tên tiếng Anh và nhóm.")
            if not 1 <= fields["commonness"] <= 5:
                raise ApiError(400, "Độ phổ biến phải từ 1 đến 5.")
            home = current[iid]["_home"] if iid in current else NEW_INGREDIENT_FILE
            self._drop_patches(files, "data/ingredients", iid)
            if home == "recipt.json":
                files["recipt.json"]["ingredients"][iid] = fields  # used_in lists are derived; dropped
            else:
                entries = files.setdefault(home, [])
                entry = {"id": iid, **fields}
                idx = next((i for i, e in enumerate(entries) if e["id"] == iid), None)
                if idx is None:
                    entries.append(entry)
                else:
                    entries[idx] = entry
            if "nutrition" in body:
                nut = files["data/nutrition.json"]["ingredients"]
                if body["nutrition"]:
                    nut[iid] = clean_nutrition(body["nutrition"])
                else:
                    nut.pop(iid, None)
            self._commit(files)
        return iid

    def delete_ingredient(self, iid):
        with self.lock:
            files = copy.deepcopy(self.files)
            current = self.ingredients(files)
            if iid not in current:
                raise ApiError(404, f"Không có nguyên liệu '{iid}'.")
            used = self.usage(files).get(iid)
            if used:
                raise ApiError(409, "Nguyên liệu đang được dùng trong công thức, hãy bỏ khỏi công thức trước.",
                               sorted(used))
            home = current[iid]["_home"]
            if home == "recipt.json":
                del files["recipt.json"]["ingredients"][iid]
            else:
                files[home] = [e for e in files[home] if e["id"] != iid]
            self._drop_patches(files, "data/ingredients", iid)
            files["data/nutrition.json"]["ingredients"].pop(iid, None)
            self._commit(files)

    # -- recipes ----------------------------------------------------------

    def save_recipe(self, rid, body, create):
        rid = (rid or "").strip()
        if not rid or not all(c.isalnum() or c == "-" for c in rid) or rid.lower() != rid:
            raise ApiError(400, "ID chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd: canh-chua-ca-loc).")
        with self.lock:
            files = copy.deepcopy(self.files)
            current = self.recipes(files)
            if create and rid in current:
                raise ApiError(409, f"Đã có công thức '{rid}'.")
            if not create and rid not in current:
                raise ApiError(404, f"Không có công thức '{rid}'.")
            recipe = clean_recipe(rid, body, self.ingredients(files))
            home = current[rid]["_home"] if rid in current else NEW_RECIPE_FILE
            self._drop_patches(files, "data/recipes", rid)
            target = files["recipt.json"]["recipes"] if home == "recipt.json" else files.setdefault(home, [])
            idx = next((i for i, e in enumerate(target) if e["id"] == rid), None)
            if idx is None:
                target.append(recipe)
            else:
                target[idx] = recipe
            self._commit(files)
        return rid

    def delete_recipe(self, rid):
        with self.lock:
            files = copy.deepcopy(self.files)
            current = self.recipes(files)
            if rid not in current:
                raise ApiError(404, f"Không có công thức '{rid}'.")
            home = current[rid]["_home"]
            if home == "recipt.json":
                files["recipt.json"]["recipes"] = [r for r in files["recipt.json"]["recipes"] if r["id"] != rid]
            else:
                files[home] = [e for e in files[home] if e["id"] != rid]
            self._drop_patches(files, "data/recipes", rid)
            self._commit(files)

    @staticmethod
    def _drop_patches(files, folder, eid):
        """Fold-in happens by saving the merged entity; remove patch entries for it."""
        for rel in [r for r in files if r.startswith(folder + "/")]:
            files[rel] = [e for e in files[rel] if not (e["id"] == eid and "name_vi" not in e)]

    # -- lookups & units --------------------------------------------------

    def used_codes(self, files):
        used = {t: set() for t in build_db.LOOKUP_FILE_TABLES}
        for r in self.recipes(files).values():
            used["cuisines"].add(r.get("cuisine"))
            used["regions"].add(r.get("region"))
            used["dish_types"].add(r.get("dish_type"))
            used["proteins"].add(r.get("main_protein"))
            used["difficulty_levels"].add(r.get("difficulty"))
            used["meal_types"].update(r.get("meal_types", []))
            used["cooking_methods"].update(r.get("cooking_methods", []))
            used["ingredient_groups"].update(l.get("group") for l in r.get("ingredients", []))
            used["step_types"].update(s.get("type") for s in r.get("steps", []))
        for ing in self.ingredients(files).values():
            used["ingredient_categories"].add(ing.get("category"))
        for t in used:
            used[t].discard(None)
        return used

    def save_lookup(self, table, rows):
        if table not in build_db.LOOKUP_FILE_TABLES:
            raise ApiError(404, f"Không có bảng '{table}'.")
        ids = [r.get("id") for r in rows]
        if any(i in (None, "") for i in ids) or len(set(ids)) != len(ids):
            raise ApiError(400, "Mỗi dòng cần một ID riêng, không trùng.")
        with self.lock:
            files = copy.deepcopy(self.files)
            in_use = self.used_codes(files)[table] - set(ids)
            if in_use:
                raise ApiError(409, "Không thể xoá mã đang được dùng.", sorted(map(str, in_use)))
            files["data/lookups.json"][table] = rows
            self._commit(files)

    def save_units(self, units):
        with self.lock:
            files = copy.deepcopy(self.files)
            used = {l.get("unit") for r in self.recipes(files).values() for l in r.get("ingredients", [])}
            missing = used - set(units)
            if missing:
                raise ApiError(409, "Không thể xoá đơn vị đang được dùng.", sorted(missing))
            for uid, u in units.items():
                if u.get("type") not in ("weight", "volume", "count") or not u.get("vi") or not u.get("en"):
                    raise ApiError(400, f"Đơn vị '{uid}' cần tên vi, en và loại weight/volume/count.")
            files["recipt.json"]["units"] = units
            self._commit(files)


def _num(v, default=None):
    if v in (None, ""):
        return default
    return float(v) if not float(v).is_integer() else int(float(v))


def clean_nutrition(n):
    out = {k: _num(n.get(k), 0) for k in ("kcal", "protein", "fat", "carbs", "fiber")}
    for k, default in (("density", 1), ("edible", 1)):
        v = _num(n.get(k), default)
        if v != default:
            out[k] = v
    units = {u: _num(g) for u, g in (n.get("units") or {}).items() if _num(g)}
    if units:
        out["units"] = units
    return out


def clean_recipe(rid, b, ingredients):
    """Normalize an edited recipe; times are derived from the steps like the original data."""
    errors = []
    for k in ("name_vi", "cuisine", "dish_type"):
        if not b.get(k):
            errors.append(f"Thiếu '{k}'.")
    lines, line_ids = [], []
    for i, l in enumerate(b.get("ingredients", []), 1):
        iid = l.get("ingredient_id")
        if iid not in ingredients:
            errors.append(f"Nguyên liệu dòng {i}: '{iid}' không có trong danh sách.")
            continue
        if iid in line_ids:
            errors.append(f"Nguyên liệu '{iid}' bị lặp.")
            continue
        line_ids.append(iid)
        subs = []
        for s in l.get("substitutes", []):
            if s.get("ingredient_id") not in ingredients:
                errors.append(f"Thay thế cho '{iid}': '{s.get('ingredient_id')}' không có trong danh sách.")
                continue
            sub = {"ingredient_id": s["ingredient_id"], "ratio": _num(s.get("ratio"), 1)}
            if s.get("note"):
                sub["note"] = s["note"]
            subs.append(sub)
        line = {"ingredient_id": iid, "amount": _num(l.get("amount")), "unit": l.get("unit"),
                "group": l.get("group"), "optional": bool(l.get("optional"))}
        if l.get("note"):
            line["note"] = l["note"]
        line["substitutes"] = subs
        lines.append(line)
    if not lines:
        errors.append("Cần ít nhất một nguyên liệu.")
    steps, prep, cook, active = [], 0, 0, 0
    for i, s in enumerate(b.get("steps", []), 1):
        if not str(s.get("text", "")).strip():
            errors.append(f"Bước {i} chưa có nội dung.")
        minutes = int(_num(s.get("duration_min"), 0) or 0)
        passive = bool(s.get("passive"))
        if s.get("type") in ("prep", "marinate", "rest"):
            prep += minutes
        else:
            cook += minutes
        if not passive:
            active += minutes
        step = {"order": i, "type": s.get("type") or "cook", "duration_min": minutes,
                "title": s.get("title") or None, "text": str(s.get("text", "")).strip(),
                "ingredients_used": [u for u in s.get("ingredients_used", []) if u in line_ids],
                "passive": passive}
        if s.get("tip"):
            step["tip"] = s["tip"]
        steps.append(step)
    if not steps:
        errors.append("Cần ít nhất một bước.")
    if errors:
        raise ApiError(400, "Công thức chưa hợp lệ.", errors)
    img = b.get("image") or None
    if img and not img.get("url"):
        img = None
    return {
        "id": rid, "name_vi": b["name_vi"].strip(), "name_en": (b.get("name_en") or "").strip() or None,
        "other_names": [n for n in b.get("other_names", []) if n], "description": b.get("description") or None,
        "cuisine": b["cuisine"], "region": b.get("region") or None, "meal_types": b.get("meal_types", []),
        "dish_type": b["dish_type"], "cooking_methods": b.get("cooking_methods", []),
        "main_protein": b.get("main_protein") or "none", "difficulty": int(b.get("difficulty") or 2),
        "servings": int(b.get("servings") or 4),
        "time": {"prep_min": prep, "cook_min": cook, "total_min": prep + cook, "active_min": active},
        "tags": [t for t in b.get("tags", []) if t], "image": img,
        "key_ingredients": [k for k in b.get("key_ingredients", []) if k in line_ids],
        "ingredients": lines, "steps": steps, "notes": b.get("notes") or None,
        "references": [r for r in b.get("references", []) if r.get("url")],
    }


# ---------------------------------------------------------------------------
# Read-only reports
# ---------------------------------------------------------------------------

def check_report(ws):
    issues = []

    def add(level, kind, eid, msg):
        issues.append({"level": level, "kind": kind, "id": eid, "message": msg})

    for w in ws.warnings:
        eid = w.split(":")[0].replace("ingredient ", "").split(" step")[0]
        add("warning", "build", eid, w)
    conn = ws.db()
    cov = {r["recipe_id"]: r["coverage"] for r in conn.execute("SELECT recipe_id, coverage FROM recipe_nutrition")}
    conn.close()
    for r in ws.recipes().values():
        if not r.get("references"):
            add("warning", "recipe", r["id"], "Chưa có nguồn tham khảo")
        if not r.get("key_ingredients"):
            add("warning", "recipe", r["id"], "Chưa chọn nguyên liệu chính (dùng để gợi ý theo tủ lạnh)")
        if not r.get("image"):
            add("info", "recipe", r["id"], "Chưa có ảnh")
        if cov.get(r["id"], 1) < 1:
            add("warning", "recipe", r["id"], f"Chỉ {round(cov[r['id']] * 100)}% nguyên liệu có dữ liệu dinh dưỡng")
        if not r.get("name_en"):
            add("info", "recipe", r["id"], "Chưa có tên tiếng Anh")
    nutrition = ws.files["data/nutrition.json"]["ingredients"]
    usage = ws.usage()
    for iid, ing in ws.ingredients().items():
        if iid in usage and iid not in nutrition:
            if "ingredient" in usage[iid].values():
                add("warning", "ingredient", iid, "Được dùng trong công thức nhưng chưa có dinh dưỡng")
            else:  # only a listed substitute: calories never use it
                add("info", "ingredient", iid, "Chỉ dùng làm nguyên liệu thay thế, chưa có dinh dưỡng")
        if "commonness" not in ing:
            add("warning", "ingredient", iid, "Chưa có độ phổ biến")
    order = {"error": 0, "warning": 1, "info": 2}
    return sorted(issues, key=lambda i: (order[i["level"]], i["kind"], i["id"]))


def state(ws):
    conn = ws.db()
    nut = {r["recipe_id"]: dict(r) for r in conn.execute(
        "SELECT recipe_id, kcal, protein_g, fat_g, carbs_g, health_score, coverage FROM recipe_nutrition")}
    pop = {r["id"]: dict(r) for r in conn.execute("SELECT id, popularity, recipe_count FROM ingredients")}
    conn.close()
    usage = ws.usage()
    nutrition = ws.files["data/nutrition.json"]["ingredients"]
    recipes = [{
        "id": r["id"], "name_vi": r["name_vi"], "name_en": r.get("name_en"), "cuisine": r.get("cuisine"),
        "dish_type": r.get("dish_type"), "difficulty": r.get("difficulty"), "servings": r.get("servings"),
        "total_min": (r.get("time") or {}).get("total_min"), "has_image": bool(r.get("image")),
        "references": len(r.get("references", [])), "home": r["_home"], **nut.get(r["id"], {}),
    } for r in ws.recipes().values()]
    ingredients = [{
        "id": iid, **{k: v for k, v in ing.items() if k != "_home"}, "home": ing["_home"],
        "has_nutrition": iid in nutrition, "used_in": len(usage.get(iid, {})),
        "popularity": pop.get(iid, {}).get("popularity"),
    } for iid, ing in ws.ingredients().items()]
    lookups = {k: v for k, v in ws.files["data/lookups.json"].items() if not k.startswith("_")}
    return {"built_at": ws.built_at, "warnings": len(ws.warnings), "recipes": recipes,
            "ingredients": ingredients, "lookups": lookups, "units": ws.files["recipt.json"]["units"]}


def commons_search(q):
    params = {"action": "query", "format": "json", "formatversion": 2, "generator": "search",
              "gsrsearch": f"{q} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 12,
              "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 960}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as res:
        data = json.load(res)
    import html
    import re
    clean = lambda s: html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()
    out = []
    for p in sorted(data.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0)):
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        if not ii.get("url"):
            continue
        out.append({"title": p["title"], "url": ii.get("thumburl") or ii["url"], "original_url": ii["url"],
                    "source_page": ii.get("descriptionurl"),
                    "license": clean(md.get("LicenseShortName", {}).get("value")) or None,
                    "license_url": md.get("LicenseUrl", {}).get("value"),
                    "author": clean(md.get("Artist", {}).get("value"))[:80] or None})
    return out


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

WS = None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.command, self.path))

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def _route(self, method):
        url = urllib.parse.urlparse(self.path)
        parts = [urllib.parse.unquote(p) for p in url.path.strip("/").split("/")]
        if parts[0] != "api":
            return self._static(url.path) if method == "GET" else self._json(404, {"error": "Not found"})
        try:
            self._json(200, self._api(method, parts[1:], urllib.parse.parse_qs(url.query)))
        except ApiError as e:
            self._json(e.status, {"error": e.message, "details": e.details})
        except (ValueError, KeyError, TypeError) as e:
            self._json(400, {"error": f"Yêu cầu không hợp lệ: {e}"})

    def _api(self, method, p, query):
        ws = WS
        if method == "GET" and p == ["state"]:
            return state(ws)
        if method == "GET" and p == ["check"]:
            return {"issues": check_report(ws), "built_at": ws.built_at}
        if method == "GET" and p == ["commons"]:
            return {"results": commons_search(query.get("q", [""])[0])}
        if method == "POST" and p == ["rebuild"]:
            with ws.lock:
                ws.files = ws._read_all()  # pick up edits made in the files directly
                ws._commit(copy.deepcopy(ws.files))
            return {"ok": True, "built_at": ws.built_at, "warnings": ws.warnings}
        if p[:1] == ["recipes"] and len(p) == 2:
            rid = p[1]
            if method == "GET":
                r = ws.recipes().get(rid)
                if not r:
                    raise ApiError(404, f"Không có công thức '{rid}'.")
                conn = ws.db()
                n = conn.execute("SELECT * FROM recipe_nutrition WHERE recipe_id = ?", (rid,)).fetchone()
                conn.close()
                return {"recipe": r, "nutrition": dict(n) if n else None}
            if method in ("PUT", "POST"):
                ws.save_recipe(rid, self._body(), create=method == "POST")
                return {"ok": True, "id": rid, "built_at": ws.built_at, "warnings": [w for w in ws.warnings if rid in w]}
            if method == "DELETE":
                ws.delete_recipe(rid)
                return {"ok": True}
        if p[:1] == ["ingredients"] and len(p) == 2:
            iid = p[1]
            if method == "GET":
                ing = ws.ingredients().get(iid)
                if not ing:
                    raise ApiError(404, f"Không có nguyên liệu '{iid}'.")
                return {"ingredient": ing, "nutrition": ws.files["data/nutrition.json"]["ingredients"].get(iid),
                        "used_in": ws.usage().get(iid, {})}
            if method in ("PUT", "POST"):
                ws.save_ingredient(iid, self._body(), create=method == "POST")
                return {"ok": True, "id": iid, "built_at": ws.built_at}
            if method == "DELETE":
                ws.delete_ingredient(iid)
                return {"ok": True}
        if method == "PUT" and p[:1] == ["lookups"] and len(p) == 2:
            ws.save_lookup(p[1], self._body()["rows"])
            return {"ok": True, "built_at": ws.built_at}
        if method == "PUT" and p == ["units"]:
            ws.save_units(self._body()["units"])
            return {"ok": True, "built_at": ws.built_at}
        raise ApiError(404, "Không có API này.")

    def _static(self, path):
        target = (DIST / path.lstrip("/")).resolve()
        if not str(target).startswith(str(DIST.resolve())) or not target.is_file():
            target = DIST / "index.html"
        if not target.exists():
            return self._json(503, {"error": "Chưa build giao diện admin: cd admin/ui && npm run build"})
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._route("POST")

    def do_PUT(self):
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")


def main():
    global WS
    import argparse
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="AutoRecipt admin server")
    p.add_argument("--port", type=int, default=8787)
    p.add_argument("--root", default=ROOT, help="folder with recipt.json and data/ (default: this repo)")
    args = p.parse_args()
    port = args.port
    WS = Workspace(args.root)
    print(f"AutoRecipt admin: http://127.0.0.1:{port}  (data: {Path(args.root).resolve()})")
    print(f"Published database built at {WS.built_at}, {len(WS.warnings)} warnings")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
