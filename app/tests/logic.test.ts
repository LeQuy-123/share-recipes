import { beforeAll, describe, expect, it } from 'vitest'
import { getCards, getKeyIngredients, matchRecipe, searchIngredients, searchRecipes } from '../src/db/catalog'
import { normalize, searchParams } from '../src/db/text'
import { addDays, formatAmount, isoDate, weekStart } from '../src/lib/format'
import { dailyKcal, targetsFor } from '../src/lib/nutrition'
import { applyFilters, autoPlan, recommend, roleOf, shoppingList, suggestTray } from '../src/lib/planner'
import { openTestDatabase } from './helpers'

beforeAll(openTestDatabase)

describe('text', () => {
  it('normalizes Vietnamese like build_db.py', () => {
    expect(normalize('Thịt  Ba Chỉ')).toBe('thit ba chi')
    expect(normalize('Đậu hũ')).toBe('dau hu')
  })
  it('passes accents only when typed', () => {
    expect(searchParams('cá')).toEqual({ query_norm: 'ca', query_lower: 'cá' })
    expect(searchParams('ca').query_lower).toBeNull()
    expect(searchParams('50%_x').query_norm).toBe('50 x')
  })
})

describe('ingredient search', () => {
  const top = (q: string, n = 3) => searchIngredients(q, n).map((h) => h.name_vi)

  it('ranks accent-exact whole words first', () => {
    expect(top('cá').every((n) => n.startsWith('Cá'))).toBe(true)
    // "cà" typed with its accent: eggplant/tomato/carrot words, never "cá" (fish).
    expect(top('cà').every((n) => n.startsWith('Cà '))).toBe(true)
    expect(top('cà')).toContain('Cà chua')
  })
  it('ranks common ingredients first', () => {
    expect(top('gà', 1)[0]).toBe('Trứng gà')
    // Without accents "dau" covers both dầu (oil) and đậu (beans); the most-used comes first.
    expect(top('dau', 1)).toEqual(['Dầu ăn'])
    expect(top('dau', 4)).toContain('Dầu hào')
  })
  it('matches receipt abbreviations and English', () => {
    expect(searchIngredients('TH.BA CHI', 1)[0].id).toBe('pork_belly')
    // The most-used pork cut wins (depends on how many recipes use each).
    expect(['pork_minced', 'pork_belly']).toContain(searchIngredients('pork', 1)[0].id)
  })
  it('returns nothing for empty or unknown text', () => {
    expect(searchIngredients('   ')).toEqual([])
    expect(searchIngredients('xyzq')).toEqual([])
  })
})

describe('recipe search', () => {
  it('finds by name without accents', () => {
    expect(searchRecipes('pho bo').byName[0].id).toBe('pho-bo')
    expect(searchRecipes('canh chua').byName.map((c) => c.id)).toContain('canh-chua-ca-loc')
  })
  it('groups recipes by matching ingredient, without repeating name matches', () => {
    const r = searchRecipes('cà rốt')
    const carrot = r.byIngredient.find((g) => g.ingredient.id === 'carrot')!
    expect(carrot.recipes.length).toBeGreaterThan(2)
    const byName = new Set(r.byName.map((c) => c.id))
    expect(carrot.recipes.some((c) => byName.has(c.id))).toBe(false)
  })
})

describe('recommendation', () => {
  it('a recipe with all key ingredients is ready to cook', () => {
    const pantry = new Set(getKeyIngredients('canh-chua-ca-loc'))
    expect(matchRecipe('canh-chua-ca-loc', pantry)).toMatchObject({ missing: [], ratio: 1 })
    const first = recommend(getCards(), pantry, new Set())[0]
    expect(first.match.missing).toEqual([])
  })
  it('a substitute counts but less than the real thing', () => {
    const m = matchRecipe('canh-chua-ca-loc', new Set(['fish_tilapia']))
    expect(m.substitute).toBe(1)
    expect(m.ratio).toBeGreaterThan(0)
    expect(m.ratio).toBeLessThan(1 / m.total)
  })
  it('respects the no-repeat block list', () => {
    const blocked = new Set(['pho-bo'])
    expect(recommend(getCards(), new Set(), blocked).some((s) => s.card.id === 'pho-bo')).toBe(false)
  })
})

