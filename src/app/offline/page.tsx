'use client'

import { useEffect, useState } from 'react'
import { readOfflineSnapshot, type OfflineSnapshot } from '@/lib/offlineSnapshot'
import { campaignLabel } from '@/lib/format'
import { COMP, ARTIFACTS } from '@/lib/constants'
import FitAnalysis from '@/components/campaign/FitAnalysis'
import CompanyCards from '@/components/campaign/CompanyCards'
import RoundArtifacts from '@/components/round/RoundArtifacts'
import type { Campaign, Round } from '@/lib/types'

function fmtDateTime(iso: string) {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

function statusLbl(s: string) {
  return ({ 'not-started': 'Not started', 'in-prep': 'In prep', done: 'Done' } as Record<string, string>)[s] ?? s
}

function RoundOffline({ round }: { round: Round }) {
  return (
    <div style={{ paddingTop: '0.5rem' }}>
      {round.artifacts?.sections
        ? <RoundArtifacts sections={round.artifacts.sections} />
        : <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No prep material saved.</p>}

      {round.interviewerSignals && (
        <div className="sec">
          <div className="sec-title">Interviewer Signals</div>
          <div className="sig-name">{round.interviewerSignals.name || 'Interviewer'}</div>
          <div className="sig-role">{round.interviewerSignals.title}</div>
          {round.interviewerSignals.background && (
            <div className="sig-block">
              <div className="sig-label">Background</div>
              <div className="sig-val">{round.interviewerSignals.background}</div>
            </div>
          )}
          <div className="sig-block">
            <div className="sig-label">What they likely care about</div>
            {(round.interviewerSignals.priorities ?? []).map((p, i) => (
              <div key={i} className="sig-val" style={{ marginBottom: '0.25rem' }}>· {p}</div>
            ))}
          </div>
          <div className="sig-block">
            <div className="sig-label">How to angle your stories</div>
            <div className="sig-val">{round.interviewerSignals.storyAngle}</div>
          </div>
          <div className="sig-block">
            <div className="sig-label">Questions to ask them</div>
            {(round.interviewerSignals.questionsToAsk ?? []).map((q, i) => (
              <div key={i} className="sig-val" style={{ marginBottom: '0.25rem' }}>· {q}</div>
            ))}
          </div>
          {round.interviewerSignals.keyInsight && (
            <div className="insight-box">💡 {round.interviewerSignals.keyInsight}</div>
          )}
        </div>
      )}

      {round.brief && (
        <div className="sec">
          <div className="sec-title">Day Before Brief</div>
          {(round.brief.storiesToLead ?? []).map((s, i) => (
            <div key={i} className="brief-story-item">
              <div className="brief-story-title">{i + 1}. {s.title}</div>
              <div className="brief-story-angle">→ {s.angle}</div>
            </div>
          ))}
          {(round.brief.companyFacts ?? []).length > 0 && (
            <div style={{ marginTop: '0.6rem' }}>
              <div className="sig-label">Company facts</div>
              {round.brief.companyFacts.map((f, i) => <div key={i} className="brief-fact">· {f}</div>)}
            </div>
          )}
          {round.brief.interviewerNote && (
            <div style={{ marginTop: '0.6rem' }}>
              <div className="sig-label">Interviewer note</div>
              <div className="brief-iv-note">{round.brief.interviewerNote}</div>
            </div>
          )}
          {(round.brief.questionsToAsk ?? []).length > 0 && (
            <div style={{ marginTop: '0.6rem' }}>
              <div className="sig-label">Questions to ask</div>
              {round.brief.questionsToAsk.map((q, i) => <div key={i} className="brief-q">{i + 1}. {q}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CampaignOffline({ campaign }: { campaign: Campaign }) {
  const [openRound, setOpenRound] = useState<string | null>(null)

  const campaignFiles = ARTIFACTS.filter(a =>
    a.campaignCompany &&
    campaign.company.toLowerCase().includes(a.campaignCompany.toLowerCase())
  )

  return (
    <div style={{ paddingTop: '0.5rem' }}>
      <FitAnalysis fit={campaign.artifacts.fitAnalysis} campaignId={campaign.id} interactive={false} />
      <CompanyCards
        companyCards={campaign.artifacts.companyCards}
        roleVocabCards={campaign.artifacts.roleVocabCards}
      />
      {campaignFiles.length > 0 && (
        <div className="sec">
          <div className="sec-title">Files</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {campaignFiles.map(a => (
              <div key={a.id} className="artifact-card">
                <div className="artifact-card-top">
                  <div className="artifact-icon">{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="artifact-title">{a.title}</div>
                    <div className="artifact-subtitle">{a.subtitle}</div>
                  </div>
                </div>
                <div className="artifact-desc">{a.desc}</div>
                <div className="artifact-footer">
                  <div className="artifact-tags">
                    {a.tags.map(t => <span key={t} className="artifact-tag">{t}</span>)}
                  </div>
                  <button className="btn-blue" style={{ flexShrink: 0 }} onClick={() => window.open(a.url, '_blank')}>
                    Open ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {campaign.rounds.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No rounds added.</p>
      ) : (
        <div className="rounds-list">
          {campaign.rounds.map(r => (
            <div key={r.id}>
              <div className="round-item" onClick={() => setOpenRound(openRound === r.id ? null : r.id)}>
                <div className="round-item-info">
                  <div className="round-type">{r.type}</div>
                  <div className="round-meta">{statusLbl(r.status)}</div>
                </div>
                <span className="chevron" style={{ transform: openRound === r.id ? 'rotate(90deg)' : 'none' }}>›</span>
              </div>
              {openRound === r.id && <RoundOffline round={r} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null | undefined>(undefined)
  const [openCampaign, setOpenCampaign] = useState<string | null>(null)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

  useEffect(() => {
    setSnapshot(readOfflineSnapshot())
  }, [])

  return (
    <>
      <div className="header">
        {/* A plain hard-navigation link, not the client router — offline this must
            be a real page request the service worker can serve from cache, not an
            RSC data fetch the router would make with no connection to complete it. */}
        <a className="header-back" href="/">←</a>
        <span className="header-title">Offline Copy</span>
      </div>
      <div className="content">
        {snapshot === undefined ? null : !snapshot ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-title">No offline copy saved yet</div>
            <div className="empty-sub">Open the app once with a connection so it can save a copy — then this page works with no internet.</div>
          </div>
        ) : (
          <>
            <div className="sec" style={{ padding: '0.65rem 0.9rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
              Read-only snapshot saved {fmtDateTime(snapshot.savedAt)}. Nothing here can be edited or generated while offline.
            </div>

            <div className="bank-group-title" style={{ marginTop: '1rem' }}>Campaigns ({snapshot.camps.length})</div>
            <div className="campaign-list">
              {snapshot.camps.map(c => (
                <div key={c.id}>
                  <div className={`campaign-card${c.active ? '' : ' inactive'}`} onClick={() => setOpenCampaign(openCampaign === c.id ? null : c.id)}>
                    <div className="campaign-card-info">
                      <div className="campaign-card-title">{campaignLabel(c)}</div>
                      <div className="campaign-card-meta">
                        {c.rounds.length} round{c.rounds.length !== 1 ? 's' : ''}{!c.active ? ' · Not interviewing anymore' : ''}
                      </div>
                    </div>
                    <span className="chevron" style={{ transform: openCampaign === c.id ? 'rotate(90deg)' : 'none' }}>›</span>
                  </div>
                  {openCampaign === c.id && <CampaignOffline campaign={c} />}
                </div>
              ))}
            </div>

            <div className="bank-group-title" style={{ marginTop: '1.75rem' }}>Story Bank ({snapshot.bank.length})</div>
            {snapshot.bank.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No stories saved.</p>
            ) : (
              snapshot.bank.map(s => (
                <div key={s.id} className="story-card">
                  <div className="story-card-header">
                    <div className="story-card-title">{s.title}</div>
                  </div>
                  <div className="story-chips">
                    {(s.competencies ?? []).map(ck => <span key={ck} className="comp-chip">{COMP[ck] ?? ck}</span>)}
                  </div>
                  <button className="story-expand" onClick={() => setExpandedStory(expandedStory === s.id ? null : s.id)}>
                    {expandedStory === s.id ? 'Hide story ↑' : 'Show story ↓'}
                  </button>
                  {expandedStory === s.id && (
                    <div className="story-detail open">
                      {[['Situation', s.situation], ['Task', s.task], ['Action', s.action], ['Result', s.result]].map(([l, t]) => (
                        <div key={l} className="star-row">
                          <div className="star-row-label">{l}</div>
                          <div className="star-row-text">{t}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </>
  )
}
