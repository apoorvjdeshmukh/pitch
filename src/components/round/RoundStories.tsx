'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COMP, ROUND_COMP } from '@/lib/constants'
import { callClaude, parseJSON } from '@/lib/claude'
import { reframeStoryPrompt } from '@/lib/prompts'
import { showToast } from '@/lib/toastStore'
import Hint from '@/components/Hint'
import type { Campaign, Story } from '@/lib/types'

interface ReframedStory { situation: string; task: string; action: string; result: string }

interface Props {
  campaign: Campaign
  roundId: string
  roundType: string
  hasBrief: boolean
  matchedStories: Story[]
}

export default function RoundStories({ campaign, roundId, roundType, hasBrief, matchedStories }: Props) {
  const router = useRouter()
  const campaignId = campaign.id
  const needed = ROUND_COMP[campaign.track ?? 'pm'][roundType] ?? []
  const coveredMap: Record<string, Story> = {}
  matchedStories.forEach(s => s.competencies.forEach(ck => { if (!coveredMap[ck]) coveredMap[ck] = s }))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [reframed, setReframed] = useState<Record<string, ReframedStory>>({})
  const [reframing, setReframing] = useState<Record<string, boolean>>({})
  const [showingReframed, setShowingReframed] = useState<Record<string, boolean>>({})

  async function reframe(story: Story) {
    setReframing(prev => ({ ...prev, [story.id]: true }))
    try {
      const vocabContext = (campaign.artifacts?.roleVocabCards ?? [])
        .map(c => `${c.front}: ${c.back}`).join('\n')
      const data = await callClaude({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        messages: [{ role: 'user', content: reframeStoryPrompt(story, campaign.role, campaign.company, vocabContext) }],
      })
      const r = parseJSON<ReframedStory>(data.content[0].text)
      setReframed(prev => ({ ...prev, [story.id]: r }))
      setShowingReframed(prev => ({ ...prev, [story.id]: true }))
      setExpanded(prev => ({ ...prev, [story.id]: true }))
    } catch (e) {
      showToast('Reframe failed: ' + (e as Error).message)
    } finally {
      setReframing(prev => ({ ...prev, [story.id]: false }))
    }
  }

  return (
    <>
      <Hint id="day-before-brief" text="Generates a one-page cheat sheet for the night before — your best-matched stories, sharp company facts, and an interviewer note, all in one place.">
        <button className="brief-cta" onClick={() => router.push(`/campaign/${campaignId}/round/${roundId}/brief`)}>
          <div className="brief-cta-left">
            <div className="brief-cta-title">📋 Day Before Brief</div>
            <div className="brief-cta-sub">{hasBrief ? 'Generated · tap to view' : 'Stories + facts + questions in one page'}</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem' }}>›</span>
        </button>
      </Hint>

      <div className="sec">
        <div className="sec-title">Competency coverage — {roundType}</div>
        {needed.map(ck => {
          const story = coveredMap[ck]
          return (
            <div key={ck} className="comp-row">
              <div className={`comp-dot ${story ? 'covered' : 'gap'}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="comp-name" style={story ? {} : { color: '#aaa' }}>{COMP[ck]}</div>
                {story
                  ? <div className="comp-story">{story.title}</div>
                  : <div className="comp-story">No story yet</div>
                }
              </div>
              {!story && (
                <button
                  className="fill-gap-btn"
                  onClick={() => router.push(`/campaign/${campaignId}/round/${roundId}/qa?comp=${ck}`)}
                >
                  Fill gap
                </button>
              )}
            </div>
          )
        })}
      </div>

      {matchedStories.length > 0 && (
        <div className="sec">
          <div className="sec-title">Stories from your bank ({matchedStories.length})</div>
          {matchedStories.map(s => {
            const hasReframe = !!reframed[s.id]
            const useReframed = hasReframe && showingReframed[s.id] !== false
            const active = useReframed ? reframed[s.id] : s
            return (
              <div key={s.id} className="story-card">
                <div className="story-card-header">
                  <div className="story-card-title">{s.title}</div>
                </div>
                <div className="story-chips">
                  {s.competencies.map(ck => (
                    <span key={ck} className="comp-chip">{COMP[ck] ?? ck}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="story-expand"
                    onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                  >
                    {expanded[s.id] ? 'Hide story ↑' : 'Show story ↓'}
                  </button>
                  <button
                    className="story-expand"
                    onClick={() => reframe(s)}
                    disabled={reframing[s.id]}
                  >
                    {reframing[s.id] ? 'Reframing…' : hasReframe ? 'Re-reframe for ' + campaign.company : 'Reframe for ' + campaign.company}
                  </button>
                </div>
                {expanded[s.id] && (
                  <div className="story-detail open">
                    {hasReframe && (
                      <div className="reframe-toggle">
                        <button
                          className={!useReframed ? 'active' : ''}
                          onClick={() => setShowingReframed(prev => ({ ...prev, [s.id]: false }))}
                        >
                          Original
                        </button>
                        <button
                          className={useReframed ? 'active' : ''}
                          onClick={() => setShowingReframed(prev => ({ ...prev, [s.id]: true }))}
                        >
                          Adapted for {campaign.company}
                        </button>
                      </div>
                    )}
                    {useReframed && (
                      <div className="reframe-banner">
                        Reworded for this campaign only — your master story in the Bank is unchanged.
                      </div>
                    )}
                    {[['Situation', active!.situation], ['Task', active!.task], ['Action', active!.action], ['Result', active!.result]].map(([label, text]) => (
                      <div key={label} className="star-row">
                        <div className="star-row-label">{label}</div>
                        <div className="star-row-text">{text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
