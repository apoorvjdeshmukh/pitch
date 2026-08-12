'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toastStore'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (password.length < 6) { showToast('Password must be at least 6 characters.'); return }
    if (password !== confirm) { showToast('Passwords do not match.'); return }
    setBusy(true)
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password })
    setBusy(false)
    if (error) { showToast(error.message); return }
    showToast('Password updated — you\'re signed in.', 'info', 3000)
    router.push('/')
  }

  return (
    <div className="login-wrap">
      <h1>Set a new password</h1>
      <p>Choose a new password for your account.</p>
      <div className="white-card">
        <div className="form-group">
          <label>New password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="form-group">
          <label>Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
          />
        </div>
        <button className="btn" disabled={busy} onClick={submit}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </div>
  )
}
