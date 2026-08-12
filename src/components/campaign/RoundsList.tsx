'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { roundPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { roundTypesFor, EXPECTED_ROUNDS_OPTIONS } from '@/lib/constants'
import { fmtScheduled } from '@/lib/format'
import type { Campaign, Round, RoundArtifacts } from '@/lib/types'

function statusCls(s: string) { return ({ 'not-started': 's-ns', 'in-prep': 's-ip', done: 's-dn' } as Record<string, string>)[s] ?? 's-ns' }
function statusLbl(s: string) { return ({ 'not-started': 'Not started', 'in-prep': 'In prep', done: 'Done' } as Record<string, string>)[s] ?? s }

export default function RoundsList({ campaign }: { campaign: Campaign }) {
  const router = useRouter()
  const { mutateCamp, uid } = useApp()
  const [showModal, setShowModal] = useState(false)
  const roundTypes = roundTypesFor(campaign.track ?? 'pm')
  const [roundType, setRoundType] = useState(roundTypes[0])
  const [err, setErr] = useState('')
  const [editingExpected, setEditingExpected] = useState(false)

  async function setExpectedRounds(value: number | null) {
    setEditingExpected(false)
    await mutateCamp(campaign.id, c => { c.expectedRounds = value })
  }

  async function addRound() {
    setShowModal(false)
    showLoading(`Generating ${roundType} prep...`)
    try {
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: roundPrompt(roundType, campaign) }],
      }, appendStreamText)
      const artifacts = parseJSON<RoundArtifacts>(text)
      const round: Round = {
        id: uid(),
        type: roundType,
        status: 'not-started',
        interviewerProfile: '',
        interviewerSignals: null,
        artifacts,
        brief: null,
      }
      await mutateCamp(campaign.id, c => c.rounds.push(round))
      hideLoading('Round prep generated')
      router.push(`/campaign/${campaign.id}/round/${round.id}`)
    } catch (e) {
      hideLoading()
      showToast('Generation failed: ' + (e as Error).message)
    }
  }

  const expected = campaign.expectedRounds
  const remaining = expected != null ? expected - campaign.rounds.length : null

  return (
    <>
      <div className="rounds-progress-header">
        <span className="rounds-progress-label">
          {expected != null
            ? `${campaign.rounds.length} of ${expected} expected`
            : `${campaign.rounds.length} round${campaign.rounds.length !== 1 ? 's' : ''}`}
        </span>
        <button className="rounds-progress-edit" onClick={() => setEditingExpected(v => !v)}>
          {expected != null ? 'Edit' : 'Set expected rounds'}
        </button>
      </div>
      {editingExpected && (
        <div className="seg-control" style={{ marginBottom: '0.75rem' }}>
          {EXPECTED_ROUNDS_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              className={`seg-opt${expected === opt.value ? ' active' : ''}`}
              onClick={() => setExpectedRounds(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {expected != null && (
        <div className="rounds-progress-strip">
          {Array.from({ length: expected }).map((_, i) => (
            <span key={i} className={`rounds-progress-seg${i < campaign.rounds.length ? ' filled' : ''}`} />
          ))}
        </div>
      )}
      {campaign.rounds.length > 0 && (
        <div className="rounds-list">
          {campaign.rounds.map(r => (
            <div key={r.id} className="round-item" onClick={() => router.push(`/campaign/${campaign.id}/round/${r.id}`)}>
              <div className="round-item-info">
                <div className="round-type">{r.type}</div>
                <div className="round-meta">
                  {r.artifacts ? 'Prep ready' : 'No prep'} · {r.interviewerProfile ? 'Interviewer added' : 'No interviewer'}
                  {r.scheduledAt ? ` · ${fmtScheduled(r.scheduledAt)}` : ''}
                </div>
              </div>
              <span className={`status-chip ${statusCls(r.status)}`}>{statusLbl(r.status)}</span>
              <span className="chevron">›</span>
            </div>
          ))}
        </div>
      )}
      <button className="add-round-btn" onClick={() => { setErr(''); setShowModal(true) }}>
        + Add Round{remaining != null && remaining > 0 ? ` (${remaining} left of ${expected} expected)` : ''}
      </button>

      {showModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-title">Add a Round</div>
            <div className="form-group">
              <label>Interview Type</label>
              <select value={roundType} onChange={e => setRoundType(e.target.value)}>
                {roundTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {err && <p className="error">{err}</p>}
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn" onClick={addRound}>Generate Prep</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
