'use client'

import { useEffect, useState } from 'react'
import { subscribeToasts, getToasts, dismissToast } from '@/lib/toastStore'

export default function ToastHost() {
  const [toasts, setToasts] = useState(getToasts)

  useEffect(() => subscribeToasts(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismissToast(t.id)}>
          {t.kind === 'info' ? '✓ ' : ''}{t.message}
        </div>
      ))}
    </div>
  )
}