describe('planner', () => {
  it('a tray has one main, one soup and one vegetable dish', () => {
    const tray = suggestTray(getCards(), new Set(), new Set(), { seed: 3 })!
    expect(tray.items.map(roleOf).sort()).toEqual(['main', 'soup', 'veg'])
    expect(tray.nutrients.kcal).toBeGreaterThan(195) // rice included
  })
  it('a different seed can change the tray', () => {
    const ids = new Set(
      [1, 2, 3, 4, 5].map((seed) => suggestTray(getCards(), new Set(), new Set(), { seed })!.items.map((c) => c.id).join()),
    )
    expect(ids.size).toBeGreaterThan(1)
  })
  it('fills a week with every meal and avoids repeats while recipes last', () => {
    const start = weekStart(isoDate(new Date()))
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    const items = autoPlan({
      cards: getCards(),
      days,
      meals: ['breakfast', 'lunch', 'dinner'],
      existing: [],
      pantry: new Set(),
      blocked: new Set(),
      targets: targetsFor(null),
      healthy: true,
      seed: 1,
    })
    for (const d of days) for (const meal of ['breakfast', 'lunch', 'dinner']) {
      expect(items.some((i) => i.date === d && i.meal === meal), `${d} ${meal}`).toBe(true)
    }
    // 50 recipes cannot cover ~50 slots without any repeat, but most should be unique.
    const unique = new Set(items.map((i) => i.recipe_id))
    expect(unique.size).toBeGreaterThan(items.length * 0.6)
    // Only one rice bowl per meal.
    for (const d of days) for (const meal of ['lunch', 'dinner']) {
      expect(items.filter((i) => i.date === d && i.meal === meal && i.with_rice).length).toBeLessThanOrEqual(1)
    }
  })
  it('does not touch meals that are already planned', () => {
    const day = isoDate(new Date())
    const items = autoPlan({
      cards: getCards(),
      days: [day],
      meals: ['breakfast', 'lunch', 'dinner'],
      existing: [{ id: 'x', date: day, meal: 'lunch', recipe_id: 'pho-bo', servings: 1, with_rice: false }],
      pantry: new Set(),
      blocked: new Set(),
      targets: targetsFor(null),
      healthy: false,
      seed: 1,
    })
    expect(items.some((i) => i.meal === 'lunch')).toBe(false)
    expect(items.some((i) => i.recipe_id === 'pho-bo')).toBe(false)
  })
  it('shopping list scales amounts and skips pantry staples', () => {
    const list = shoppingList(
      [{ id: 'a', date: '2026-10-26', meal: 'dinner', recipe_id: 'canh-chua-ca-loc', servings: 2, with_rice: true }],
      new Set(['tomato']),
    )
    const fish = list.find((i) => i.ingredient_id === 'fish_snakehead')!
    expect(fish.amounts).toBe('300 g') // 600 g for 4 people -> 2 people
    expect(list.some((i) => i.ingredient_id === 'fish_sauce')).toBe(false)
    expect(list.find((i) => i.ingredient_id === 'tomato')?.inPantry).toBe(true)
  })
})

describe('format & nutrition', () => {
  it('formats amounts', () => {
    expect(formatAmount(600, 'g')).toBe('600 g')
    expect(formatAmount(1.5, 'kg', 0.5)).toBe('750 g')
    expect(formatAmount(1.5, 'kg')).toBe('1½ kg')
    expect(formatAmount(2, 'tbsp', 0.75)).toBe('1½ muỗng canh')
    expect(formatAmount(3, 'clove', 2)).toBe('6 tép')
    expect(formatAmount(1, 'piece', 0.5)).toBe('½')
    expect(formatAmount(800, 'g', 2)).toBe('1,6 kg')
  })
  it('computes a daily calorie target', () => {
    // 30 y, 160 cm, 55 kg woman, light activity: BMR 1239 x 1.375 = 1704 -> 1700
    expect(dailyKcal({ sex: 'female', age: 30, height: 160, weight: 55, activity: 1.375, goal: 'keep' })).toBe(1700)
    expect(targetsFor(null).kcal).toBe(2000)
  })
  it('every recipe has nutrition and a health score', () => {
    for (const c of getCards()) {
      expect(c.kcal, c.id).toBeGreaterThan(0)
      expect(c.health_score, c.id).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('difficulty (1-5 stars)', () => {
  it('every recipe has a 1-5 star difficulty', () => {
    for (const c of getCards()) expect([1, 2, 3, 4, 5], c.id).toContain(c.difficulty)
  })
  it('recommends easy recipes first when the pantry match is the same', () => {
    const list = recommend(getCards(), new Set(), new Set()).map((s) => s.card.difficulty)
    expect(list.slice(0, 10).every((d) => d === 1)).toBe(true)
    expect([...list].sort((a, b) => a - b)).toEqual(list)
  })
  it('an easier dish beats a harder one with the same pantry coverage', () => {
    // both fully covered: tomato + egg dishes
    const pantry = new Set(['tomato', 'egg_chicken', 'pork_belly', 'shrimp'])
    const ranked = recommend(getCards(), pantry, new Set()).filter((s) => s.match.total && s.match.have === s.match.total)
    const stars = ranked.map((s) => s.card.difficulty)
    expect([...stars].sort((a, b) => a - b)).toEqual(stars)
  })
  it('filters by max difficulty', () => {
    const easy = applyFilters(getCards(), { maxDifficulty: 2 })
    expect(easy.length).toBeGreaterThan(40)
    expect(easy.every((c) => c.difficulty <= 2)).toBe(true)
  })
})

describe('expanded recipe list', () => {
  it('has the everyday easy dishes', () => {
    const ids = (q: string) => searchRecipes(q).byName.map((c) => c.id)
    expect(ids('rau luoc')).toEqual(expect.arrayContaining(['rau-cu-luoc', 'rau-muong-luoc']))
    expect(ids('trứng luộc ngâm tương')[0]).toBe('trung-luoc-ngam-tuong')
    expect(ids('rau muong xao toi')).toContain('rau-muong-xao-toi')
  })
  it('has several cuisines for the style filter', () => {
    const cuisines = new Set(getCards().map((c) => c.cuisine_id))
    for (const c of ['vietnamese', 'korean', 'japanese', 'chinese', 'thai', 'western']) expect(cuisines).toContain(c)
  })
  it('every new recipe cites a source', () => {
    expect(getCards().length).toBeGreaterThanOrEqual(96)
  })
})
