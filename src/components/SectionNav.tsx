'use client'

import { useRef } from 'react'
import { useScrollSpy } from '@/lib/useScrollSpy'

export interface SectionNavItem {
  id: string
  label: string
}

interface Props {
  items: SectionNavItem[]
  containerRef: React.RefObject<HTMLElement | null>
  action?: React.ReactNode
}

export default function SectionNav({ items, containerRef, action }: Props) {
  const ids = items.map(i => i.id)
  const activeId = useScrollSpy(ids, containerRef)

  function jumpTo(id: string) {
    const container = containerRef.current
    const el = document.getElementById(id)
    if (!container || !el) return
    container.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' })
  }

  return (
    <div className="section-nav">
      <div className="section-nav-label">On this page</div>
      {items.map(item => (
        <button
          key={item.id}
          className={`section-nav-item${activeId === item.id ? ' active' : ''}`}
          onClick={() => jumpTo(item.id)}
        >
          {item.label}
        </button>
      ))}
      {action && <div className="section-nav-action">{action}</div>}
    </div>
  )
}
