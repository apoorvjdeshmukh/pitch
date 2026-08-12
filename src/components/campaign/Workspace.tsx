'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { ROUND_TYPES, EXPECTED_ROUNDS_OPTIONS } from '@/lib/constants'
import { campaignLabel, fmtScheduled, nextRound } from '@/lib/format'
import type { Campaign, Round } from '@/lib/types'

function statusDotCls(s: string) { return ({ 'not-started': 'ws-dot-ns', 'in-prep': 'ws-dot-ip', done: 'ws-dot-dn' } as Record<string, string>)[s] ?? 'ws-dot-ns' }

interface Props {
  campaign: Campaign
  activeRoundId?: string
  children: React.ReactNode
}

export default function Workspace({ campaign, activeRoundId, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { mutateCamp, uid } = useApp()
  const [showAddRound, setShowAddRound] = useState(false)
  const [showEditExpected, setShowEditExpected] = useState(false)
  const [roundType, setRoundType] = useState(ROUND_TYPES[0])

  const overviewHref = `/campaign/${campaign.id}`
  const onOverview = pathname === overviewHref

  function goToSection(id: string) {
    if (onOverview) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      router.push(overviewHref)
    }
  }

  async function setExpectedRounds(value: number | null) {
    setShowEditExpected(false)
    await mutateCamp(campaign.id, c => { c.expectedRounds = value })
  }

  // Creates the round immediately (no artifacts yet) and navigates straight
  // to it — the round page itself drives generation inline once it mounts,
  // rather than blocking here behind a full-screen loading overlay.
  async function addRound() {
    setShowAddRound(false)
    const round: Round = {
      id: uid(),
      type: roundType,
      status: 'not-started',
      interviewerProfile: '',
      interviewerSignals: null,
      artifacts: null,
      brief: null,
    }
    await mutateCamp(campaign.id, c => c.rounds.push(round))
    router.push(`/campaign/${campaign.id}/round/${round.id}?new=1`)
  }

  const expected = campaign.expectedRounds
  const remaining = expected != null ? expected - campaign.rounds.length : null
  const briefTarget = activeRoundId ?? nextRound(campaign.rounds)?.id ?? campaign.rounds[campaign.rounds.length - 1]?.id
  const filesCount = (campaign.files?.length ?? 0)

  return (
    <div className="workspace">
      <div className="workspace-mid">
        <div className="workspace-mid-header">
          <div className="workspace-mid-title">{campaignLabel(campaign)}</div>
          <div className="workspace-mid-status">
            <span className={`ws-active-dot${campaign.active ? '' : ' inactive'}`} />
            {campaign.active ? 'Actively interviewing' : 'Not interviewing anymore'}
          </div>
        </div>

        <nav className="workspace-nav">
          <button className={`workspace-nav-item${onOverview ? ' active' : ''}`} onClick={() => goToSection('fit-analysis')}>Fit analysis</button>
          <button className={`workspace-nav-item${onOverview ? ' active' : ''}`} onClick={() => goToSection('vocabulary')}>Vocabulary</button>
          <button className={`workspace-nav-item${onOverview ? ' active' : ''}`} onClick={() => goToSection('files')}>
            Files{filesCount > 0 ? ` (${filesCount})` : ''}
          </button>
        </nav>

        <div className="workspace-rounds">
          <div className="workspace-rounds-header">
            <span>{expected != null ? `${campaign.rounds.length} of ${expected} expected` : `${campaign.rounds.length} round${campaign.rounds.length !== 1 ? 's' : ''}`}</span>
            <button className="workspace-rounds-edit" onClick={() => setShowEditExpected(v => !v)}>Edit</button>
          </div>
          {showEditExpected && (
            <div className="seg-control" style={{ marginBottom: '0.6rem' }}>
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
            <div className="workspace-rounds-strip">
              {Array.from({ length: expected }).map((_, i) => (
                <span key={i} className={`workspace-rounds-seg${i < campaign.rounds.length ? ' filled' : ''}`} />
              ))}
            </div>
          )}
          <div className="workspace-round-list">
            {campaign.rounds.map(r => (
              <div
                key={r.id}
                className={`workspace-round-row${r.id === activeRoundId ? ' active' : ''}`}
                onClick={() => router.push(`/campaign/${campaign.id}/round/${r.id}`)}
              >
                <span className={`ws-dot ${statusDotCls(r.status)}`} />
                <span className="workspace-round-type">{r.type}</span>
                {r.scheduledAt && <span className="workspace-round-date">{fmtScheduled(r.scheduledAt)}</span>}
              </div>
            ))}
          </div>
          <button className="workspace-add-round" onClick={() => setShowAddRound(true)}>
            + Add round{remaining != null && remaining > 0 ? ` (${remaining} left)` : ''}
          </button>
        </div>

        <button className="workspace-brief-btn" disabled={!briefTarget} onClick={() => briefTarget && router.push(`/campaign/${campaign.id}/round/${briefTarget}/brief`)}>
          📋 Day Before Brief
        </button>
      </div>

      <div className="workspace-body">
        {children}
      </div>

      {showAddRound && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAddRound(false) }}>
          <div className="modal">
            <div className="modal-title">Add a Round</div>
            <div className="form-group">
              <label>Interview Type</label>
              <select value={roundType} onChange={e => setRoundType(e.target.value)}>
                {ROUND_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowAddRound(false)}>Cancel</button>
              <button className="btn" onClick={addRound}>Generate Prep</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
