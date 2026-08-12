'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import type { Campaign, Story, Profile } from '@/lib/types'
import { ROUND_COMP } from '@/lib/constants'
import { saveOfflineSnapshot } from '@/lib/offlineSnapshot'
import { showToast } from '@/lib/toastStore'

interface AppContextValue {
  user: User | null
  camps: Campaign[]
  bank: Story[]
  background: string
  setBackground: (text: string) => Promise<void>
  profile: Profile
  setProfile: (patch: Partial<Profile>) => Promise<void>
  dataLoaded: boolean
  persistCamp: (camp: Campaign) => Promise<void>
  removeCamp: (id: string) => Promise<void>
  mutateCamp: (id: string, fn: (c: Campaign) => void) => Promise<void>
  mutateRound: (cId: string, rId: string, fn: (r: Campaign['rounds'][number]) => void) => Promise<void>
  addStory: (story: Story) => Promise<void>
  updateStory: (story: Story) => Promise<void>
  deleteStory: (id: string) => Promise<void>
  getCampaign: (id: string) => Campaign | null
  getRound: (cId: string, rId: string) => Campaign['rounds'][number] | null
  getMatchedStories: (roundType: string) => Story[]
  getGaps: (roundType: string) => string[]
  uid: () => string
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [camps, setCamps] = useState<Campaign[]>([])
  const [bank, setBank] = useState<Story[]>([])
  const [profileRow, setProfileRow] = useState<Profile | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const sb = createClient()

