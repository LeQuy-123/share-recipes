import type { AppState, CommonsImage, Ingredient, Issue, LookupRow, Nutrition, Recipe, RecipeNutrition, Unit } from './types'

export class ApiError extends Error {
  status: number
  details: unknown
  constructor(status: number, message: string, details: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Không kết nối được admin server. Đã chạy "python admin/server.py" chưa?', null)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error ?? `Lỗi ${res.status}`, data.details)
  return data as T
}

const enc = encodeURIComponent

export const api = {
  state: () => req<AppState>('GET', '/api/state'),
  check: () => req<{ issues: Issue[]; built_at: string }>('GET', '/api/check'),
  rebuild: () => req<{ built_at: string; warnings: string[] }>('POST', '/api/rebuild'),
  commons: (q: string) => req<{ results: CommonsImage[] }>('GET', `/api/commons?q=${enc(q)}`),

  recipe: (id: string) => req<{ recipe: Recipe; nutrition: RecipeNutrition | null }>('GET', `/api/recipes/${enc(id)}`),
  saveRecipe: (id: string, recipe: Recipe, create: boolean) =>
    req<{ id: string; warnings: string[] }>(create ? 'POST' : 'PUT', `/api/recipes/${enc(id)}`, recipe),
  deleteRecipe: (id: string) => req('DELETE', `/api/recipes/${enc(id)}`),

  ingredient: (id: string) =>
    req<{ ingredient: Ingredient; nutrition: Nutrition | null; used_in: Record<string, string> }>(
      'GET',
      `/api/ingredients/${enc(id)}`,
    ),
  saveIngredient: (id: string, body: Ingredient & { nutrition: Nutrition | null }, create: boolean) =>
    req(create ? 'POST' : 'PUT', `/api/ingredients/${enc(id)}`, body),
  deleteIngredient: (id: string) => req('DELETE', `/api/ingredients/${enc(id)}`),

  saveLookup: (table: string, rows: LookupRow[]) => req('PUT', `/api/lookups/${enc(table)}`, { rows }),
  saveUnits: (units: Record<string, Unit>) => req('PUT', '/api/units', { units }),
}

/** Error text plus any details list the server sent. */
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    const d = Array.isArray(e.details) ? e.details.join('\n• ') : typeof e.details === 'string' ? e.details : ''
    return d ? `${e.message}\n• ${d}` : e.message
  }
  return e instanceof Error ? e.message : String(e)
}
