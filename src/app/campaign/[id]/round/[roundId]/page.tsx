'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import RoundArtifacts from '@/components/round/RoundArtifacts'
import RoundStories from '@/components/round/RoundStories'
import InterviewerPanel from '@/components/round/InterviewerPanel'
import Workspace from '@/components/campaign/Workspace'
import SectionNav from '@/components/SectionNav'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { roundPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import type { RoundStatus, RoundArtifacts as RoundArtifactsData } from '@/lib/types'
import { useSmartBack } from '@/lib/useSmartBack'
import { campaignLabel, interviewerNoteText, storyContextText, fmtScheduled, toDatetimeLocalValue, formatStreamPreview } from '@/lib/format'

const STATUS_OPTS: Array<[RoundStatus, string, string]> = [
  ['not-started', 'Not started', 'sel-ns'],
  ['in-prep', 'In prep', 'sel-ip'],
  ['done', 'Done', 'sel-dn'],
]

type Tab = 'prep' | 'stories' | 'interviewer'
const TABS: Tab[] = ['prep', 'stories', 'interviewer']
const TAB_SUBTITLES: Record<Tab, string> = {
  prep: 'What to expect in this round and how to structure your answers.',
  stories: 'Which Story Bank stories cover this round, and where the gaps are.',
  interviewer: "Paste their LinkedIn profile to get signals on how to angle your stories.",
}

const SECTIONS = [
  { id: 'what-to-expect', label: 'What to expect' },
  { id: 'story-coverage', label: 'Story coverage' },
  { id: 'interviewer', label: 'Interviewer' },
]

export default function RoundPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getCampaign, getRound, mutateRound, getMatchedStories } = useApp()

  const campaignId = params.id as string
  const roundId = params.roundId as string
  const goBack = useSmartBack(`/campaign/${campaignId}`)
  const contentRef = useRef<HTMLDivElement>(null)

  const initialTab = TABS.includes(searchParams.get('tab') as Tab) ? (searchParams.get('tab') as Tab) : 'prep'
  const [tab, setTabState] = useState<Tab>(initialTab)

  // Inline generation (desktop only) — replaces the blocking overlay for
  // round-prep specifically, for both a freshly created round (?new=1) and
  // an explicit regenerate, so the numbered-section layout is visible and
  // sections 02/03 stay interactive while 01 streams in.
  const [generating, setGenerating] = useState(false)
  const [genText, setGenText] = useState('')
  const [elapsed, setElapsed] = useState(0)

  function setTab(t: Tab) {
    setTabState(t)
    router.replace(`/campaign/${campaignId}/round/${roundId}?tab=${t}`, { scroll: false })
  }
  const campaign = getCampaign(campaignId)
  const round = getRound(campaignId, roundId)

  useEffect(() => {
    if (!generating) return
    const start = Date.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed(Date.now() - start), 100)
    return () => clearInterval(id)
  }, [generating])

  useEffect(() => {
    if (searchParams.get('new') === '1' && round && !round.artifacts) {
      router.replace(`/campaign/${campaignId}/round/${roundId}`, { scroll: false })
      runInlineGeneration()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!campaign || !round) {
    return <div className="content" style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Round not found.</p>
    </div>
  }

  async function setStatus(status: RoundStatus) {
    await mutateRound(campaignId, roundId, r => { r.status = status })
  }

  async function setScheduledAt(value: string) {
    await mutateRound(campaignId, roundId, r => {
      r.scheduledAt = value ? new Date(value).toISOString() : null
    })
  }

  const matchedStories = getMatchedStories(round.type)

  async function regeneratePrep() {
    showLoading('Regenerating prep...')
    try {
      const context = {
        interviewerNote: interviewerNoteText(round!.interviewerSignals),
        storyContext: storyContextText(matchedStories),
      }
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: roundPrompt(round!.type, campaign!, context) }],
      }, appendStreamText)
      const artifacts = parseJSON<RoundArtifactsData>(text)
      await mutateRound(campaignId, roundId, r => { r.artifacts = artifacts })
      hideLoading('Prep regenerated')
    } catch (e) {
      hideLoading()
      showToast('Prep regeneration failed: ' + (e as Error).message)
    }
  }

  // Desktop-only inline version — streams into the "01 What to expect"
  // section itself instead of a blocking overlay, so sections 02/03 stay
  // visible and interactive the whole time.
  async function runInlineGeneration() {
    setGenerating(true)
    setGenText('')
    try {
      const context = {
        interviewerNote: interviewerNoteText(round!.interviewerSignals),
        storyContext: storyContextText(matchedStories),
      }
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: roundPrompt(round!.type, campaign!, context) }],
      }, chunk => setGenText(prev => prev + chunk))
      const artifacts = parseJSON<RoundArtifactsData>(text)
      await mutateRound(campaignId, roundId, r => { r.artifacts = artifacts })
    } catch (e) {
      showToast('Prep generation failed: ' + (e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const dateChip = (
    <label className={`date-chip${round.scheduledAt ? '' : ' empty'}`}>
      <span>{round.scheduledAt ? fmtScheduled(round.scheduledAt) : 'Not scheduled'}</span>
      <input
        type="datetime-local"
        value={toDatetimeLocalValue(round.scheduledAt)}
        onChange={e => setScheduledAt(e.target.value)}
      />
    </label>
  )

  const statusRow = (
    <div className="status-row">
      {STATUS_OPTS.map(([val, lbl, cls]) => (
        <button
          key={val}
          className={`st-opt${round.status === val ? ` ${cls}` : ''}`}
          onClick={() => setStatus(val)}
        >
          {lbl}
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* ── Mobile (unchanged tab-bar layout) ── */}
      <div className="mobile-view">
        <div className="header">
          <button className="header-back" onClick={goBack}>←</button>
          <span className="header-title">{round.type}</span>
        </div>
        <Breadcrumb crumbs={[
          { label: 'Campaigns', onClick: () => router.push('/') },
          { label: campaignLabel(campaign), onClick: () => router.push(`/campaign/${campaignId}`) },
          { label: round.type },
        ]} />
        <div className="content">
          <div className="sec" style={{ marginBottom: '0.75rem' }}>
            <div className="sec-title">Scheduled</div>
            {dateChip}
          </div>

          <div className="sec" style={{ marginBottom: '0.75rem' }}>
            <div className="sec-title">Status</div>
            {statusRow}
          </div>

          <div className="tab-bar">
            <button className={`tab-btn${tab === 'prep' ? ' active' : ''}`} onClick={() => setTab('prep')}>Prep</button>
            <button className={`tab-btn${tab === 'stories' ? ' active' : ''}`} onClick={() => setTab('stories')}>Stories</button>
            <button className={`tab-btn${tab === 'interviewer' ? ' active' : ''}`} onClick={() => setTab('interviewer')}>Interviewer</button>
          </div>
          <p className="tab-subtitle">{TAB_SUBTITLES[tab]}</p>

          {tab === 'prep' && (
            round.artifacts?.sections
              ? <>
                  <RoundArtifacts sections={round.artifacts.sections} />
                  <button className="brief-regen" onClick={regeneratePrep}>
                    Regenerate with latest interviewer &amp; story info
                  </button>
                </>
              : <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem 0' }}>No prep material.</p>
          )}

          {tab === 'stories' && (
            <RoundStories
              campaign={campaign}
              roundId={roundId}
              roundType={round.type}
              hasBrief={!!round.brief}
              matchedStories={matchedStories}
            />
          )}

          {tab === 'interviewer' && (
            <InterviewerPanel campaign={campaign} roundId={roundId} />
          )}
        </div>
      </div>

      {/* ── Desktop (persistent workspace) ── */}
      <div className="desktop-view">
        <Workspace campaign={campaign} activeRoundId={roundId}>
          <div className="workspace-content" ref={contentRef}>
            <div className="workspace-content-header">
              <div className="workspace-content-title">{round.type}</div>
              <div className="workspace-round-header-controls">
                {dateChip}
                {statusRow}
              </div>
            </div>

            <section id="what-to-expect" className="workspace-section">
              <div className="sec-title">01 What to expect</div>
              {generating ? (
                <div className="inline-gen">
                  <div className="inline-gen-status">
                    <span className="inline-gen-dot" />
                    Writing your {round.type} prep <span className="inline-gen-elapsed">{(elapsed / 1000).toFixed(1)}s</span>
                  </div>
                  <pre className="loading-stream inline-gen-stream">{formatStreamPreview(genText)}</pre>
                </div>
              ) : round.artifacts?.sections ? (
                <RoundArtifacts sections={round.artifacts.sections} />
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}>No prep material.</p>
                  <button className="btn-outline" onClick={runInlineGeneration}>Generate prep</button>
                </div>
              )}
            </section>

            <section id="story-coverage" className="workspace-section">
              <div className="sec-title">02 Story coverage</div>
              <RoundStories
                campaign={campaign}
                roundId={roundId}
                roundType={round.type}
                hasBrief={!!round.brief}
                matchedStories={matchedStories}
              />
            </section>

            <section id="interviewer" className="workspace-section">
              <div className="sec-title">03 Interviewer</div>
              <InterviewerPanel campaign={campaign} roundId={roundId} />
            </section>
          </div>
          <div className="workspace-rail">
            <SectionNav
              items={SECTIONS}
              containerRef={contentRef}
              action={<button className="brief-regen" onClick={runInlineGeneration} disabled={generating}>{generating ? 'Generating…' : 'Regenerate prep'}</button>}
            />
          </div>
        </Workspace>
      </div>
    </>
  )
}
