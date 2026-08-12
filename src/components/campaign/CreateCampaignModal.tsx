'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { campaignFitPrompt, campaignCardsPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, setStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { storyContextText } from '@/lib/format'
import { EXPECTED_ROUNDS_OPTIONS, TRACK_LABELS } from '@/lib/constants'
import type { CampaignArtifacts, FitAnalysis, FlashCard, Campaign, Track } from '@/lib/types'

const TRACK_OPTIONS: Track[] = ['pm', 'swe']

export default function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const { persistCamp, uid, background, bank } = useApp()
  const [track, setTrack] = useState<Track>('pm')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [jd, setJd] = useState('')
  const [expectedRounds, setExpectedRounds] = useState<number | null>(EXPECTED_ROUNDS_OPTIONS[3].value)
  const [err, setErr] = useState('')

  async function create() {
    if (!role.trim()) { setErr('Enter a role title.'); return }
    if (!company.trim()) { setErr('Enter a company name.'); return }
    if (jd.trim().length < 50) { setErr('Paste the full job description.'); return }
    onClose()
    showLoading('Analyzing job description...')
    try {
      // Fired in parallel rather than one combined generation — a rich JD +
      // background can push a single sequential response past the API
      // route's 60s timeout, and the two halves don't depend on each other
      // (cards don't need the candidate's background at all).
      let fitText = ''
      let cardsText = ''
      const renderPreview = () => setStreamText(fitText + (cardsText ? '\n\n' + cardsText : ''))

      const [fitRaw, cardsRaw] = await Promise.all([
        callClaudeStream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1200,
          messages: [{ role: 'user', content: campaignFitPrompt(role.trim(), company.trim(), jd.trim(), background.trim(), storyContextText(bank)) }],
        }, chunk => { fitText += chunk; renderPreview() }),
        callClaudeStream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          messages: [{ role: 'user', content: campaignCardsPrompt(role.trim(), company.trim(), jd.trim()) }],
        }, chunk => { cardsText += chunk; renderPreview() }),
      ])
      const fitAnalysis = parseJSON<FitAnalysis>(fitRaw)
      const cards = parseJSON<{ companyCards: FlashCard[]; roleVocabCards: FlashCard[] }>(cardsRaw)
      const artifacts: CampaignArtifacts = { fitAnalysis, companyCards: cards.companyCards, roleVocabCards: cards.roleVocabCards }
      const campaign: Campaign = {
        id: uid(),
        track,
        role: role.trim(),
        company: company.trim(),
        jd: jd.trim(),
        createdAt: new Date().toISOString(),
        artifacts,
        rounds: [],
        active: true,
        expectedRounds,
      }
      await persistCamp(campaign)
      hideLoading('Campaign generated')
      router.push(`/campaign/${campaign.id}`)
    } catch (e) {
      hideLoading()
      showToast('Generation failed: ' + (e as Error).message)
    }
  }

  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-title">New Campaign</div>
        <div className="form-group">
          <label>Track</label>
          <div className="seg-control">
            {TRACK_OPTIONS.map(t => (
              <button
                key={t}
                type="button"
                className={`seg-opt${track === t ? ' active' : ''}`}
                onClick={() => setTrack(t)}
              >
                {TRACK_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Role Title</label>
          <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder={track === 'swe' ? 'e.g. Senior Software Engineer' : 'e.g. Senior Product Manager'} />
        </div>
        <div className="form-group">
          <label>Company</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Stripe" />
        </div>
        <div className="form-group">
          <label>Job Description</label>
          <textarea value={jd} onChange={e => setJd(e.target.value)} style={{ minHeight: 150 }} placeholder="Paste the full job description here..." />
        </div>
        <div className="form-group">
          <label>How many rounds do you expect?</label>
          <div className="seg-control">
            {EXPECTED_ROUNDS_OPTIONS.map(opt => (
              <button
                key={opt.label}
                type="button"
                className={`seg-opt${expectedRounds === opt.value ? ' active' : ''}`}
                onClick={() => setExpectedRounds(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p className="source-note">
          {background.trim()
            ? `Fit analysis will use your saved Profile background${bank.length > 0 ? ' and Story Bank' : ''} — no need to re-paste it here.`
            : 'Fit analysis will use your Profile background and Story Bank once you set them up.'}
          {' '}
          <Link href="/profile" onClick={onClose} style={{ color: 'var(--sage)' }}>
            {background.trim() ? 'Edit your Profile ↗' : 'Build your Profile ↗'}
          </Link>
        </p>
        {err && <p className="error">{err}</p>}
        <div className="modal-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={create}>Create &amp; Generate</button>
        </div>
      </div>
    </div>
  )
}
