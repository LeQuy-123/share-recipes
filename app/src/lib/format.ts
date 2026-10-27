import { currentLang, t } from '../i18n'

const FRACTIONS: [number, string][] = [
  [0.25, '¼'],
  [1 / 3, '⅓'],
  [0.5, '½'],
  [2 / 3, '⅔'],
  [0.75, '¾'],
]

/** 0.5 -> "½", 1.25 -> "1¼", 2.4 -> "2,4" (vi) / "2.4" (en), 120 -> "120" */
export function formatNumber(v: number): string {
  if (v >= 20) return String(Math.round(v))
  const whole = Math.floor(v)
  const frac = v - whole
  if (frac < 0.05) return String(whole)
  if (frac > 0.95) return String(whole + 1)
  for (const [f, s] of FRACTIONS) if (Math.abs(frac - f) < 0.05) return whole ? `${whole}${s}` : s
  const text = v.toFixed(1)
  return currentLang() === 'vi' ? text.replace('.', ',') : text
}

const roundTo = (v: number, step: number) => Math.max(step, Math.round(v / step) * step)

/** Amount of a recipe line after scaling, e.g. "600 g", "1½ muỗng canh" / "1½ tbsp", "3 tép" / "3 cloves". */
export function formatAmount(amount: number | null, unit: string | null, scale = 1): string {
  if (amount === null || amount === undefined) return ''
  let v = amount * scale
  let u = unit ?? ''
  if (u === 'kg' && v < 1) {
    v *= 1000
    u = 'g'
  }
  if ((u === 'g' || u === 'ml') && v >= 1000) return `${formatNumber(v / 1000)} ${u === 'g' ? 'kg' : t('unit.l')}`
  if (u === 'g' || u === 'ml') return `${v >= 100 ? roundTo(v, 10) : roundTo(v, v >= 20 ? 5 : 1)} ${u}`
  if (u === 'tbsp' || u === 'tsp') v = roundTo(v, 0.25)
  else if (u !== 'kg') v = roundTo(v, 0.5)
  if (!u || u === 'piece') return formatNumber(v)
  const label = t(`unit.${u}`, { count: v > 1 ? 2 : 1 })
  return `${formatNumber(v)} ${label}`
}

export function formatMinutes(min: number): string {
  if (min < 60) return t('time.min', { count: min })
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? t('time.hm', { h, m }) : t('time.h', { h })
}

/** Difficulty label by star count (1-5), same levels as the difficulty_levels table. */
export const difficultyLabel = (stars: number) => t(`difficulty.${stars}`)

export const mealLabel = (meal: string) => t(`meal.${meal}`)

/** Local date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  const d = parseDate(iso)
  const shift = (d.getDay() + 6) % 7
  return addDays(iso, -shift)
}

export function weekdayShort(iso: string): string {
  return t(`weekday.short.${parseDate(iso).getDay()}`)
}

/** "Hôm nay", "Ngày mai", or "Thứ 4, 29/10" / "Wed 10/29" */
export function formatDate(iso: string): string {
  const today = isoDate(new Date())
  if (iso === today) return t('date.today')
  if (iso === addDays(today, 1)) return t('date.tomorrow')
  if (iso === addDays(today, -1)) return t('date.yesterday')
  const d = parseDate(iso)
  return t('date.weekdayDate', { weekday: t(`weekday.long.${d.getDay()}`), d: d.getDate(), m: d.getMonth() + 1 })
}

/** "26/10" (vi) or "10/26" (en) */
export function formatDayMonth(iso: string): string {
  const d = parseDate(iso)
  return t('date.dayMonth', { d: d.getDate(), m: d.getMonth() + 1 })
}

export function timeAgo(isoTime: string): string {
  const days = Math.floor((Date.now() - Date.parse(isoTime)) / 86_400_000)
  if (days <= 0) return t('date.today')
  if (days === 1) return t('date.yesterday')
  if (days < 30) return t('date.daysAgo', { count: days })
  return new Date(isoTime).toLocaleDateString(currentLang() === 'vi' ? 'vi-VN' : 'en-US')
}

/** Meal that fits the current time of day. */
export function currentMeal(): 'breakfast' | 'lunch' | 'dinner' {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 15) return 'lunch'
  return 'dinner'
}
