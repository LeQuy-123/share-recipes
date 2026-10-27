import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

/** "#/recipes/pho-bo" -> ['recipes', 'pho-bo'] */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash)
  return hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent)
}

export const go = (path: string) => {
  window.location.hash = `#${path}`
}

/** Where the main app runs in dev (`npm run dev` in app/). */
export const MAIN_APP = 'http://localhost:5173/'
