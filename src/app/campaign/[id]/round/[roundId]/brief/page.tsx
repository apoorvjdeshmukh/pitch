'use client'

import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { briefPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { useSmartBack } from '@/lib/useSmartBack'
import { campaignLabel, fmtScheduled, briefReadStats } from '@/lib/format'
import type { Brief } from '@/lib/types'

function fmtDate(iso: string) { try { return new Date(iso).toLocaleDateString() } catch { return '' } }

export default function BriefPage() {
  const params = useParams()
  const router = useRouter()
  const { getCampaign, getRound, mutateRound, getMatchedStories } = useApp()

  const campaignId = params.id as string
  const roundId = params.roundId as string
  const goBack = useSmartBack(`/campaign/${campaignId}/round/${roundId}`)
  const campaign = getCampaign(campaignId)
  const round = getRound(campaignId, roundId)

  if (!campaign || !round) return null

  const matched = getMatchedStories(campaign.track ?? 'pm', round.type)

  async function generate() {
    const storySummaries = matched.slice(0, 5).map(s =>
      `"${s.title}": Situation: ${s.situation} Action: ${s.action?.slice(0, 200)} Result: ${s.result}`
    ).join('\n---\n')
    const ivNote = round!.interviewerSignals
      ? `Interviewer: ${round!.interviewerSignals.name}, ${round!.interviewerSignals.title}. ${round!.interviewerSignals.background} Likely cares about: ${round!.interviewerSignals.priorities?.join(', ')}.`
      : 'No interviewer profile added.'
    const companyContext = campaign!.artifacts?.companyCards?.slice(0, 4).map(c => c.back).join(' ') ?? ''

    showLoading('Generating Day Before Brief...')
    try {
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: briefPrompt(campaign!.role, campaign!.company, round!.type, ivNote, storySummaries, companyContext) }],
      }, appendStreamText)
      const brief: Brief = { ...parseJSON<Brief>(text), generatedAt: new Date().toISOString() }
      await mutateRound(campaignId, roundId, r => { r.brief = brief })
      hideLoading('Brief generated')
    } catch (e) {
      hideLoading()
      showToast('Brief generation failed: ' + (e as Error).message)
    }
  }

  const brief = round.brief

  if (!brief) {
    return (
      <>
        <div className="header">
          <button className="header-back" onClick={goBack}>←</button>
          <span className="header-title">Day Before — {round.type}</span>
        </div>
        <Breadcrumb crumbs={[
          { label: 'Campaigns', onClick: () => router.push('/') },
          { label: campaignLabel(campaign), onClick: () => router.push(`/campaign/${campaignId}`) },
          { label: round.type, onClick: () => router.push(`/campaign/${campaignId}/round/${roundId}`) },
          { label: 'Day Before Brief' },
        ]} />
        <div className="content">
          <div className="brief-gen-wrap">
            <div className="brief-gen-icon">📋</div>
            <div className="brief-gen-title">Generate your Day Before Brief</div>
            <div className="brief-gen-sub">
              Pulls your top 3 stories, 2 company facts, interviewer note, and 3 questions into one page. Takes ~15 seconds.
            </div>
            <button className="btn" style={{ maxWidth: 280 }} onClick={generate}>Generate Brief</button>
          </div>
        </div>
      </>
    )
  }

  // Full-ink takeover once a brief exists — marks "you're done prepping,
  // now reading," distinct from every other (light) screen in the app.
  const stats = briefReadStats(brief)
  return (
    <div className="brief-ink">
      <div className="brief-ink-topbar">
        <button className="brief-ink-back" onClick={goBack}>← Back</button>
        <button className="brief-ink-regen" onClick={generate}>Regenerate</button>
      </div>
      <div className="brief-ink-content">
        <div className="brief-ink-eyebrow">Day before · read once</div>
        <div className="brief-ink-title">{round.type}</div>
        <div className="brief-ink-sub">
          {campaignLabel(campaign)}
          {round.interviewerSignals?.name ? ` · ${round.interviewerSignals.name}` : ''}
          {' · '}{round.scheduledAt ? fmtScheduled(round.scheduledAt) : 'Not scheduled'}
        </div>
        <div className="brief-ink-readtime">~{stats.minutes} min read · {stats.words} words</div>

        <div className="brief-ink-sec">
          <div className="brief-ink-sec-title">Lead with these</div>
          {(brief.storiesToLead ?? []).map((s, i) => (
            <div key={i} className="brief-ink-story">
              <span className="brief-ink-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="brief-ink-story-title">{s.title}</div>
                <div className="brief-ink-story-angle">{s.angle}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="brief-ink-cols">
          <div className="brief-ink-sec">
            <div className="brief-ink-sec-title">Facts to drop</div>
            {(brief.companyFacts ?? []).map((f, i) => (
              <div key={i} className="brief-ink-line">{f}</div>
            ))}
          </div>
          <div className="brief-ink-sec">
            <div className="brief-ink-sec-title">Questions to ask</div>
            {(brief.questionsToAsk ?? []).map((q, i) => (
              <div key={i} className="brief-ink-line">{q}</div>
            ))}
          </div>
        </div>

        {brief.interviewerNote && (
          <div className="brief-ink-sec">
            <div className="brief-ink-sec-title">Interviewer note</div>
            <div className="brief-ink-note">{brief.interviewerNote}</div>
          </div>
        )}

        <div className="brief-ink-footnote">
          {matched.length > 0
            ? `Pulled from ${Math.min(matched.length, 5)} of your Story Bank ${matched.length === 1 ? 'entry' : 'entries'} matched to this round, plus your company cards${round.interviewerSignals ? ' and interviewer profile' : ''}.`
            : `No matching Story Bank entries yet — add stories in the Stories tab for a more grounded brief. Uses company cards${round.interviewerSignals ? ' and interviewer profile' : ''} only.`}
          {brief.generatedAt ? ` Generated ${fmtDate(brief.generatedAt)}.` : ''}
        </div>
      </div>
    </div>
  )
}
