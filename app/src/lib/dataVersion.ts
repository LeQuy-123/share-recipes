// Notices when a newer recipe database has been published (by the admin app or a deploy)
// while this page is open, by polling public/db-version.json.
import { useEffect, useState } from 'react'

const URL = `${import.meta.env.BASE_URL}db-version.json`
const EVERY_MS = 60_000

async function fetchVersion(): Promise<string | null> {
  try {
    const res = await fetch(URL, { cache: 'no-store' })
    if (!res.ok) return null
    return ((await res.json()) as { built_at?: string }).built_at ?? null
  } catch {
    return null
  }
}

/** true once the published database differs from the one this page loaded. */
export function useNewDataAvailable(): boolean {
  const [loaded, setLoaded] = useState<string | null>(null)
  const [latest, setLatest] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchVersion().then((v) => {
      if (alive) {
        setLoaded(v)
        setLatest(v)
      }
    })
    const check = () => fetchVersion().then((v) => alive && v && setLatest(v))
    const timer = window.setInterval(check, EVERY_MS)
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return !!loaded && !!latest && loaded !== latest
}
