// Loads the catalog database (built by db/build_db.py) into sql.js, in memory.
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let db: Database | null = null

export async function openDatabase(): Promise<void> {
  const [SQL, bytes] = await Promise.all([
    initSqlJs({ locateFile: () => wasmUrl }),
    fetch(`${import.meta.env.BASE_URL}autorecipt.db`).then((res) => {
      if (!res.ok) throw new Error(`Không tải được dữ liệu món ăn (${res.status})`)
      return res.arrayBuffer()
    }),
  ])
  db = new SQL.Database(new Uint8Array(bytes))
}

/** Use an already opened database (tests open it from the file system). */
export function setDatabase(database: Database): void {
  db = database
}

type Params = Record<string, SqlValue> | SqlValue[]

// sql.js wants named parameters with their prefix (":name").
function bindable(params: Params) {
  if (Array.isArray(params)) return params
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k.startsWith(':') ? k : `:${k}`, v]))
}

export function all<T>(sql: string, params?: Params): T[] {
  if (!db) throw new Error('Database not opened')
  const stmt = db.prepare(sql)
  try {
    if (params) stmt.bind(bindable(params))
    const rows: T[] = []
    while (stmt.step()) rows.push(stmt.getAsObject() as T)
    return rows
  } finally {
    stmt.free()
  }
}

export function get<T>(sql: string, params?: Params): T | undefined {
  return all<T>(sql, params)[0]
}
