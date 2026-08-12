'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // A registered SW cache-serves stale /_next/static chunks across
      // Turbopack rebuilds (cache-first in sw.js), hydrating the client
      // against old JS while the dev server sends fresh HTML. Unregister
      // and clear any caches left over from a previous production-mode
      // run instead of registering here.
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()))
      if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])
  return null
}
