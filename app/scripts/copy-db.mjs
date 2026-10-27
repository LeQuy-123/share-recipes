// Copies the database built by db/build_db.py into public/ so the app can fetch it.
// Runs automatically before `npm run dev` and `npm run build`.
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../db/autorecipt.db')
const dest = resolve(here, '../public/autorecipt.db')

if (!existsSync(src)) {
  console.error(`Missing ${src}\nBuild it first:  python db/build_db.py`)
  process.exit(1)
}
mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
// The app polls this to notice a newer database (the admin server writes it on publish).
writeFileSync(resolve(dest, '../db-version.json'), JSON.stringify({ built_at: statSync(src).mtime.toISOString() }) + '\n')
console.log(`Copied database -> ${dest}`)
