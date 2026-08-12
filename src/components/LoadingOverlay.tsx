'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeLoading, getLoadingState } from '@/lib/loadingStore'
import { formatStreamPreview } from '@/lib/format'

export default function LoadingOverlay() {
  const [state, setState] = useState(getLoadingState)
  const [elapsed, setElapsed] = useState(0)
  const streamRef = useRef<HTMLPreElement>(null)

  useEffect(() => subscribeLoading(setState), [])

  useEffect(() => {
    if (!state.visible) return
    setElapsed(0)
    const id = setInterval(() => setElapsed(Date.now() - state.startedAt), 100)
    return () => clearInterval(id)
  }, [state.visible, state.startedAt])

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [state.streamText])

  if (!state.visible) return null

  return (
    <div className="loading-overlay show">
      <div className="spinner" />
      <p className="loading-msg">{state.message}</p>
      <p className="loading-elapsed">{(elapsed / 1000).toFixed(1)}s</p>
      {state.streamText && (
        <pre className="loading-stream" ref={streamRef}>{formatStreamPreview(state.streamText)}</pre>
      )}
    </div>
  )
}
