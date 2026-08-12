const STATIC_CACHE = 'pitch-static-v1'
const PAGE_CACHE = 'pitch-pages-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== PAGE_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/apple-touch-icon')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request, { ignoreVary: true })
        if (cached) return cached
        try {
          const res = await fetch(request)
          if (res.ok) cache.put(request, res.clone())
          return res
        } catch (err) {
          if (cached) return cached
          throw err
        }
      })
    )
    return
  }

  event.respondWith(
    caches.open(PAGE_CACHE).then(async (cache) => {
      try {
        const res = await fetch(request)
        if (res.ok) cache.put(request, res.clone())
        return res
      } catch (err) {
        // A failed navigation while offline may be requesting a different
        // "shape" of this URL (e.g. a client-router data fetch) than what
        // got cached — ignoreVary matches on URL alone so a fallback is
        // still found instead of failing outright.
        const cached = await cache.match(request, { ignoreVary: true })
        if (cached) return cached
        throw err
      }
    })
  )
})
