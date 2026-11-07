// Puts the recipe database in public/ so the app can fetch it. Runs before `npm run dev` and
// `npm run build`.
//
// public/autorecipt.db (and db-version.json) are committed, so the app/ folder builds on its own
// (Vercel with Root Directory = app). In the full repo, when db/build_db.py has produced a newer
// ../db/autorecipt.db, that one is copied over the committed copy first; commit the result to
// release it.
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../db/autorecipt.db')
const dest = resolve(here, '../public/autorecipt.db')
const version = resolve(here, '../public/db-version.json')

const same = (a, b) => statSync(a).size === statSync(b).size && readFileSync(a).equals(readFileSync(b))

if (existsSync(src) && statSync(src).size > 0 && (!existsSync(dest) || !same(src, dest))) {
  copyFileSync(src, dest)
  // The app polls this to notice a newer database (the admin server writes it on publish too).
  writeFileSync(version, JSON.stringify({ built_at: statSync(src).mtime.toISOString() }) + '\n')
  console.log(`Copied database -> ${dest}`)
} else if (existsSync(dest)) {
  if (!existsSync(version)) writeFileSync(version, JSON.stringify({ built_at: statSync(dest).mtime.toISOString() }) + '\n')
  console.log(`Using database ${dest}`)
} else {
  console.error(`Missing ${dest}\nBuild it from the repo root:  python db/build_db.py  (then npm run dev / build copies it)`)
  process.exit(1)
}
