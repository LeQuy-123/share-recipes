// Recommendation, "mâm cơm" (balanced tray) suggestions, weekly auto-planning and the
// shopping list. Pure functions over the in-memory catalog.
import { getCard, getIngredient, matchRecipe, recipeLines, type Match, type RecipeCard } from '../db/catalog'
import type { PlanItem, PlanMeal } from '../store/user'
import { displayName, t } from '../i18n'
import { formatAmount } from './format'
import { add, cardNutrients, eatenWithRice, RICE_BOWL, ZERO, type Nutrients, type Targets } from './nutrition'

export type Role = 'main' | 'veg' | 'soup' | 'one_dish'

const ONE_DISH = new Set(['noodle', 'noodle_soup', 'rice', 'porridge', 'sticky_rice', 'sandwich', 'pancake', 'roll'])

/** What part of a Vietnamese meal a dish plays. */
export function roleOf(card: RecipeCard): Role {
  const t = card.dish_type_id ?? ''
  if (t === 'soup') return 'soup'
  if (ONE_DISH.has(t)) return 'one_dish'
  if (t === 'vegetable' || card.main_protein_id === 'none') return 'veg'
  return 'main'
}

export const ROLES: Role[] = ['main', 'soup', 'veg', 'one_dish']
export const roleLabel = (role: Role) => t(`role.${role}`)

export interface Filters {
  meal?: string | null
  cuisine?: string | null
  dish?: string | null
  method?: string | null
  protein?: string | null
  healthy?: boolean
  quick?: boolean
  /** keep recipes with at most this many difficulty stars */
  maxDifficulty?: number | null
}

export const HEALTHY_SCORE = 70
/** "Dễ làm" filter: 1-2 stars. */
export const EASY_MAX = 2

export function applyFilters(cards: RecipeCard[], f: Filters): RecipeCard[] {
  return cards.filter(
    (c) =>
      (!f.meal || c.meal_types.includes(f.meal)) &&
      (!f.cuisine || c.cuisine_id === f.cuisine) &&
      (!f.dish || c.dish_type_id === f.dish) &&
      (!f.method || c.methods.includes(f.method)) &&
      (!f.protein || c.main_protein_id === f.protein) &&
      (!f.healthy || c.health_score >= HEALTHY_SCORE) &&
      (!f.quick || c.total_min <= 30) &&
      (!f.maxDifficulty || c.difficulty <= f.maxDifficulty),
  )
}

export interface Suggestion {
  card: RecipeCard
  match: Match
}

/**
 * Recipes ranked by how much of the pantry they use, easiest first among similar matches.
 * Match ratios are compared in steps of 10 % so a much easier dish beats one that only
 * matches a little better.
 */
export function recommend(cards: RecipeCard[], pantry: Set<string>, blocked: Set<string>): Suggestion[] {
  return cards
    .filter((c) => !blocked.has(c.id))
    .map((card) => ({ card, match: matchRecipe(card.id, pantry) }))
    .sort(
      (a, b) =>
        Math.round(b.match.ratio * 10) - Math.round(a.match.ratio * 10) ||
        a.card.difficulty - b.card.difficulty ||
        a.match.missing.length - b.match.missing.length ||
        a.card.total_min - b.card.total_min ||
        b.card.health_score - a.card.health_score,
    )
}

/** Easiest first, then quickest: the default order for lists without a pantry match. */
export function byEase(a: RecipeCard, b: RecipeCard): number {
  return a.difficulty - b.difficulty || a.total_min - b.total_min || b.health_score - a.health_score
}

