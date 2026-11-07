// Minimal hash router: "#/recipe/pho-bo?s=2" -> { path: ['recipe', 'pho-bo'], query }.
// Hash routing keeps the app working from any static host without server rewrites.
import { useEffect, useSyncExternalStore } from 'react'

export interface Route {
  path: string[]
  query: URLSearchParams
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '')
  const [pathPart, queryPart = ''] = raw.split('?')
  return {
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(queryPart),
  }
}

// Each history entry the app creates gets an index (0 = the page the visit started on), so
// "back" can stay inside the app instead of leaving to the site the person came from.
const entryIndex = (): number => (window.history.state as { idx?: number } | null)?.idx ?? -1
let lastIndex = 0
if (typeof window !== 'undefined') {
  if (entryIndex() < 0) window.history.replaceState({ idx: 0 }, '')
  lastIndex = entryIndex()
  window.addEventListener('hashchange', () => {
    // A new entry (link tap, location.hash) has no index yet; back/forward entries keep theirs.
    if (entryIndex() < 0) window.history.replaceState({ idx: lastIndex + 1 }, '')
    lastIndex = entryIndex()
  })
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  // New screen -> start at the top; filter changes (same path, new query) keep the scroll.
  const pathKey = hash.split('?')[0]
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathKey])
  return parse(hash)
}

export function href(path: string, query?: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== '') q.set(k, String(v))
  const qs = q.toString()
  return `#${path}${qs ? `?${qs}` : ''}`
}

export function navigate(path: string, query?: Record<string, string | number | null | undefined>, replace = false) {
  const target = href(path, query)
  if (replace) {
    window.history.replaceState({ idx: lastIndex }, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else window.location.hash = target
}

/** Back within the app; on the first screen of the visit (e.g. opened from a link), go to `fallback`. */
export function goBack(fallback = '/') {
  if (lastIndex > 0) window.history.back()
  else navigate(fallback, undefined, true)
}
