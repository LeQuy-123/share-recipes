import type { RecipeCard } from '../db/catalog'
import type { Profile } from '../store/user'

export interface Nutrients {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  veg_g: number
}

export const ZERO: Nutrients = { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, veg_g: 0 }

/** One bowl (chén) of cooked white rice, about 150 g. */
export const RICE_BOWL: Nutrients = { kcal: 195, protein_g: 4, fat_g: 0.4, carbs_g: 42, fiber_g: 0.6, veg_g: 0 }

/** Dishes Vietnamese families normally eat with rice. */
const WITH_RICE = new Set(['soup', 'braise', 'simmer', 'stir_fry', 'fried', 'grilled', 'steamed', 'boiled', 'stew', 'vegetable', 'dip'])

export function eatenWithRice(card: RecipeCard): boolean {
  return !!card.dish_type_id && WITH_RICE.has(card.dish_type_id)
}

export function add(a: Nutrients, b: Nutrients, times = 1): Nutrients {
  return {
    kcal: a.kcal + b.kcal * times,
    protein_g: a.protein_g + b.protein_g * times,
    fat_g: a.fat_g + b.fat_g * times,
    carbs_g: a.carbs_g + b.carbs_g * times,
    fiber_g: a.fiber_g + b.fiber_g * times,
    veg_g: a.veg_g + b.veg_g * times,
  }
}

export function cardNutrients(card: RecipeCard): Nutrients {
  return {
    kcal: card.kcal ?? 0,
    protein_g: card.protein_g ?? 0,
    fat_g: card.fat_g ?? 0,
    carbs_g: card.carbs_g ?? 0,
    fiber_g: card.fiber_g ?? 0,
    veg_g: card.veg_g ?? 0,
  }
}

export interface Targets {
  kcal: number
  protein_g: number
  fat_g: number
  carbs_g: number
  fiber_g: number
  veg_g: number
}

// Energy split for an adult, in line with the Vietnamese National Institute of Nutrition:
// protein 13-20 %, fat 20-30 %, carbohydrate 55-65 %. Targets use the middle of each range.
export const MACRO_RANGES = {
  protein: [0.13, 0.2],
  fat: [0.2, 0.3],
  carbs: [0.55, 0.65],
} as const

/** Activity multipliers; labels are i18n keys profile.activity.<value> */
export const ACTIVITY_LEVELS = [1.2, 1.375, 1.55, 1.725]

/** Mifflin-St Jeor BMR x activity, adjusted for the goal. */
export function dailyKcal(p: Profile): number {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  const adjust = p.goal === 'lose' ? -400 : p.goal === 'gain' ? 300 : 0
  return Math.round((bmr * p.activity + adjust) / 10) * 10
}

export function targetsFor(profile: Profile | null): Targets {
  const kcal = profile ? dailyKcal(profile) : 2000
  return {
    kcal,
    protein_g: Math.round((kcal * 0.17) / 4),
    fat_g: Math.round((kcal * 0.25) / 9),
    carbs_g: Math.round((kcal * 0.58) / 4),
    fiber_g: 25,
    veg_g: 300,
  }
}

export function bmi(p: Profile): number {
  return p.weight / (p.height / 100) ** 2
}

/** i18n key under "bmi." — Asian cut-offs (WHO 2004) */
export function bmiKey(v: number): string {
  if (v < 18.5) return 'under'
  if (v < 23) return 'normal'
  if (v < 25) return 'over'
  return 'obese'
}

export interface Shares {
  protein: number
  fat: number
  carbs: number
}

export function energyShares(n: Nutrients): Shares {
  const total = n.protein_g * 4 + n.fat_g * 9 + n.carbs_g * 4 || 1
  return { protein: (n.protein_g * 4) / total, fat: (n.fat_g * 9) / total, carbs: (n.carbs_g * 4) / total }
}

export interface Advice {
  level: 'good' | 'warn'
  /** i18n key under "advice." with its parameters */
  key: string
  params?: Record<string, number>
}

/** Short advice for one day's plan compared with the targets. */
export function adviseDay(n: Nutrients, t: Targets): Advice[] {
  if (n.kcal === 0) return []
  const out: Advice[] = []
  const ratio = n.kcal / t.kcal
  if (ratio > 1.1) out.push({ level: 'warn', key: 'over', params: { kcal: Math.round(n.kcal - t.kcal) } })
  else if (ratio < 0.8) out.push({ level: 'warn', key: 'under', params: { kcal: Math.round(t.kcal - n.kcal) } })
  else out.push({ level: 'good', key: 'ok' })

  const s = energyShares(n)
  if (s.protein < MACRO_RANGES.protein[0]) out.push({ level: 'warn', key: 'lowProtein' })
  if (s.fat > MACRO_RANGES.fat[1]) out.push({ level: 'warn', key: 'highFat' })
  if (s.carbs > MACRO_RANGES.carbs[1]) out.push({ level: 'warn', key: 'highCarbs' })
  if (n.veg_g < t.veg_g * 0.7) out.push({ level: 'warn', key: 'lowVeg' })
  if (out.length === 1 && out[0].level === 'good') out.push({ level: 'good', key: 'balanced' })
  return out
}
