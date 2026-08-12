import type { Campaign, Story } from './types'

const KEY = 'pitch_offline_snapshot_v1'

export interface OfflineSnapshot {
  camps: Campaign[]
  bank: Story[]
  savedAt: string
}

export function saveOfflineSnapshot(camps: Campaign[], bank: Story[]) {
  if (typeof window === 'undefined') return
  try {
    const snapshot: OfflineSnapshot = { camps, bank, savedAt: new Date().toISOString() }
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // storage full/unavailable — offline copy just won't be fresh, not fatal
  }
}

export function readOfflineSnapshot(): OfflineSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as OfflineSnapshot) : null
  } catch {
    return null
  }
}
