'use client'

import { useRouter } from 'next/navigation'

/**
 * Goes back through real browser history (preserving state like the active
 * tab query param) when there's a prior page in this tab; falls back to a
 * fixed route for direct/deep-link entries with no history to unwind.
 */
export function useSmartBack(fallback: string) {
  const router = useRouter()
  return () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }
}