// Small seeded random so "Đổi món" gives a different but repeatable choice.
function random(seed: number) {
  let t = seed + 0x6d2b79f5
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Tray {
  items: RecipeCard[]
  withRice: boolean
  nutrients: Nutrients
}

export function trayNutrients(items: RecipeCard[], withRice: boolean): Nutrients {
  const sum = items.reduce((acc, c) => add(acc, cardNutrients(c)), ZERO)
  return withRice ? add(sum, RICE_BOWL) : sum
}

interface PickContext {
  cards: RecipeCard[]
  pantry: Set<string>
  avoid: Set<string>
  healthy: boolean
  rnd: () => number
}

function pick(ctx: PickContext, ok: (c: RecipeCard) => boolean, kcalBudget?: number): RecipeCard | null {
  let best: RecipeCard | null = null
  let bestScore = -Infinity
  for (const c of ctx.cards) {
    if (ctx.avoid.has(c.id) || !ok(c)) continue
    const m = matchRecipe(c.id, ctx.pantry)
    let score = m.ratio * 50 + c.health_score * (ctx.healthy ? 0.6 : 0.25) + ctx.rnd() * 25
    score -= c.difficulty * 6 // easy dishes first; a 5-star dish still shows up now and then
    if (kcalBudget) score -= (Math.abs(c.kcal - kcalBudget) / kcalBudget) * 25
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}

/** A balanced Vietnamese meal: one main dish, one soup, one vegetable dish, with rice. */
export function suggestTray(
  cards: RecipeCard[],
  pantry: Set<string>,
  blocked: Set<string>,
  opts: { meal?: string; healthy?: boolean; seed?: number } = {},
): Tray | null {
  const ctx: PickContext = {
    cards: cards.filter((c) => !opts.meal || c.meal_types.includes(opts.meal)),
    pantry,
    avoid: new Set(blocked),
    healthy: !!opts.healthy,
    rnd: random(opts.seed ?? 1),
  }
  const items: RecipeCard[] = []
  for (const role of ['main', 'soup', 'veg'] as Role[]) {
    const c = pick(ctx, (x) => roleOf(x) === role)
    if (c) {
      items.push(c)
      ctx.avoid.add(c.id)
    }
  }
  if (!items.length) return null
  return { items, withRice: true, nutrients: trayNutrients(items, true) }
}

const MEAL_SHARE: Record<PlanMeal, number> = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 }

/**
 * Fill the empty meals of the given days. Dishes are not repeated within the plan window
 * (nor ones blocked by the no-repeat setting) while there are enough recipes left.
 */
export function autoPlan(opts: {
  cards: RecipeCard[]
  days: string[]
  meals: PlanMeal[]
  existing: PlanItem[]
  pantry: Set<string>
  blocked: Set<string>
  targets: Targets
  healthy: boolean
  seed: number
}): Omit<PlanItem, 'id'>[] {
  const out: Omit<PlanItem, 'id'>[] = []
  const used = new Set([...opts.blocked, ...opts.existing.map((p) => p.recipe_id)])
  const ctx: PickContext = { cards: opts.cards, pantry: opts.pantry, avoid: used, healthy: opts.healthy, rnd: random(opts.seed) }
  const filled = new Set(opts.existing.map((p) => `${p.date}/${p.meal}`))

  const pickFresh = (ok: (c: RecipeCard) => boolean, budget: number) => {
    const c = pick(ctx, ok, budget) ?? pick({ ...ctx, avoid: new Set() }, ok, budget)
    if (c) used.add(c.id)
    return c
  }

  opts.days.forEach((date, dayIndex) => {
    for (const meal of opts.meals) {
      if (filled.has(`${date}/${meal}`)) continue
      const budget = opts.targets.kcal * MEAL_SHARE[meal]
      const forMeal = (c: RecipeCard) => c.meal_types.includes(meal) || (meal !== 'breakfast' && c.meal_types.includes('lunch'))
      if (meal === 'breakfast' || (meal === 'lunch' && dayIndex % 2 === 0)) {
        const c = pickFresh((x) => roleOf(x) === 'one_dish' && forMeal(x), budget)
        if (c) out.push({ date, meal, recipe_id: c.id, servings: 1, with_rice: eatenWithRice(c) })
        continue
      }
      // Tray: main + soup (+ vegetable when the main dish has little), with one bowl of rice.
      const main = pickFresh((x) => roleOf(x) === 'main' && forMeal(x), budget - RICE_BOWL.kcal - 100)
      const soup = pickFresh((x) => roleOf(x) === 'soup', 120)
      const needVeg = (main?.veg_g ?? 0) + (soup?.veg_g ?? 0) < 120
      const veg = needVeg ? pickFresh((x) => roleOf(x) === 'veg', 100) : null
      ;[main, soup, veg].forEach((c, i) => {
        if (c) out.push({ date, meal, recipe_id: c.id, servings: 1, with_rice: i === 0 })
      })
    }
  })
  return out
}

/** Nutrition of plan items (servings and rice included). */
export function planNutrients(items: PlanItem[]): Nutrients {
  let total = ZERO
  for (const item of items) {
    const card = getCard(item.recipe_id)
    if (card) total = add(total, cardNutrients(card), item.servings)
    if (item.with_rice) total = add(total, RICE_BOWL, item.servings)
  }
  return total
}

export interface ShoppingItem {
  ingredient_id: string
  name: string
  category_id: string
  amounts: string
  recipes: string[]
  inPantry: boolean
}

/** Everything the planned dishes need, minus pantry staples; marks what is already at home. */
export function shoppingList(items: PlanItem[], pantry: Set<string>): ShoppingItem[] {
  const lines = recipeLines([...new Set(items.map((i) => i.recipe_id))])
  const acc = new Map<string, { units: Map<string, number>; recipes: Set<string> }>()
  for (const item of items) {
    const card = getCard(item.recipe_id)
    if (!card) continue
    const scale = item.servings / (card.servings || 1)
    for (const line of lines.get(item.recipe_id) ?? []) {
      if (line.optional || line.pantry_staple) continue
      const entry = acc.get(line.ingredient_id) ?? { units: new Map(), recipes: new Set() }
      const unit = line.unit_id ?? ''
      entry.units.set(unit, (entry.units.get(unit) ?? 0) + (line.amount ?? 0) * scale)
      entry.recipes.add(displayName(card))
      acc.set(line.ingredient_id, entry)
    }
  }
  return [...acc.entries()]
    .map(([id, e]) => {
      const ing = getIngredient(id)
      return {
        ingredient_id: id,
        name: ing ? displayName(ing) : id,
        category_id: ing?.category_id ?? 'other',
        amounts: [...e.units.entries()].map(([u, v]) => formatAmount(v, u || null)).join(' + '),
        recipes: [...e.recipes],
        inPantry: pantry.has(id),
      }
    })
    .sort((a, b) => Number(a.inPantry) - Number(b.inPantry) || a.category_id.localeCompare(b.category_id) || a.name.localeCompare(b.name, 'vi'))
}
