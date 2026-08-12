'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import CreateCampaignModal from '@/components/campaign/CreateCampaignModal'
import AboutModal from '@/components/AboutModal'
import Hint from '@/components/Hint'
import { campaignLabel, fmtScheduled, nextScheduled, nextRound, relativeFromNow, fitScoreEmoji } from '@/lib/format'
import type { Campaign, Round, Track } from '@/lib/types'

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString() } catch { return '' }
}

export default function HomePage() {
  const router = useRouter()
  const { camps, bank, signOut, profile, setProfile, getGaps } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  const visibleCamps = camps.filter(c => !c.hidden)
  const hiddenCamps = camps.filter(c => c.hidden)
  const inactiveCamps = visibleCamps.filter(c => !c.active)

  // Soonest-scheduled campaigns first; campaigns with no scheduled round sort last.
  const activeCamps = visibleCamps.filter(c => c.active).slice().sort((a, b) => {
    const na = nextScheduled(a.rounds)
    const nb = nextScheduled(b.rounds)
    if (na && nb) return new Date(na).getTime() - new Date(nb).getTime()
    if (na) return -1
    if (nb) return 1
    return 0
  })

  // ── Pipeline stat strip (desktop) ──
  let nextUp: { campaign: Campaign; round: Round } | null = null
  for (const c of activeCamps) {
    const r = nextRound(c.rounds)
    if (r && (!nextUp || new Date(r.scheduledAt!).getTime() < new Date(nextUp.round.scheduledAt!).getTime())) {
      nextUp = { campaign: c, round: r }
    }
  }
  const preppedCount = activeCamps.reduce((sum, c) => sum + c.rounds.filter(r => r.artifacts).length, 0)
  const expectedTotal = activeCamps.reduce((sum, c) => sum + (c.expectedRounds ?? 0), 0)
  const hasExpected = activeCamps.some(c => c.expectedRounds != null)
  const roundKeysInPlay = new Set(activeCamps.flatMap(c => c.rounds.map(r => `${c.track ?? 'pm'}::${r.type}`)))
  const storyGaps = new Set(Array.from(roundKeysInPlay).flatMap(key => {
    const [track, type] = key.split('::') as [Track, string]
    return getGaps(track, type)
  })).size

  // Mobile: simplified single-line list row (company/role/rounds + next date)
  // replacing the old card grid.
  function renderMobileRow(c: Campaign) {
    const next = nextScheduled(c.rounds)
    return (
      <div key={c.id} className={`mobile-pipeline-row${c.active ? '' : ' inactive'}`} onClick={() => router.push(`/campaign/${c.id}`)}>
        <div className="mobile-pipeline-info">
          <div className="mobile-pipeline-name">{c.company}</div>
          <div className="mobile-pipeline-sub">
            {c.role} · {c.expectedRounds != null ? `${c.rounds.length}/${c.expectedRounds} rounds` : `${c.rounds.length} round${c.rounds.length !== 1 ? 's' : ''}`}
            {c.artifacts.fitAnalysis.fitScore != null && (
              <span className="fit-score" style={{ marginLeft: '0.4rem' }}>{c.artifacts.fitAnalysis.fitScore}/10 {fitScoreEmoji(c.artifacts.fitAnalysis.fitScore)}</span>
            )}
          </div>
        </div>
        {next && <span className="mobile-pipeline-next">{fmtScheduled(next)}</span>}
        <span className="chevron">›</span>
      </div>
    )
  }

  function renderTableRow(c: Campaign) {
    const next = nextScheduled(c.rounds)
    const expected = c.expectedRounds
    return (
      <div key={c.id} className={`pipeline-row${c.active ? '' : ' inactive'}`} onClick={() => router.push(`/campaign/${c.id}`)}>
        <span className="pipeline-company">{c.company}</span>
        <span className="pipeline-role">{c.role}</span>
        <span className="pipeline-rounds-cell">
          {expected != null ? (
            <>
              <span className="pipeline-rounds-strip">
                {Array.from({ length: expected }).map((_, i) => (
                  <span key={i} className={`pipeline-rounds-seg${i < c.rounds.length ? ' filled' : ''}`} />
                ))}
              </span>
              <span className="pipeline-rounds-frac">{c.rounds.length}/{expected}</span>
            </>
          ) : (
            <span className="pipeline-rounds-frac">{c.rounds.length} round{c.rounds.length !== 1 ? 's' : ''}</span>
          )}
        </span>
        <span className={`pipeline-next${next ? ' soon' : ''}`}>{next ? fmtScheduled(next) : 'Not scheduled'}</span>
      </div>
    )
  }

  return (
    <div className="home-page-wrap">
      <div className="home-hero">
        <div className="home-hero-left">
          <h1>Campaigns</h1>
          <p>One workspace per job in your pipeline.</p>
        </div>
        <div className="home-actions">
          <button className="header-action" onClick={() => router.push('/bank')}>
            📚 Bank{bank.length > 0 ? ` (${bank.length})` : ''}
          </button>
          <Hint id="new-campaign" mode="inline" align="right" text="Paste a job description here to create your first campaign — you'll get an instant fit analysis and vocab flashcards.">
            <button className="header-action" onClick={() => setShowModal(true)}>+ New</button>
          </Hint>
        </div>
      </div>
      <div className="content" style={{ paddingTop: '0.85rem' }}>
        {visibleCamps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <div className="empty-title">No campaigns yet</div>
            <div className="empty-sub">Create your first campaign by pasting a job description.</div>
          </div>
        ) : (
          <>
            {nextUp && (
              <div className="mobile-next-up">
                <div className="mobile-next-up-label">Next up · {relativeFromNow(nextUp.round.scheduledAt!)}</div>
                <div className="mobile-next-up-title">{nextUp.campaign.company} · {nextUp.round.type}</div>
                <div className="mobile-next-up-sub">{fmtScheduled(nextUp.round.scheduledAt)}{!nextUp.round.brief ? ' · brief not generated' : ''}</div>
                <button
                  className="mobile-next-up-cta"
                  onClick={() => router.push(`/campaign/${nextUp!.campaign.id}/round/${nextUp!.round.id}/brief`)}
                >
                  {nextUp.round.brief ? 'View Day Before Brief' : 'Generate Day Before Brief'}
                </button>
              </div>
            )}
            <>
              <div className="pipeline-stats">
                <div className="pipeline-stat">
                  <div className="pipeline-stat-label">Next up</div>
                  {nextUp ? (
                    <>
                      <div className="pipeline-stat-value text">{nextUp.campaign.company} · {nextUp.round.type}</div>
                      <div className="pipeline-stat-sub">{relativeFromNow(nextUp.round.scheduledAt!)} · {fmtScheduled(nextUp.round.scheduledAt)}{!nextUp.round.brief ? ' · brief not generated' : ''}</div>
                    </>
                  ) : (
                    <div className="pipeline-stat-value text muted">Nothing scheduled</div>
                  )}
                </div>
                <div className="pipeline-stat" style={{ maxWidth: 190 }}>
                  <div className="pipeline-stat-label">Rounds prepped</div>
                  <div className="pipeline-stat-value">
                    {preppedCount}{hasExpected && <span className="pipeline-stat-of"> / {expectedTotal} expected</span>}
                  </div>
                </div>
                <div className="pipeline-stat" style={{ maxWidth: 150 }}>
                  <div className="pipeline-stat-label">Story gaps</div>
                  <div className={`pipeline-stat-value${storyGaps > 0 ? ' danger' : ''}`}>{storyGaps}</div>
                </div>
              </div>
              <div className="pipeline-table-wrap">
                <div className="pipeline-table-head">
                  <span>Company</span><span>Role</span><span>Rounds</span><span>Next</span>
                </div>
                {activeCamps.map(renderTableRow)}
                {inactiveCamps.map(renderTableRow)}
              </div>
            </>
            {activeCamps.length > 0 && (
              <div className="campaign-list">{activeCamps.map(renderMobileRow)}</div>
            )}
            {activeCamps.length === 0 && inactiveCamps.length > 0 && (
              <div className="empty-state">
                <div className="empty-icon">🗂️</div>
                <div className="empty-title">No active campaigns</div>
                <div className="empty-sub">Create a new campaign, or reactivate one below.</div>
              </div>
            )}
            {inactiveCamps.length > 0 && (
              <div className="pipeline-mobile-inactive" style={{ marginTop: activeCamps.length > 0 ? '1.75rem' : 0 }}>
                <div className="bank-group-title">Not interviewing anymore ({inactiveCamps.length})</div>
                <div className="campaign-list">{inactiveCamps.map(renderMobileRow)}</div>
              </div>
            )}
          </>
        )}
        {hiddenCamps.length > 0 && (
          <div style={{ marginTop: (activeCamps.length > 0 || inactiveCamps.length > 0) ? '1.75rem' : 0, textAlign: 'center' }}>
            <button className="btn-ghost" onClick={() => setShowHidden(v => !v)}>
              {showHidden ? 'Hide hidden campaigns ↑' : `${hiddenCamps.length} hidden campaign${hiddenCamps.length !== 1 ? 's' : ''} ↓`}
            </button>
            {showHidden && (
              <div className="campaign-list hidden-camps-list" style={{ marginTop: '0.75rem', textAlign: 'left' }}>
                {hiddenCamps.map(renderMobileRow)}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="page-footer">
        {/* Hard navigation, not the client router — must work offline via the
            service worker's page cache, with no dependency on a live RSC fetch. */}
        <a className="btn-ghost" href="/offline">📡 Offline copy</a>
        <button className="btn-ghost" onClick={() => router.push('/profile')}>👤 Profile</button>
        <button
          className={`btn-ghost${profile.onboarded && !profile.aboutSeen ? ' glow' : ''}`}
          onClick={() => { setShowAbout(true); if (!profile.aboutSeen) setProfile({ aboutSeen: true }) }}
        >
          About
        </button>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
      </div>
      {showModal && <CreateCampaignModal onClose={() => setShowModal(false)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
