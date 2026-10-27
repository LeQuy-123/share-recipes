// The user's own data: pantry, cooking history, favorites, meal plan, settings, profile.
// Kept in localStorage on this device (the catalog database is read-only).
import { useSyncExternalStore } from 'react'
import { detectLang, type Lang } from '../i18n'

export type PantrySource = 'manual' | 'photo' | 'fridge_scan' | 'receipt' | 'barcode' | 'cloud_scan'
export type PlanMeal = 'breakfast' | 'lunch' | 'dinner'

export interface PantryItem {
  id: string
  source: PantrySource
  added_at: string
}

export interface CookedEvent {
  recipe_id: string
  at: string
}

export interface PlanItem {
  id: string
  date: string // YYYY-MM-DD
  meal: PlanMeal
  recipe_id: string
  servings: number
  with_rice: boolean
}

export interface Settings {
  no_repeat_enabled: boolean
  no_repeat_days: number
  cloud_scan_enabled: boolean
  /** interface language; recipe data shows name_en in English when it exists */
  language: Lang
  /** 'system' follows the device's light/dark setting */
  theme: Theme
}

export type Theme = 'system' | 'light' | 'dark'

export interface Profile {
  sex: 'male' | 'female'
  age: number
  weight: number
  height: number
  activity: number
  goal: 'lose' | 'keep' | 'gain'
}

export interface UserData {
  version: 1
  pantry: PantryItem[]
  cooked: CookedEvent[]
  favorites: string[]
  plan: PlanItem[]
  settings: Settings
  profile: Profile | null
}

const KEY = 'autorecipt.user.v1'

const EMPTY: UserData = {
  version: 1,
  pantry: [],
  cooked: [],
  favorites: [],
  plan: [],
  settings: { no_repeat_enabled: false, no_repeat_days: 7, cloud_scan_enabled: false, language: detectLang(), theme: 'system' },
  profile: null,
}

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<UserData>
    return { ...EMPTY, ...parsed, settings: { ...EMPTY.settings, ...parsed.settings } }
  } catch {
    return EMPTY
  }
}

let state: UserData = load()
const listeners = new Set<() => void>()

function update(fn: (s: UserData) => UserData) {
  state = fn(state)
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage blocked or full: keep working in memory for this session.
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useUser(): UserData {
  return useSyncExternalStore(subscribe, () => state)
}

export const getUser = () => state

const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10)

export const actions = {
  addToPantry(ids: string[], source: PantrySource = 'manual') {
    update((s) => {
      const have = new Set(s.pantry.map((p) => p.id))
      const added = ids.filter((id) => !have.has(id)).map((id) => ({ id, source, added_at: now() }))
      return added.length ? { ...s, pantry: [...added, ...s.pantry] } : s
    })
  },
  removeFromPantry(ids: string[]) {
    const drop = new Set(ids)
    update((s) => ({ ...s, pantry: s.pantry.filter((p) => !drop.has(p.id)) }))
  },
  togglePantry(id: string) {
    if (state.pantry.some((p) => p.id === id)) actions.removeFromPantry([id])
    else actions.addToPantry([id])
  },
  clearPantry() {
    update((s) => ({ ...s, pantry: [] }))
  },
  markCooked(recipeId: string) {
    update((s) => ({ ...s, cooked: [{ recipe_id: recipeId, at: now() }, ...s.cooked].slice(0, 500) }))
  },
  removeCooked(at: string) {
    update((s) => ({ ...s, cooked: s.cooked.filter((c) => c.at !== at) }))
  },
  toggleFavorite(recipeId: string) {
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(recipeId)
        ? s.favorites.filter((f) => f !== recipeId)
        : [recipeId, ...s.favorites],
    }))
  },
  addToPlan(items: Omit<PlanItem, 'id'>[]) {
    update((s) => ({ ...s, plan: [...s.plan, ...items.map((i) => ({ ...i, id: uid() }))] }))
  },
  updatePlanItem(id: string, patch: Partial<Omit<PlanItem, 'id'>>) {
    update((s) => ({ ...s, plan: s.plan.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  },
  removePlanItem(id: string) {
    update((s) => ({ ...s, plan: s.plan.filter((p) => p.id !== id) }))
  },
  clearPlanDays(dates: string[]) {
    const drop = new Set(dates)
    update((s) => ({ ...s, plan: s.plan.filter((p) => !drop.has(p.date)) }))
  },
  setSettings(patch: Partial<Settings>) {
    update((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  },
  setProfile(profile: Profile | null) {
    update((s) => ({ ...s, profile }))
  },
  replaceAll(data: UserData) {
    update(() => ({ ...EMPTY, ...data, settings: { ...EMPTY.settings, ...data.settings } }))
  },
  resetAll() {
    update(() => EMPTY)
  },
}

/** Recipes cooked within the last `days` days. */
export function recentlyCooked(user: UserData, days: number): Map<string, string> {
  const since = Date.now() - days * 86_400_000
  const result = new Map<string, string>()
  for (const c of user.cooked) {
    if (Date.parse(c.at) >= since && !result.has(c.recipe_id)) result.set(c.recipe_id, c.at)
  }
  return result
}

/** Recipes the no-repeat setting hides from suggestions right now. */
export function blockedByNoRepeat(user: UserData): Set<string> {
  if (!user.settings.no_repeat_enabled) return new Set()
  return new Set(recentlyCooked(user, user.settings.no_repeat_days).keys())
}
