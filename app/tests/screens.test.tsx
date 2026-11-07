import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Shell } from '../src/App'
import { actions, getUser } from '../src/store/user'
import { openTestDatabase } from './helpers'

// React needs this flag to run act() outside a test renderer.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
window.scrollTo = () => {}

let root: Root
let container: HTMLDivElement

beforeAll(openTestDatabase)
beforeEach(() => {
  actions.resetAll()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function show(path: string) {
  act(() => {
    window.history.pushState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
  act(() => root.render(<Shell />))
  return container
}

function click(text: string) {
  const el = [...container.querySelectorAll('button, a')].find((b) => b.textContent?.includes(text)) as HTMLElement | undefined
  if (!el) throw new Error(`No button "${text}" in: ${container.textContent?.slice(0, 300)}`)
  act(() => el.click())
}

describe('screens render', () => {
  it.each([
    ['/', 'Hôm nay ăn gì?'],
    ['/pantry', 'Nhà bạn đang có gì?'],
    ['/explore', 'Lành mạnh nhất'],
    ['/explore?q=bo', 'Bò kho'],
    ['/explore?healthy=1&dish=soup', 'Canh chua cá lóc'],
    ['/recipe/canh-chua-ca-loc', 'Các bước'],
    ['/ingredient/pork_belly', 'Cách sơ chế'],
    ['/plan', 'Thực đơn tuần'],
    ['/profile', 'Mục tiêu & cài đặt'],
    ['/recipe/does-not-exist', 'Không tìm thấy món này'],
  ])('%s', (path, text) => {
    expect(show(path).textContent).toContain(text)
  })
})

describe('flows', () => {
  it('pantry items drive "Nấu được ngay"', () => {
    // Home starts on the current meal; at dinner time the soup is a fit whatever the real clock says.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 5, 18, 0))
    actions.addToPantry(['fish_snakehead', 'tamarind', 'pineapple', 'tomato', 'bean_sprouts'])
    const home = show('/')
    expect(home.textContent).toContain('Nấu được ngay')
    expect(home.textContent).toContain('Canh chua cá lóc')
    vi.useRealTimers()
  })

  it('recipe servings scale the amounts', () => {
    show('/recipe/canh-chua-ca-loc')
    expect(container.textContent).toContain('600 g')
    act(() => (container.querySelector('[aria-label="Giảm"]') as HTMLButtonElement).click())
    expect(container.textContent).toContain('450 g') // 4 -> 3 people
  })

  it('cook mode walks every step and records the dish as cooked', () => {
    show('/cook/canh-chua-ca-loc?s=2')
    expect(container.textContent).toContain('Bước 1/7')
    expect(container.textContent).toContain('300 g') // 2 people
    for (let i = 0; i < 6; i++) click('Tiếp')
    expect(container.textContent).toContain('Bước 7/7')
    click('Xong')
    expect(container.textContent).toContain('Xong rồi!')
    click('Lưu: đã nấu món này')
    expect(getUser().cooked[0].recipe_id).toBe('canh-chua-ca-loc')
  })

  it('no-repeat hides a dish cooked recently', () => {
    actions.markCooked('pho-bo')
    actions.setSettings({ no_repeat_enabled: true, no_repeat_days: 7 })
    const home = show('/')
    expect(home.textContent).toContain('Ẩn 1 món đã nấu')
  })

  it('auto plan fills the week and the shopping list has items', () => {
    show('/plan')
    click('Tự lên thực đơn')
    expect(getUser().plan.length).toBeGreaterThan(10)
    expect(container.textContent).toMatch(/\d+ \/ 2000 kcal/)
    click('Đi chợ')
    expect(container.textContent).toContain('Danh sách đi chợ')
    expect(container.querySelectorAll('.shop-list li').length).toBeGreaterThan(5)
  })

  it('profile sets the calorie target used by the plan', () => {
    show('/profile')
    click('Tính mục tiêu calo')
    expect(getUser().profile).not.toBeNull()
    expect(container.textContent).toContain('1700')
    show('/plan')
    expect(container.textContent).toContain('/ 1700 kcal')
  })
})

describe('difficulty in the UI', () => {
  it('cards show stars and Explore filters by max stars', () => {
    const page = show('/explore?diff=1')
    const stars = [...page.querySelectorAll('.rcard .stars')].map((s) => s.getAttribute('aria-label'))
    expect(stars.length).toBeGreaterThan(10)
    expect(stars.every((s) => s === 'Độ khó: Rất dễ')).toBe(true)
  })
  it('the recipe page explains the difficulty level', () => {
    expect(show('/recipe/pho-bo').textContent).toContain('Rất khó')
    expect(show('/recipe/rau-cu-luoc').textContent).toContain('Rất dễ')
  })
  it('Explore can filter a non-Vietnamese cuisine', () => {
    expect(show('/explore?cuisine=korean').textContent).toContain('Tokbokki')
  })
})

describe('landing page', () => {
  it('explains the app with live counts, cuisines and a way in', () => {
    const page = show('/welcome')
    expect(page.textContent).toContain('Tủ lạnh có gì, nấu ngay món đó')
    expect(page.querySelector('.tabbar')).toBeNull()
    const stats = page.querySelector('.landing-stats')?.textContent ?? ''
    expect(Number(stats.match(/(\d+) món ăn/)?.[1])).toBeGreaterThan(200)
    expect(page.querySelectorAll('.photo-wall img').length).toBeGreaterThan(10)
    expect(page.querySelectorAll('.landing-steps li').length).toBe(3)
    expect(page.querySelector('.app-version')?.textContent).toMatch(/^v\d+\.\d+\.\d+/)
    expect(page.querySelectorAll('.cuisine-tile').length).toBeGreaterThanOrEqual(3)
  })
  it('the call to action remembers the visit and opens the pantry', () => {
    show('/welcome')
    click('Nhập nguyên liệu')
    expect(getUser().settings.welcomed).toBe(true)
    expect(window.location.pathname).toBe('/pantry')
  })
  it('Profile links back to the landing page', () => {
    const link = show('/profile').querySelector('a[href="/welcome"]')
    expect(link?.textContent).toContain('Giới thiệu')
  })
})

describe('cuisines', () => {
  it('Explore lists each cuisine with its dish count and a rail for the big ones', () => {
    const page = show('/explore')
    const tiles = [...page.querySelectorAll('.cuisine-tile')].map((a) => a.textContent ?? '')
    for (const name of ['Món Việt', 'Món Hàn', 'Món Nhật']) {
      const tile = tiles.find((t) => t.includes(name))
      expect(tile).toBeDefined()
      expect(Number(tile!.match(/(\d+) món/)?.[1])).toBeGreaterThanOrEqual(50)
    }
    expect(page.textContent).toContain('Món Hàn dễ làm')
    expect(page.textContent).toContain('Món Nhật dễ làm')
  })
  it('a cuisine tile opens only that cuisine, titled by its name', () => {
    show('/explore')
    click('Món Nhật')
    expect(container.querySelector('.section-title')?.textContent).toContain('Món Nhật')
    expect(container.textContent).toContain('Cơm cà ri Nhật')
    expect(container.textContent).toContain('Súp miso đậu hũ')
    expect(container.textContent).not.toContain('Canh kim chi')
  })
})
