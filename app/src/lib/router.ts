// Minimal path router: "/recipe/pho-bo?s=2" -> { path: ['recipe', 'pho-bo'], query }.
// Real paths (not "#/…") so every recipe and ingredient has its own URL that search engines and
// link previews can read; the build writes a static page with its own <head> for each one, and
// vercel.json sends every other path to index.html.
import { useEffect, useSyncExternalStore } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
}

function parse(location: string): Route {
  const [pathPart, queryPart = ''] = location.split('?')
  return {
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(queryPart),
  }
}

const current = () => window.location.pathname + window.location.search
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// Each history entry the app creates gets an index (0 = the page the visit started on), so
// "back" can stay inside the app instead of leaving to the site the person came from.
const entryIndex = (): number => (window.history.state as { idx?: number } | null)?.idx ?? -1
let lastIndex = 0

if (typeof window !== 'undefined') {
  // Links from before the switch to paths ("…/#/recipe/pho-bo") still open the right screen.
  if (window.location.hash.startsWith('#/')) window.history.replaceState(null, '', window.location.hash.slice(1))
  if (entryIndex() < 0) window.history.replaceState({ idx: 0 }, '')
  lastIndex = entryIndex()
  window.addEventListener('popstate', () => {
    lastIndex = Math.max(0, entryIndex())
    emit()
  })
  // In-app links are plain <a href="/…">: open them without a page load. New-tab clicks,
  // downloads, external links and files (sitemap.xml, photos) are left to the browser.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = (e.target as Element | null)?.closest?.('a')
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const url = new URL(a.href, window.location.href)
    if (url.origin !== window.location.origin || /\.[a-z0-9]+$/i.test(url.pathname)) return
    e.preventDefault()
    if (url.pathname + url.search !== current()) go(url.pathname + url.search, false)
  })
}

function go(target: string, replace: boolean) {
  if (replace) window.history.replaceState({ idx: lastIndex }, '', target)
  else {
    lastIndex += 1
    window.history.pushState({ idx: lastIndex }, '', target)
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRoute(): Route {
  const location = useSyncExternalStore(subscribe, current)
  // New screen -> start at the top; filter changes (same path, new query) keep the scroll.
  const pathKey = location.split('?')[0]
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathKey])
  return parse(location)
}

export function href(path: string, query?: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== '') q.set(k, String(v))
  const qs = q.toString()
  return `${path}${qs ? `?${qs}` : ''}`
}

export function navigate(path: string, query?: Record<string, string | number | null | undefined>, replace = false) {
  go(href(path, query), replace)
}

/** Back within the app; on the first screen of the visit (e.g. opened from a link), go to `fallback`. */
export function goBack(fallback = '/') {
  if (lastIndex > 0) window.history.back()
  else navigate(fallback, undefined, true)
}
