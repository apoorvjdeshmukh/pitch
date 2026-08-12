'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { showToast } from '@/lib/toastStore'

function LoginCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  function nextPath() {
    const next = searchParams.get('next')
    return next && next.startsWith('/') ? next : '/'
  }

  async function signIn() {
    const sb = createClient()
    const next = searchParams.get('next')
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (next && next.startsWith('/')) callbackUrl.searchParams.set('next', next)
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) showToast(error.message)
  }

  async function signInWithEmail() {
    if (!email.trim() || !password) { showToast('Enter an email and password.'); return }
    setBusy(true)
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) { showToast(error.message); return }
    router.push(nextPath())
  }

  async function forgotPassword() {
    if (!email.trim()) { showToast('Enter your email above first.'); return }
    setBusy(true)
    const sb = createClient()
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (error) { showToast(error.message); return }
    showToast('Check your email for a password reset link.', 'info', 4000)
  }

  return (
    <div className="white-card">
      <button className="google-btn" onClick={signIn}>
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <button
        className="btn-ghost"
        style={{ display: 'block', margin: '0.85rem auto 0' }}
        onClick={() => setShowEmail(v => !v)}
      >
        {showEmail ? 'Hide email sign-in' : 'Use email instead'}
      </button>

      {showEmail && (
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label style={{ marginTop: '0.5rem' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => { if (e.key === 'Enter') signInWithEmail() }}
          />
          <button className="btn" style={{ marginTop: '0.6rem' }} disabled={busy} onClick={signInWithEmail}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            className="btn-ghost"
            style={{ display: 'block', margin: '0.5rem auto 0' }}
            disabled={busy}
            onClick={forgotPassword}
          >
            Forgot password?
          </button>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <h1>Pitch</h1>
      <p>Round-specific interview prep that compounds across every job.</p>
      <Suspense fallback={<div className="white-card" />}>
        <LoginCard />
      </Suspense>
      <p className="login-note">Your data is private and only accessible to you.</p>
    </div>
  )
}
