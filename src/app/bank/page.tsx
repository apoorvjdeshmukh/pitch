'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import { COMP, ROUND_COMP } from '@/lib/constants'
import { useSmartBack } from '@/lib/useSmartBack'
import type { Story, Track } from '@/lib/types'

// How many of a campaign's actual rounds this story would show up as a
// matched story for, based on competency overlap with that round's type.
function usageCount(story: Story, camps: Array<{ track?: Track; rounds: Array<{ type: string }> }>): number {
  let count = 0
  for (const c of camps) {
    const needed_map = ROUND_COMP[c.track ?? 'pm']
    for (const r of c.rounds) {
      const needed = needed_map[r.type] ?? []
      if (story.competencies.some(ck => needed.includes(ck))) count++
    }
  }
  return count
}

// Scope the "browse by competency" / coverage UI to competencies that
// actually matter for the tracks the user's campaigns are in — otherwise a
// PM-only user would see SWE-only competencies (and vice versa) inflating
// the "covered of total" denominator with keys they'll never fill.
function relevantCompFor(camps: Array<{ track?: Track }>): Record<string, string> {
  const tracks = Array.from(new Set(camps.map(c => c.track ?? 'pm')))
  const tracksToUse: Track[] = tracks.length > 0 ? tracks : ['pm']
  const keys = new Set<string>()
  tracksToUse.forEach(t => {
    Object.values(ROUND_COMP[t]).forEach(needed => needed.forEach(k => keys.add(k)))
  })
  return Object.fromEntries(Object.entries(COMP).filter(([k]) => keys.has(k)))
}

const emptyFields = { title: '', situation: '', task: '', action: '', result: '' }

