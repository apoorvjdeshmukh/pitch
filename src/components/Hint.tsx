'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY_PREFIX = 'pitch_hint_seen_'

function isSeen(id: string): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(SEEN_KEY_PREFIX + id) === '1'
}

function markSeen(id: string) {
  localStorage.setItem(SEEN_KEY_PREFIX + id, '1')
}

interface HintProps {
  /** Stable, unique id — used as the localStorage key deciding whether this hint has been dismissed. */
  id: string
  text: string
  /** 'block' for full-width targets that already stack vertically (most cases); 'inline' for a target sitting in a horizontal row of auto-width siblings. */
  mode?: 'block' | 'inline'
  /** Which edge the balloon hangs from — flip to 'right' when the anchor sits near the right edge of the viewport. */
  align?: 'left' | 'right'
  children: React.ReactNode
}

export default function Hint({ id, text, mode = 'block', align = 'left', children }: HintProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isSeen(id)) setVisible(true)
  }, [id])

  function dismiss() {
    markSeen(id)
    setVisible(false)
  }

  const Wrapper = mode === 'block' ? 'div' : 'span'

  return (
    <Wrapper className={`hint-anchor hint-anchor-${mode}`}>
      {children}
      {visible && <span className="hint-dot" aria-hidden="true" />}
      {visible && (
        <div className={`hint-balloon hint-align-${align}`}>
          <p>{text}</p>
          <button className="hint-dismiss" onClick={dismiss}>Got it</button>
        </div>
      )}
    </Wrapper>
  )
}
