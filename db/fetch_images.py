"""Download recipe photos into the app so they load fast, work offline, and don't depend on
Wikimedia hotlinking (which rate-limits and only serves fixed thumbnail widths).

    python db/fetch_images.py              # all recipes in db/autorecipt.db
    python db/fetch_images.py pho-bo ...   # only these recipes

Files go to app/public/img/recipes/<recipe id>.<ext> at 500 px wide, listed in
app/public/img/recipes/index.json ({recipe id: {"file", "source"}}). A photo is downloaded
again only when its source URL changes. Uses only the Python standard library.
"""

import json
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "db" / "autorecipt.db"
OUT = ROOT / "app" / "public" / "img" / "recipes"
WIDTH = 500  # a standard Wikimedia thumbnail step
UA = {"User-Agent": "AutoRecipt/0.1 (recipe app; image cache)"}


def thumb_url(original):
    """upload.wikimedia.org/wikipedia/commons/a/ab/Name.jpg -> .../thumb/a/ab/Name.jpg/500px-Name.jpg"""
    url = original.split("?")[0]
    marker = "/wikipedia/commons/"
    if "upload.wikimedia.org" not in url or marker not in url or "/thumb/" in url:
        return None
    head, path = url.split(marker, 1)
    name = path.rsplit("/", 1)[-1]
    return f"{head}{marker}thumb/{path}/{WIDTH}px-{name}"


def download(url, tries=4):
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as res:
                return res.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries - 1:
                time.sleep(5 * (attempt + 1))  # rate limited: back off
                continue
            raise
    return None


def sync(only=None, db_path=DB, out=OUT, quiet=False):
    """Fetch missing or changed photos. Returns (downloaded, failed) recipe ids."""
    out.mkdir(parents=True, exist_ok=True)
    index_path = out / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    conn = sqlite3.connect(db_path)
    rows = conn.execute("SELECT recipe_id, url, original_url FROM recipe_images WHERE is_primary = 1").fetchall()
    conn.close()
    current = {rid for rid, _, _ in rows}
    downloaded, failed = [], []
    for rid, url, original in rows:
        if only and rid not in only:
            continue
        source = (original or url).split("?")[0]
        entry = index.get(rid)
        if entry and entry["source"] == source and (out / entry["file"]).exists():
            continue
        ext = source.rsplit(".", 1)[-1].lower()
        ext = ext if ext in ("jpg", "jpeg", "png", "webp", "gif") else "jpg"
        data = None
        candidates = [u for u in (thumb_url(source), source) if u]
        for candidate in candidates:  # the thumbnail fails when the original is narrower than 500 px
            try:
                data = download(candidate)
                break
            except (urllib.error.URLError, TimeoutError) as e:
                if not quiet:
                    print(f"  {rid}: {candidate[:80]}... -> {e}")
        if not data:
            failed.append(rid)
            continue
        name = f"{rid}.{ext}"
        if entry and entry["file"] != name:  # replaced by a photo of another type
            (out / entry["file"]).unlink(missing_ok=True)
        (out / name).write_bytes(data)
        index[rid] = {"file": name, "source": source}
        downloaded.append(rid)
        if not quiet:
            print(f"  {rid}: {len(data) // 1024} KB")
        time.sleep(0.5)  # be polite to Wikimedia
    # Drop photos of recipes that no longer have an image.
    for rid in [r for r in index if r not in current]:
        (out / index[rid]["file"]).unlink(missing_ok=True)
        del index[rid]
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return downloaded, failed


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    only = set(sys.argv[1:]) or None
    downloaded, failed = sync(only)
    total = len(json.loads((OUT / "index.json").read_text(encoding="utf-8")))
    print(f"Downloaded {len(downloaded)}, failed {len(failed)}, {total} photos cached in {OUT}")
    if failed:
        print("Failed (the app falls back to the Wikimedia URL):", ", ".join(failed))


if __name__ == "__main__":
    main()
