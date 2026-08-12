'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { displayName } from '@/lib/format'

function initials(name: string, email: string | undefined): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  }
  return (email ?? '??').slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, bank, profile } = useApp()

  useEffect(() => {
    if (user) document.body.classList.add('logged-in')
    else document.body.classList.remove('logged-in')
  }, [user])

  const isHome = pathname === '/'
  const isBank = pathname === '/bank'
  const isProfile = pathname === '/profile'
  const isOffline = pathname === '/offline'

  return (
    <aside className="rail" id="rail">
      <span className="rail-brand">P</span>
      <button className={`rail-icon${isHome ? ' active' : ''}`} onClick={() => router.push('/')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span className="rail-tooltip">Campaigns</span>
      </button>
      <button className={`rail-icon${isBank ? ' active' : ''}`} onClick={() => router.push('/bank')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <span className="rail-tooltip">Story Bank{bank.length > 0 ? ` (${bank.length})` : ''}</span>
      </button>
      {/* Hard navigation, not the client router — must work offline via the
          service worker's page cache, with no dependency on a live RSC fetch. */}
      <a className={`rail-icon${isOffline ? ' active' : ''}`} href="/offline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20v-8m0 8-3-3m3 3 3-3M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
        </svg>
        <span className="rail-tooltip">Offline copy</span>
      </a>
      <button className={`rail-avatar${isProfile ? ' active' : ''}`} onClick={() => router.push('/profile')}>
        {initials(displayName(profile), user?.email)}
      </button>
    </aside>
  )
}
