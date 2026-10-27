// Read-only access to the recipe catalog. Small tables are loaded once and kept in memory;
// detail screens query SQLite directly.
import { displayName } from '../i18n'
import { all, get } from './sqlite'
import { normalize, searchParams } from './text'

export interface Lookup {
  id: string
  name_vi: string | null
  name_en: string | null
  sort: number
}

export interface Lookups {
  cuisines: Map<string, Lookup>
  regions: Map<string, Lookup>
  dishTypes: Map<string, Lookup>
  proteins: Map<string, Lookup>
  mealTypes: Map<string, Lookup>
  methods: Map<string, Lookup>
  categories: Map<string, Lookup>
  groups: Map<string, Lookup>
  stepTypes: Map<string, Lookup>
  /** 1-5 stars -> label and description */
  difficulty: Map<number, { name_vi: string; description_vi: string | null }>
}

export interface RecipeCard {
  id: string
  name_vi: string
  name_en: string | null
  description: string | null
  cuisine_id: string
  region_id: string | null
  dish_type_id: string | null
  main_protein_id: string | null
  difficulty: number
  servings: number
  total_min: number
  active_min: number
  image_url: string | null
  /** photo saved in the app by db/fetch_images.py (preferred: fast, works offline) */
  image_local: string | null
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  veg_g: number
  health_score: number
  health_notes: string[]
  meal_types: string[]
  methods: string[]
  tags: string[]
  other_names: string[]
  /** normalized name + other names, for search */
  search_name: string
  /** normalized tags + description, for search */
  search_extra: string
}

export interface Ingredient {
  id: string
  name_vi: string
  name_en: string
  category_id: string
  pantry_staple: boolean
  popularity: number
  recipe_count: number
}

export interface IngredientHit extends Ingredient {
  rank: number
}

interface KeyLine {
  ingredient_id: string
  subs: string[]
}

export interface Match {
  total: number
  have: number
  substitute: number
  missing: string[]
  /** 0..1, a substitute counts 0.7 like v_recipe_pantry_score */
  ratio: number
}

let lookups: Lookups | null = null
let cards: RecipeCard[] = []
let cardById = new Map<string, RecipeCard>()
let imageIndex = new Map<string, string>()

