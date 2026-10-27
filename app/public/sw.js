// AutoRecipt offline support.
// install : cache everything listed in precache.json (app shell, database, icons) so the app
//           works offline from the first visit.
// fetch   : app files and the database -> network first, cache as fallback (updates arrive);
//           recipe photos (local and Wikimedia) -> cache first.
const SHELL = 'autorecipt-shell'
const IMAGES = 'autorecipt-img-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch('./precache.json', { cache: 'no-store' })
      if (res.ok) {
        const { files } = await res.json()
        const cache = await caches.open(SHELL)
        // Add one by one so a single missing file does not abort the install.
        await Promise.all(files.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => {})))
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (![SHELL, IMAGES].includes(key)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

const isImage = (url) => url.hostname.endsWith('wikimedia.org') || (url.origin === self.location.origin && url.pathname.includes('/img/'))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (isImage(url)) {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone())
        return res
      }),
    )
    return
  }

  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && !url.pathname.endsWith('db-version.json')) {
          const copy = res.clone()
          caches.open(SHELL).then((cache) => cache.put(req, copy))
        }
        return res
      })
      .catch(async () => (await caches.match(req, { ignoreSearch: true })) ?? (await caches.match('./')) ?? Response.error()),
  )
})