  const loadData = useCallback(async (authUser: User) => {
    const [{ data: campRows }, { data: storyRows }, { data: profileRows }] = await Promise.all([
      sb.from('campaigns').select('data').order('created_at', { ascending: false }),
      sb.from('stories').select('data').order('created_at', { ascending: false }),
      sb.from('profiles').select('data'),
    ])
    const real = (campRows ?? []).map((r: { data: Campaign }) => ({ ...r.data, active: r.data.active ?? true }))
    setCamps(real)
    const bankData = (storyRows ?? []).map((r: { data: Story }) => r.data)
    setBank(bankData)
    saveOfflineSnapshot(real, bankData)

    // Profile used to live in auth user_metadata, which gets embedded in the
    // session cookie on every request — a large pasted resume/LinkedIn export
    // there can push requests past the edge's header-size limit. Migrate any
    // legacy metadata into the profiles table once, then strip it so the
    // cookie shrinks back down (this fixes accounts already hitting the bug,
    // not just new ones).
    const storedRow = profileRows?.[0]?.data as Profile | undefined
    const legacyMetadata = authUser.user_metadata?.profile as Profile | undefined
    if (storedRow) {
      setProfileRow(storedRow)
    } else if (legacyMetadata) {
      await sb.from('profiles').upsert({ user_id: authUser.id, data: legacyMetadata })
      setProfileRow(legacyMetadata)
    } else {
      setProfileRow(null)
    }
    if (legacyMetadata) {
      const { data } = await sb.auth.updateUser({ data: { profile: null } })
      if (data.user) setUser(data.user)
    }
  }, [sb])

  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        if (!dataLoaded) {
          await loadData(session.user)
          setDataLoaded(true)
        }
      } else if (!session) {
        setDataLoaded(false)
        setCamps([])
        setBank([])
        setProfileRow(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [sb, dataLoaded, loadData])

  const persistCamp = useCallback(async (camp: Campaign) => {
    let previous: Campaign | undefined
    setCamps(prev => {
      const idx = prev.findIndex(c => c.id === camp.id)
      previous = idx >= 0 ? prev[idx] : undefined
      return idx >= 0 ? prev.map((c, i) => i === idx ? camp : c) : [camp, ...prev]
    })
    const { error } = await sb.from('campaigns').upsert({ id: camp.id, user_id: user?.id, data: camp })
    if (error) {
      setCamps(prev => previous ? prev.map(c => c.id === camp.id ? previous! : c) : prev.filter(c => c.id !== camp.id))
      showToast('Failed to save campaign: ' + error.message)
    }
  }, [sb, user])

  const removeCamp = useCallback(async (id: string) => {
    let removed: Campaign | undefined
    let removedIdx = -1
    setCamps(prev => {
      removedIdx = prev.findIndex(c => c.id === id)
      removed = prev[removedIdx]
      return prev.filter(c => c.id !== id)
    })
    const { error } = await sb.from('campaigns').delete().eq('id', id)
    if (error && removed) {
      const toRestore = removed
      const idx = removedIdx
      setCamps(prev => {
        const copy = [...prev]
        copy.splice(Math.min(idx, copy.length), 0, toRestore)
        return copy
      })
      showToast('Failed to delete campaign: ' + error.message)
    }
  }, [sb])

  const mutateCamp = useCallback(async (id: string, fn: (c: Campaign) => void) => {
    let updated: Campaign | null = null
    let previous: Campaign | null = null
    setCamps(prev => prev.map(c => {
      if (c.id !== id) return c
      previous = c
      const copy = JSON.parse(JSON.stringify(c)) as Campaign
      fn(copy)
      updated = copy
      return copy
    }))
    if (updated) {
      const { error } = await sb.from('campaigns').upsert({ id, user_id: user?.id, data: updated })
      if (error) {
        const restore = previous
        if (restore) setCamps(prev => prev.map(c => c.id === id ? restore : c))
        showToast('Failed to save change: ' + error.message)
      }
    }
  }, [sb, user])

  const mutateRound = useCallback(async (cId: string, rId: string, fn: (r: Campaign['rounds'][number]) => void) => {
    await mutateCamp(cId, c => {
      const r = c.rounds.find(r => r.id === rId)
      if (r) fn(r)
    })
  }, [mutateCamp])

  const addStory = useCallback(async (story: Story) => {
    setBank(prev => [story, ...prev])
    const { error } = await sb.from('stories').upsert({ id: story.id, user_id: user?.id, data: story })
    if (error) {
      setBank(prev => prev.filter(s => s.id !== story.id))
      showToast('Failed to save story: ' + error.message)
    }
  }, [sb, user])

  const updateStory = useCallback(async (story: Story) => {
    let previous: Story | undefined
    setBank(prev => prev.map(s => {
      if (s.id !== story.id) return s
      previous = s
      return story
    }))
    const { error } = await sb.from('stories').upsert({ id: story.id, user_id: user?.id, data: story })
    if (error) {
      const restore = previous
      if (restore) setBank(prev => prev.map(s => s.id === story.id ? restore : s))
      showToast('Failed to save story: ' + error.message)
    }
  }, [sb, user])

  const deleteStory = useCallback(async (id: string) => {
    let removed: Story | undefined
    let removedIdx = -1
    setBank(prev => {
      removedIdx = prev.findIndex(s => s.id === id)
      removed = prev[removedIdx]
      return prev.filter(s => s.id !== id)
    })
    const { error } = await sb.from('stories').delete().eq('id', id)
    if (error && removed) {
      const toRestore = removed
      const idx = removedIdx
      setBank(prev => {
        const copy = [...prev]
        copy.splice(Math.min(idx, copy.length), 0, toRestore)
        return copy
      })
      showToast('Failed to delete story: ' + error.message)
    }
  }, [sb])

  const getCampaign = useCallback((id: string) => camps.find(c => c.id === id) ?? null, [camps])

  const getRound = useCallback((cId: string, rId: string) => {
    return getCampaign(cId)?.rounds.find(r => r.id === rId) ?? null
  }, [getCampaign])

  const getMatchedStories = useCallback((roundType: string) => {
    const needed = ROUND_COMP[roundType] ?? []
    return bank.filter(s => s.competencies.some(c => needed.includes(c)))
  }, [bank])

  const getGaps = useCallback((roundType: string) => {
    const needed = ROUND_COMP[roundType] ?? []
    const covered = new Set(bank.flatMap(s => s.competencies))
    return needed.filter(c => !covered.has(c))
  }, [bank])

  const profile: Profile = profileRow ?? { summary: '', competencies: [] }
  const background = profile.summary ?? ''

  const setProfile = useCallback(async (patch: Partial<Profile>) => {
    if (!user) return
    const current: Profile = profileRow ?? { summary: '', competencies: [] }
    const next: Profile = { ...current, ...patch, updatedAt: new Date().toISOString() }
    const previous = profileRow
    setProfileRow(next)
    const { error } = await sb.from('profiles').upsert({ user_id: user.id, data: next })
    if (error) {
      setProfileRow(previous)
      showToast('Failed to save profile: ' + error.message)
    }
  }, [sb, user, profileRow])

  const setBackground = useCallback(async (text: string) => {
    await setProfile({ summary: text })
  }, [setProfile])

  const uid = useCallback(() => Math.random().toString(36).slice(2, 9), [])

  const signOut = useCallback(async () => {
    await sb.auth.signOut()
    setUser(null)
    setCamps([])
    setBank([])
    setDataLoaded(false)
    // Hard navigation, not the client router - clearing state alone leaves
    // you stranded on the current page since route protection only runs via
    // middleware on an actual navigation, not on a reactive auth change.
    window.location.href = '/login'
  }, [sb])

  return (
    <AppContext.Provider value={{
      user, camps, bank, background, setBackground, profile, setProfile, dataLoaded,
      persistCamp, removeCamp, mutateCamp, mutateRound,
      addStory, updateStory, deleteStory, getCampaign, getRound,
      getMatchedStories, getGaps, uid, signOut,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