/** Load public/img/recipes/index.json (recipe id -> local photo). Optional: missing = remote URLs. */
export async function loadImageIndex(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}img/recipes/index.json`, { cache: 'no-cache' })
    if (!res.ok) return
    const data = (await res.json()) as Record<string, { file: string }>
    imageIndex = new Map(Object.entries(data).map(([id, e]) => [id, `${import.meta.env.BASE_URL}img/recipes/${e.file}`]))
  } catch {
    // offline on first visit or no photos fetched: remote URLs still work
  }
}
let ingredients = new Map<string, Ingredient>()
let keyLines = new Map<string, KeyLine[]>()
let usage = new Map<string, Map<string, 'ingredient' | 'substitute'>>()

const split = (v: string | null) => (v ? v.split('|') : [])

/** A row as SQLite returns it: the listed boolean fields arrive as 0/1. */
type Row<T, K extends keyof T> = Omit<T, K> & { [P in K]: number }

function loadLookup(table: string): Map<string, Lookup> {
  const rows = all<Lookup>(`SELECT id, name_vi, name_en, sort FROM ${table} ORDER BY sort, id`)
  return new Map(rows.map((r) => [r.id, r]))
}

/** Call once after openDatabase(). */
export function loadCatalog(): void {
  lookups = {
    cuisines: loadLookup('cuisines'),
    regions: loadLookup('regions'),
    dishTypes: loadLookup('dish_types'),
    proteins: loadLookup('proteins'),
    mealTypes: loadLookup('meal_types'),
    methods: loadLookup('cooking_methods'),
    categories: loadLookup('ingredient_categories'),
    groups: loadLookup('ingredient_groups'),
    stepTypes: loadLookup('step_types'),
    difficulty: new Map(
      all<{ id: number; name_vi: string; description_vi: string | null }>(
        'SELECT id, name_vi, description_vi FROM difficulty_levels ORDER BY id',
      ).map((d) => [d.id, d]),
    ),
  }

  type CardRow = Omit<RecipeCard, 'health_notes' | 'meal_types' | 'methods' | 'tags' | 'other_names' | 'search_name' | 'search_extra'> & {
    health_notes: string | null
    meal_types: string | null
    methods: string | null
    tags: string | null
    other_names: string | null
  }
  const rows = all<CardRow>(`
    SELECT r.id, r.name_vi, r.name_en, r.description, r.cuisine_id, r.region_id, r.dish_type_id,
           r.main_protein_id, r.difficulty, r.servings, r.total_min, r.active_min,
           img.url AS image_url,
           n.kcal, n.protein_g, n.fat_g, n.carbs_g, n.fiber_g, n.veg_g, n.health_score,
           replace(n.health_notes, ';', '|') AS health_notes,
           (SELECT group_concat(meal_type_id, '|') FROM recipe_meal_types WHERE recipe_id = r.id) AS meal_types,
           (SELECT group_concat(cooking_method_id, '|') FROM recipe_cooking_methods WHERE recipe_id = r.id) AS methods,
           (SELECT group_concat(t.name, '|') FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
             WHERE rt.recipe_id = r.id) AS tags,
           (SELECT group_concat(name, '|') FROM recipe_other_names WHERE recipe_id = r.id) AS other_names
    FROM recipes r
    LEFT JOIN recipe_images img ON img.recipe_id = r.id AND img.is_primary = 1
    LEFT JOIN recipe_nutrition n ON n.recipe_id = r.id
    ORDER BY r.name_vi`)
  cards = rows.map((r) => {
    const otherNames = split(r.other_names)
    const image_local = imageIndex.get(r.id) ?? null
    const tags = split(r.tags)
    return {
      ...r,
      image_local,
      health_notes: split(r.health_notes),
      meal_types: split(r.meal_types),
      methods: split(r.methods),
      tags,
      other_names: otherNames,
      search_name: normalize([r.name_vi, r.name_en ?? '', ...otherNames].join(' ')),
      search_extra: normalize([...tags, r.description ?? ''].join(' ')),
    }
  })
  cardById = new Map(cards.map((c) => [c.id, c]))

  const ingRows = all<Row<Ingredient, 'pantry_staple'>>(
    'SELECT id, name_vi, name_en, category_id, pantry_staple, popularity, recipe_count FROM ingredients',
  )
  ingredients = new Map(ingRows.map((r) => [r.id, { ...r, pantry_staple: !!r.pantry_staple }]))

  keyLines = new Map()
  for (const row of all<{ recipe_id: string; ingredient_id: string; subs: string | null }>(`
    SELECT ri.recipe_id, ri.ingredient_id,
           (SELECT group_concat(substitute_id, '|') FROM ingredient_substitutes s
             WHERE s.recipe_ingredient_id = ri.id) AS subs
    FROM recipe_ingredients ri WHERE ri.is_key = 1`)) {
    const list = keyLines.get(row.recipe_id) ?? []
    list.push({ ingredient_id: row.ingredient_id, subs: split(row.subs) })
    keyLines.set(row.recipe_id, list)
  }

  usage = new Map()
  for (const row of all<{ ingredient_id: string; recipe_id: string; role: 'ingredient' | 'substitute' }>(
    'SELECT ingredient_id, recipe_id, role FROM v_ingredient_usage',
  )) {
    const m = usage.get(row.ingredient_id) ?? new Map()
    if (m.get(row.recipe_id) !== 'ingredient') m.set(row.recipe_id, row.role)
    usage.set(row.ingredient_id, m)
  }
}

export function getLookups(): Lookups {
  if (!lookups) throw new Error('Catalog not loaded')
  return lookups
}

export function label(map: Map<string, Lookup>, id: string | null | undefined): string {
  if (!id) return ''
  const row = map.get(id)
  return row ? displayName(row) || id : id
}

export const getCards = () => cards
export const getCard = (id: string) => cardById.get(id)
export const getIngredient = (id: string) => ingredients.get(id)
export const getKeyIngredients = (recipeId: string) => (keyLines.get(recipeId) ?? []).map((k) => k.ingredient_id)

/** How well a recipe's key ingredients are covered by the pantry. */
export function matchRecipe(recipeId: string, pantry: Set<string>): Match {
  const lines = keyLines.get(recipeId) ?? []
  let have = 0
  let substitute = 0
  const missing: string[] = []
  for (const line of lines) {
    if (pantry.has(line.ingredient_id)) have++
    else if (line.subs.some((s) => pantry.has(s))) substitute++
    else missing.push(line.ingredient_id)
  }
  const total = lines.length
  return { total, have, substitute, missing, ratio: total ? (have + 0.7 * substitute) / total : 0 }
}

/** Recipes that use an ingredient, directly or as a listed substitute. */
export function recipesUsing(ingredientId: string): { card: RecipeCard; role: 'ingredient' | 'substitute' }[] {
  const m = usage.get(ingredientId)
  if (!m) return []
  return [...m.entries()]
    .map(([id, role]) => ({ card: cardById.get(id)!, role }))
    .filter((r) => r.card)
    .sort((a, b) => (a.role === b.role ? a.card.total_min - b.card.total_min : a.role === 'ingredient' ? -1 : 1))
}

// ---------------------------------------------------------------------------
// Ingredient search (db/queries.sql #1)
// ---------------------------------------------------------------------------

const INGREDIENT_SEARCH_SQL = `
SELECT i.id, i.name_vi, i.name_en, i.category_id, i.pantry_staple, i.popularity, i.recipe_count, m.rank
FROM (
    SELECT ingredient_id,
           MIN(CASE
                 WHEN ' ' || term_norm || ' ' LIKE '% ' || :query_norm || ' %' THEN 0
                 WHEN ' ' || term_norm LIKE '% ' || :query_norm || '%' THEN 4
                 ELSE 8
               END
               + 2 * (:query_lower IS NOT NULL AND instr(term_lower, :query_lower) = 0)
               + (kind = 'alias')
               + 12 * (kind = 'name_en')) AS rank
    FROM ingredient_aliases
    WHERE term_norm LIKE '%' || :query_norm || '%'
    GROUP BY ingredient_id
) m
JOIN ingredients i ON i.id = m.ingredient_id
ORDER BY m.rank, i.popularity DESC, length(i.name_vi)
LIMIT :limit`

export function searchIngredients(text: string, limit = 20): IngredientHit[] {
  const params = searchParams(text)
  if (!params.query_norm) return []
  return all<Row<IngredientHit, 'pantry_staple'>>(INGREDIENT_SEARCH_SQL, { ...params, limit }).map((r) => ({
    ...r,
    pantry_staple: !!r.pantry_staple,
  }))
}

/** Most common ingredients, for quick-add chips and category browsing. */
export function popularIngredients(opts: { category?: string; limit?: number; includeStaples?: boolean } = {}): Ingredient[] {
  return [...ingredients.values()]
    .filter((i) => (opts.category ? i.category_id === opts.category : true))
    .filter((i) => opts.includeStaples || !i.pantry_staple)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, opts.limit ?? 30)
}

export function categoryCounts(): { id: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const i of ingredients.values()) counts.set(i.category_id, (counts.get(i.category_id) ?? 0) + 1)
  const order = getLookups().categories
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => (order.get(a.id)?.sort ?? 99) - (order.get(b.id)?.sort ?? 99))
}

// ---------------------------------------------------------------------------
// Recipe search
// ---------------------------------------------------------------------------

export interface RecipeSearchResult {
  byName: RecipeCard[]
  byIngredient: { ingredient: IngredientHit; recipes: RecipeCard[] }[]
  ingredients: IngredientHit[]
}

export function searchRecipes(text: string): RecipeSearchResult {
  const q = normalize(text.replace(/[%_]/g, ' '))
  if (!q) return { byName: [], byIngredient: [], ingredients: [] }
  const words = q.split(' ')
  const scored: { card: RecipeCard; score: number }[] = []
  for (const card of cards) {
    const nameHit = words.every((w) => card.search_name.includes(w))
    const extraHit = !nameHit && words.every((w) => card.search_name.includes(w) || card.search_extra.includes(w))
    if (!nameHit && !extraHit) continue
    const score = card.search_name.startsWith(q) ? 0 : card.search_name.includes(q) ? 1 : nameHit ? 2 : 3
    scored.push({ card, score })
  }
  scored.sort((a, b) => a.score - b.score || a.card.name_vi.localeCompare(b.card.name_vi, 'vi'))
  const byName = scored.map((s) => s.card)

  const hits = searchIngredients(text, 8)
  const shown = new Set(byName.map((c) => c.id))
  const byIngredient = hits
    .filter((h) => h.rank < 8)
    .slice(0, 3)
    .map((ingredient) => ({
      ingredient,
      recipes: recipesUsing(ingredient.id)
        .map((r) => r.card)
        .filter((c) => !shown.has(c.id)),
    }))
    .filter((g) => g.recipes.length)
  return { byName, byIngredient, ingredients: hits }
}

// ---------------------------------------------------------------------------
// Detail queries
// ---------------------------------------------------------------------------

export interface RecipeLine {
  id: number
  ingredient_id: string
  name_vi: string
  name_en: string | null
  amount: number | null
  unit_id: string | null
  group_id: string | null
  optional: boolean
  is_key: boolean
  note: string | null
  pantry_staple: boolean
  substitutes: { id: string; name_vi: string; name_en: string | null; ratio: number; note: string | null }[]
}

export interface RecipeStep {
  id: number
  step_order: number
  type_id: string
  duration_min: number | null
  title: string | null
  text: string
  tip: string | null
  passive: boolean
  ingredient_ids: string[]
}

export interface RecipeImage {
  url: string
  source_page: string | null
  license: string | null
  license_url: string | null
  author: string | null
  kind: string
}

export interface RecipeDetail {
  card: RecipeCard
  notes: string | null
  lines: RecipeLine[]
  steps: RecipeStep[]
  image: RecipeImage | null
  references: { source: string; url: string }[]
  coverage: number
}

export function getRecipeDetail(id: string): RecipeDetail | null {
  const card = cardById.get(id)
  if (!card) return null
  const lines = all<Omit<RecipeLine, 'substitutes' | 'optional' | 'is_key' | 'pantry_staple' | 'name_en'> & {
    optional: number
    is_key: number
    pantry_staple: number
    subs: string | null
  }>(
    `SELECT ri.id, ri.ingredient_id, i.name_vi, ri.amount, ri.unit_id, ri.group_id, ri.optional, ri.is_key,
            ri.note, i.pantry_staple,
            (SELECT group_concat(s.substitute_id || '~' || si.name_vi || '~' || s.ratio || '~' || ifnull(s.note, ''), '|')
               FROM ingredient_substitutes s JOIN ingredients si ON si.id = s.substitute_id
              WHERE s.recipe_ingredient_id = ri.id) AS subs
     FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = :id ORDER BY ri.position`,
    { id },
  ).map((r) => ({
    id: r.id,
    ingredient_id: r.ingredient_id,
    name_vi: r.name_vi,
    name_en: ingredients.get(r.ingredient_id)?.name_en ?? null,
    amount: r.amount,
    unit_id: r.unit_id,
    group_id: r.group_id,
    optional: !!r.optional,
    is_key: !!r.is_key,
    note: r.note,
    pantry_staple: !!r.pantry_staple,
    substitutes: split(r.subs).map((s) => {
      const [sid, name, ratio, note] = s.split('~')
      return { id: sid, name_vi: name, name_en: ingredients.get(sid)?.name_en ?? null, ratio: Number(ratio), note: note || null }
    }),
  }))

  const steps = all<Omit<RecipeStep, 'passive' | 'ingredient_ids'> & { passive: number; ids: string | null }>(
    `SELECT st.id, st.step_order, st.type_id, st.duration_min, st.title, st.text, st.tip, st.passive,
            (SELECT group_concat(ingredient_id, '|') FROM step_ingredients WHERE step_id = st.id) AS ids
     FROM recipe_steps st WHERE st.recipe_id = :id ORDER BY st.step_order`,
    { id },
  ).map(({ ids, passive, ...s }) => ({ ...s, passive: !!passive, ingredient_ids: split(ids) }))

  const image =
    get<RecipeImage>(
      `SELECT url, source_page, license, license_url, author, kind FROM recipe_images
       WHERE recipe_id = :id AND is_primary = 1`,
      { id },
    ) ?? null
  const references = all<{ source: string; url: string }>(
    'SELECT source, url FROM recipe_references WHERE recipe_id = :id ORDER BY position',
    { id },
  )
  const extra = get<{ notes: string | null; coverage: number | null }>(
    `SELECT r.notes, n.coverage FROM recipes r LEFT JOIN recipe_nutrition n ON n.recipe_id = r.id
     WHERE r.id = :id`,
    { id },
  )
  return { card, notes: extra?.notes ?? null, lines, steps, image, references, coverage: extra?.coverage ?? 0 }
}

export interface IngredientDetail extends Ingredient {
  commonness: number
  aliases: string[]
  nutrition: { kcal: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number } | null
}

export function getIngredientDetail(id: string): IngredientDetail | null {
  const base = ingredients.get(id)
  if (!base) return null
  const row = get<{ commonness: number }>('SELECT commonness FROM ingredients WHERE id = :id', { id })
  const aliases = all<{ term: string }>(
    "SELECT term FROM ingredient_aliases WHERE ingredient_id = :id AND kind = 'alias' ORDER BY term",
    { id },
  ).map((a) => a.term)
  const nutrition =
    get<IngredientDetail['nutrition'] & object>(
      'SELECT kcal, protein_g, fat_g, carbs_g, fiber_g FROM ingredient_nutrition WHERE ingredient_id = :id',
      { id },
    ) ?? null
  return { ...base, commonness: row?.commonness ?? 2, aliases, nutrition }
}

export interface PrepStep {
  recipe_id: string
  recipe_name: string
  recipe_name_en: string | null
  step_order: number
  type_id: string
  title: string | null
  text: string
  tip: string | null
}

/** "How to prepare this ingredient": prep and marinate steps from recipes that use it. */
export function prepStepsFor(ingredientId: string): PrepStep[] {
  return all<PrepStep>(
    `SELECT r.id AS recipe_id, r.name_vi AS recipe_name, r.name_en AS recipe_name_en, st.step_order, st.type_id, st.title, st.text, st.tip
     FROM step_ingredients si
     JOIN recipe_steps st ON st.id = si.step_id
     JOIN recipes r ON r.id = st.recipe_id
     WHERE si.ingredient_id = :id AND st.type_id IN ('prep', 'marinate')
     ORDER BY st.type_id = 'marinate', length(st.text), r.name_vi`,
    { id: ingredientId },
  )
}

export interface ShoppingLine {
  ingredient_id: string
  amount: number | null
  unit_id: string | null
  optional: boolean
  pantry_staple: boolean
}

/** Ingredient lines of several recipes at once (for the shopping list). */
export function recipeLines(recipeIds: string[]): Map<string, ShoppingLine[]> {
  const result = new Map<string, ShoppingLine[]>()
  if (!recipeIds.length) return result
  const placeholders = recipeIds.map(() => '?').join(',')
  for (const r of all<Row<ShoppingLine, 'optional' | 'pantry_staple'> & { recipe_id: string }>(
    `SELECT ri.recipe_id, ri.ingredient_id, ri.amount, ri.unit_id, ri.optional, i.pantry_staple
     FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id IN (${placeholders})`,
    recipeIds,
  )) {
    const list = result.get(r.recipe_id) ?? []
    const { recipe_id: _, ...line } = r
    list.push({ ...line, optional: !!r.optional, pantry_staple: !!r.pantry_staple })
    result.set(r.recipe_id, list)
  }
  return result
}
