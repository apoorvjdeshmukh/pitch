'use client'

import { useState } from 'react'
import { useApp } from '@/context/AppContext'

export default function OnboardingGate() {
  const { user, profile, setProfile, dataLoaded } = useApp()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  if (!user || !dataLoaded || profile.onboarded) return null

  async function finish(skip: boolean) {
    await setProfile({
      ...(skip ? {} : { firstName: firstName.trim(), lastName: lastName.trim() }),
      onboarded: true,
    })
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) finish(true) }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-title">Welcome to Pitch</div>
        <p style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
          What should we call you? This just personalizes the sidebar — nothing else depends on it, and you can always add it later from your Profile.
        </p>
        <div className="form-group">
          <label>First name</label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Apoorv" autoFocus />
        </div>
        <div className="form-group">
          <label>Last name</label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Deshmukh" />
        </div>
        <div className="modal-footer">
          <button className="btn-outline" onClick={() => finish(true)}>Skip for now</button>
          <button className="btn" disabled={!firstName.trim()} onClick={() => finish(false)}>Save</button>
        </div>
      </div>
    </div>
  )
}
