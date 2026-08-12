'use client'

import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { analyzeIvPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import type { Campaign, InterviewerSignals } from '@/lib/types'
import SourceNote from '@/components/SourceNote'
import Hint from '@/components/Hint'

interface Props {
  campaign: Campaign
  roundId: string
}

export default function InterviewerPanel({ campaign, roundId }: Props) {
  const { mutateRound, getRound } = useApp()
  const round = getRound(campaign.id, roundId)
  const [profile, setProfile] = useState(round?.interviewerProfile ?? '')
  const [signals, setSignals] = useState<InterviewerSignals | null>(round?.interviewerSignals ?? null)

  async function analyze() {
    const text = profile.trim()
    if (!text) return
    await mutateRound(campaign.id, roundId, r => { r.interviewerProfile = text })
    showLoading('Analyzing interviewer profile...')
    try {
      const streamed = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: analyzeIvPrompt(campaign.role, campaign.company, round?.type ?? '', text) }],
      }, appendStreamText)
      const s = parseJSON<InterviewerSignals>(streamed)
      await mutateRound(campaign.id, roundId, r => { r.interviewerSignals = s; r.interviewerProfile = text })
      setSignals(s)
      hideLoading('Interviewer analyzed')
    } catch (e) {
      hideLoading()
      showToast('Analysis failed: ' + (e as Error).message)
    }
  }

  async function onBlur() {
    await mutateRound(campaign.id, roundId, r => { r.interviewerProfile = profile })
  }

  return (
    <>
      <Hint id="interviewer-profile" text="Paste their LinkedIn profile text here to get signals on what they care about and how to angle your stories.">
        <div className="sec">
          <div className="sec-title">Interviewer Profile</div>
          <div className="form-group">
            <label>Paste exported LinkedIn profile text</label>
            <textarea
              style={{ minHeight: 140 }}
              placeholder="Export the interviewer's LinkedIn profile and paste the text here..."
              value={profile}
              onChange={e => setProfile(e.target.value)}
              onBlur={onBlur}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-blue" onClick={analyze} disabled={!profile.trim()}>
              {signals ? 'Re-analyze' : 'Analyze Profile'}
            </button>
          </div>
        </div>
      </Hint>

      {signals && (
        <div className="sec">
          <div className="sec-title">Interviewer Signals</div>
          <div className="sig-name">{signals.name || 'Interviewer'}</div>
          <div className="sig-role">{signals.title}</div>
          {signals.background && (
            <div className="sig-block">
              <div className="sig-label">Background</div>
              <div className="sig-val">{signals.background}</div>
            </div>
          )}
          <div className="sig-block">
            <div className="sig-label">What they likely care about</div>
            {(signals.priorities ?? []).map((p, i) => (
              <div key={i} className="sig-val" style={{ marginBottom: '0.25rem' }}>· {p}</div>
            ))}
          </div>
          <div className="sig-block">
            <div className="sig-label">How to angle your stories</div>
            <div className="sig-val">{signals.storyAngle}</div>
          </div>
          <div className="sig-block">
            <div className="sig-label">Questions to ask them</div>
            {(signals.questionsToAsk ?? []).map((q, i) => (
              <div key={i} className="sig-val" style={{ marginBottom: '0.25rem' }}>· {q}</div>
            ))}
          </div>
          {signals.keyInsight && (
            <div className="insight-box">💡 {signals.keyInsight}</div>
          )}
          <SourceNote>Based entirely on the profile text you pasted above — no live LinkedIn lookup happens.</SourceNote>
        </div>
      )}
    </>
  )
}
