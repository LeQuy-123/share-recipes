import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import initSqlJs from 'sql.js'
import { loadCatalog } from '../src/db/catalog'
import { setDatabase } from '../src/db/sqlite'
import { initI18n } from '../src/i18n'

/** Open db/autorecipt.db (built by db/build_db.py) and load the catalog. */
export async function openTestDatabase() {
  initI18n('vi') // tests check Vietnamese text; the test browser reports English
  const SQL = await initSqlJs()
  // Tests run from app/ (jsdom makes import.meta.url an http URL, so resolve from cwd).
  const bytes = readFileSync(resolve(process.cwd(), '../db/autorecipt.db'))
  setDatabase(new SQL.Database(bytes))
  loadCatalog()
}
