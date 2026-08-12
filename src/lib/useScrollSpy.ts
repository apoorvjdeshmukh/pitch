'use client'

import { useEffect, useState } from 'react'

// Tracks which of the given section ids is nearest the top of its scroll
// container. Sections are considered "active" as they cross a line 15% down
// from the container's top edge, so the heading you'd actually be reading
// is the one that lights up.
export function useScrollSpy(ids: string[], containerRef: React.RefObject<HTMLElement | null>): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    const root = containerRef.current
    if (!root || ids.length === 0) return

    const elements = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el)
    if (elements.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        if (visible.size > 0) {
          const first = ids.find(id => visible.has(id))
          if (first) setActiveId(first)
        }
      },
      { root, rootMargin: '-15% 0px -80% 0px', threshold: 0 },
    )
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), containerRef.current])

  return activeId
}
