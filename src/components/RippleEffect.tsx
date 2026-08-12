'use client'

import { useEffect, useRef } from 'react'

// Ripples render into this dedicated portal instead of as a child of the
// clicked button. Appending directly into a button's DOM (the old approach)
// collides with React's own reconciliation of that button on its next
// re-render - it caused both hydration mismatches and stray removeChild
// errors whenever a ripple was mid-animation when React updated the button.
export default function RippleEffect() {
  const portalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = (e.target as HTMLElement | null)?.closest('button') as HTMLButtonElement | null
      if (!target || target.disabled || !portalRef.current) return
      const rect = target.getBoundingClientRect()
      const cs = getComputedStyle(target)
      const size = Math.max(rect.width, rect.height)

      const clip = document.createElement('span')
      clip.style.cssText = `position:fixed; left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px; border-radius:${cs.borderRadius}; overflow:hidden; pointer-events:none;`

      const dot = document.createElement('span')
      dot.className = 'rip'
      dot.style.width = dot.style.height = `${size}px`
      dot.style.left = `${e.clientX - rect.left - size / 2}px`
      dot.style.top = `${e.clientY - rect.top - size / 2}px`
      dot.style.color = cs.color

      clip.appendChild(dot)
      portalRef.current.appendChild(clip)
      dot.addEventListener('animationend', () => clip.remove())
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return <div ref={portalRef} className="ripple-portal" />
}
