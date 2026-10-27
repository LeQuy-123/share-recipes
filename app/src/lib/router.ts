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
  if (replace) window.history.replaceState(null, '', target)
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
  else window.location.hash = target
}

export function goBack(fallback = '/') {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback)
}