export default function BankPage() {
  const router = useRouter()
  const goBack = useSmartBack('/')
  const { bank, camps, deleteStory, updateStory } = useApp()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filterKey, setFilterKey] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editFields, setEditFields] = useState(emptyFields)
  const [showAddStory, setShowAddStory] = useState(false)
  const [addComp, setAddComp] = useState('')
  const [addCampaignId, setAddCampaignId] = useState('')

  const relevantComp = relevantCompFor(camps)

  const byComp: Record<string, typeof bank> = {}
  bank.forEach(s => {
    ;(s.competencies ?? []).forEach(ck => {
      if (!byComp[ck]) byComp[ck] = []
      if (!byComp[ck].find(x => x.id === s.id)) byComp[ck].push(s)
    })
  })

  const filteredStories = filterKey ? (byComp[filterKey] ?? []) : bank

  // First story in the current filter auto-selects on load/filter-change so
  // the detail pane is never empty when stories exist.
  useEffect(() => {
    if (!filteredStories.find(s => s.id === selectedId)) {
      setSelectedId(filteredStories[0]?.id ?? null)
      setEditing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, bank.length])

  function toggleExpand(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function removeStory(id: string) {
    if (confirm('Delete this story from your bank?')) await deleteStory(id)
  }

  function storyDetail(s: Story) {
    return (
      <div className="story-detail open">
        {[['Situation', s.situation], ['Task', s.task], ['Action', s.action], ['Result', s.result]].map(([l, t]) => (
          <div key={l} className="star-row">
            <div className="star-row-label">{l}</div>
            <div className="star-row-text">{t}</div>
          </div>
        ))}
      </div>
    )
  }

  function selectStory(id: string) {
    setSelectedId(id)
    setEditing(false)
  }

  function startEdit(s: Story) {
    setEditFields({ title: s.title, situation: s.situation, task: s.task, action: s.action, result: s.result })
    setEditing(true)
  }

  async function saveEdit(s: Story) {
    await updateStory({ ...s, ...editFields })
    setEditing(false)
  }

  function openAddStory() {
    setAddComp(filterKey ?? Object.keys(relevantComp)[0])
    setAddCampaignId(camps[0]?.id ?? '')
    setShowAddStory(true)
  }

  const selectedStory = bank.find(s => s.id === selectedId) ?? null
  const totalComp = Object.keys(relevantComp).length
  const coveredComp = Object.keys(relevantComp).filter(ck => (byComp[ck]?.length ?? 0) > 0).length

  return (
    <>
      {/* ── Mobile (unchanged grouped-list layout) ── */}
      <div className="mobile-view">
        <div className="header">
          <button className="header-back" onClick={goBack}>←</button>
          <span className="header-title">Story Bank{bank.length > 0 ? ` (${bank.length})` : ''}</span>
        </div>
        <Breadcrumb crumbs={[
          { label: 'Campaigns', onClick: () => router.push('/') },
          { label: 'Story Bank' },
        ]} />
        <div className="content">
          {bank.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <div className="empty-title">No stories yet</div>
              <div className="empty-sub">Open a round&apos;s Stories tab and fill a gap to start building your bank.</div>
            </div>
          ) : (
            Object.entries(relevantComp).map(([ck, label]) => {
              const stories = byComp[ck] ?? []
              return (
                <div key={ck} className="bank-group">
                  <div className="bank-group-title">{label}</div>
                  {stories.length === 0 ? (
                    <div className="bank-empty">
                      <div className="bank-empty-text">No stories for this competency yet</div>
                    </div>
                  ) : (
                    stories.map(s => (
                      <div key={s.id} className="story-card">
                        <div className="story-card-header">
                          <div className="story-card-title">{s.title}</div>
                          <button className="story-del" onClick={() => removeStory(s.id)}>✕</button>
                        </div>
                        <div className="story-chips">
                          {(s.competencies ?? []).map(ck2 => (
                            <span key={ck2} className="comp-chip">{COMP[ck2] ?? ck2}</span>
                          ))}
                        </div>
                        <button className="story-expand" onClick={() => toggleExpand(`${s.id}-${ck}`)}>
                          {expanded[`${s.id}-${ck}`] ? 'Hide story ↑' : 'Show story ↓'}
                        </button>
                        {expanded[`${s.id}-${ck}`] && storyDetail(s)}
                      </div>
                    ))
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Desktop (three-pane: filter → list → detail) ── */}
      <div className="desktop-view">
        {bank.length === 0 ? (
          <>
            <div className="header">
              <button className="header-back" onClick={goBack}>←</button>
              <span className="header-title">Story Bank</span>
            </div>
            <Breadcrumb crumbs={[
              { label: 'Campaigns', onClick: () => router.push('/') },
              { label: 'Story Bank' },
            ]} />
            <div className="content">
              <div className="empty-state">
                <div className="empty-icon">📖</div>
                <div className="empty-title">No stories yet</div>
                <div className="empty-sub">Open a round&apos;s Stories tab and fill a gap to start building your bank.</div>
              </div>
            </div>
          </>
        ) : (
          <div className="bank3">
            <div className="bank3-filter">
              <div className="bank3-filter-header">
                <button className="header-back" onClick={goBack}>←</button>
                <span className="workspace-mid-title" style={{ fontSize: '1.05rem' }}>Story Bank</span>
              </div>
              <div className="bank3-filter-sub">{bank.length} stories · {coveredComp} of {totalComp} competencies covered</div>
              <div className="bank3-filter-list">
                <button className={`bank3-filter-item${filterKey === null ? ' active' : ''}`} onClick={() => setFilterKey(null)}>
                  <span>All</span>
                  <span className="bank-comp-count">{bank.length}</span>
                </button>
                {Object.entries(relevantComp).map(([ck, label]) => (
                  <button key={ck} className={`bank3-filter-item${filterKey === ck ? ' active' : ''}`} onClick={() => setFilterKey(ck)}>
                    <span>{label}</span>
                    <span className="bank-comp-count">{byComp[ck]?.length ?? 0}</span>
                  </button>
                ))}
              </div>
              <button className="bank3-add-btn" disabled={camps.length === 0} onClick={openAddStory}>+ Add story</button>
            </div>

            <div className="bank3-list">
              <div className="bank3-list-header">{filterKey ? COMP[filterKey] : 'All'} ({filteredStories.length})</div>
              {filteredStories.length === 0 ? (
                <div className="bank-empty">
                  <div className="bank-empty-text">No stories for this competency yet</div>
                </div>
              ) : (
                filteredStories.map(s => {
                  const uses = usageCount(s, camps)
                  return (
                    <div
                      key={s.id}
                      className={`bank3-story-item${s.id === selectedId ? ' active' : ''}`}
                      onClick={() => selectStory(s.id)}
                    >
                      <div className="bank3-story-item-title">{s.title}</div>
                      <div className="story-chips">
                        {(s.competencies ?? []).map(ck2 => (
                          <span key={ck2} className="comp-chip">{COMP[ck2] ?? ck2}</span>
                        ))}
                      </div>
                      <span className={`story-row-usage${uses === 0 ? ' unused' : ''}`}>{uses > 0 ? `${uses}×` : 'unused'}</span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="bank3-detail">
              {!selectedStory ? (
                <div className="bank-empty" style={{ margin: '2rem' }}>
                  <div className="bank-empty-text">Select a story to view it here.</div>
                </div>
              ) : (
                <div className="bank3-detail-inner">
                  {(() => {
                    const uses = usageCount(selectedStory, camps)
                    return (
                      <div className="bank3-detail-top">
                        <div className="story-chips">
                          {(selectedStory.competencies ?? []).map(ck2 => (
                            <span key={ck2} className="comp-chip">{COMP[ck2] ?? ck2}</span>
                          ))}
                          <span className={`bank3-usage-pill${uses === 0 ? ' unused' : ''}`}>
                            {uses > 0 ? `Used in ${uses} round${uses !== 1 ? 's' : ''}` : 'Not used in any round yet'}
                          </span>
                        </div>
                        {!editing && (
                          <div className="bank3-detail-actions">
                            <button className="bank3-icon-btn" title="Edit story" onClick={() => startEdit(selectedStory)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
                            <button className="bank3-icon-btn danger" title="Delete story" onClick={() => removeStory(selectedStory.id)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {editing ? (
                    <>
                      <div className="star-field" style={{ marginTop: '1rem' }}>
                        <div className="star-label">Story title</div>
                        <input type="text" value={editFields.title} onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      {(['situation', 'task', 'action', 'result'] as const).map(f => (
                        <div key={f} className={`star-field${f === 'action' ? ' action' : ''}`}>
                          <div className="star-label">{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                          <textarea value={editFields[f]} onChange={e => setEditFields(p => ({ ...p, [f]: e.target.value }))} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                        <button className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                        <button className="btn" onClick={() => saveEdit(selectedStory)}>Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bank3-detail-title">{selectedStory.title}</div>
                      {[['01', 'Situation', selectedStory.situation], ['02', 'Task', selectedStory.task], ['03', 'Action', selectedStory.action], ['04', 'Result', selectedStory.result]].map(([num, label, text]) => (
                        <div key={label} className="bank3-star-section">
                          <div className="bank3-star-heading"><span className="bank3-star-num">{num}</span>{label}</div>
                          <p className="bank3-star-text">{text}</p>
                        </div>
                      ))}
                      {usageCount(selectedStory, camps) === 0 && (
                        <div className="bank3-unused-callout">
                          This story hasn&apos;t matched a round yet — it&apos;ll surface automatically once a round in your pipeline needs {(selectedStory.competencies ?? []).map(ck => COMP[ck] ?? ck).join(' or ')}.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddStory && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setShowAddStory(false) }}>
          <div className="modal">
            <div className="modal-title">Add a Story</div>
            <div className="form-group">
              <label>Competency</label>
              <select value={addComp} onChange={e => setAddComp(e.target.value)}>
                {Object.entries(relevantComp).map(([ck, label]) => <option key={ck} value={ck}>{label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Which campaign is this for?</label>
              <select value={addCampaignId} onChange={e => setAddCampaignId(e.target.value)}>
                {camps.map(c => <option key={c.id} value={c.id}>{c.company}: {c.role}</option>)}
              </select>
            </div>
            <p className="source-note">You&apos;ll build the story through a short guided conversation, same as filling a gap from a round.</p>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setShowAddStory(false)}>Cancel</button>
              <button
                className="btn"
                disabled={!addCampaignId}
                onClick={() => router.push(`/campaign/${addCampaignId}/qa?comp=${addComp}`)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
