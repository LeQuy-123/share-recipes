import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Shell } from '../src/App'
import en from '../src/i18n/en.json'
import vi from '../src/i18n/vi.json'
import { initI18n } from '../src/i18n'
import { formatAmount, formatMinutes } from '../src/lib/format'
import { actions } from '../src/store/user'
import { openTestDatabase } from './helpers'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
window.scrollTo = () => {}

/** Flatten nested keys; plural variants (_one/_other) count as their base key. */
function keys(obj: object, prefix = ''): Set<string> {
  const out = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix + k.replace(/_(one|other)$/, '')
    if (v && typeof v === 'object') keys(v, `${key}.`).forEach((x) => out.add(x))
    else out.add(key)
  }
  return out
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(f) ? [p] : []
  })
}

beforeAll(openTestDatabase)
afterAll(() => initI18n('vi'))

describe('translations', () => {
  const viKeys = keys(vi)
  const enKeys = keys(en)

  it('Vietnamese and English have the same keys', () => {
    expect([...viKeys].filter((k) => !enKeys.has(k))).toEqual([])
    expect([...enKeys].filter((k) => !viKeys.has(k))).toEqual([])
  })

  it('every static t("…") key used in the code exists', () => {
    const used = new Set<string>()
    for (const file of sourceFiles(resolve(process.cwd(), 'src'))) {
      for (const m of readFileSync(file, 'utf-8').matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g)) used.add(m[1])
    }
    expect(used.size).toBeGreaterThan(100)
    expect([...used].filter((k) => !viKeys.has(k))).toEqual([])
  })

  it('formats units and times in both languages', () => {
    initI18n('vi')
    expect(formatAmount(3, 'clove')).toBe('3 tép')
    expect(formatMinutes(75)).toBe('1 giờ 15 phút')
    initI18n('en')
    expect(formatAmount(3, 'clove')).toBe('3 cloves')
    expect(formatAmount(1, 'clove')).toBe('1 clove')
    expect(formatAmount(1.5, 'tbsp')).toBe('1½ tbsp')
    expect(formatMinutes(75)).toBe('1 h 15 min')
    initI18n('vi')
  })

  it('switching to English translates the screen and dish names', () => {
    actions.resetAll()
    actions.setSettings({ language: 'en' })
    initI18n('en')
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      window.history.pushState(null, '', '/recipe/canh-chua-ca-loc')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    act(() => root.render(<Shell />))
    const text = container.textContent ?? ''
    expect(text).toContain('Sweet and sour snakehead fish soup')
    expect(text).toContain('Start cooking')
    expect(text).toContain('Ingredients')
    expect(text).toContain('Recipe steps are in Vietnamese for now.')
    act(() => root.unmount())
    container.remove()
  })
})
