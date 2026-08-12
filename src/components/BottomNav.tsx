'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { bank } = useApp()

  const isHome = pathname === '/'
  const isBank = pathname === '/bank'
  const isProfile = pathname === '/profile'

  return (
    <nav className="bottom-nav">
      <button className={`bottom-nav-item${isHome ? ' active' : ''}`} onClick={() => router.push('/')}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span>Pipeline</span>
      </button>
      <button className={`bottom-nav-item${isBank ? ' active' : ''}`} onClick={() => router.push('/bank')}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <span>Bank{bank.length > 0 ? ` (${bank.length})` : ''}</span>
      </button>
      <button className={`bottom-nav-item${isProfile ? ' active' : ''}`} onClick={() => router.push('/profile')}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span>Profile</span>
      </button>
    </nav>
  )
}
