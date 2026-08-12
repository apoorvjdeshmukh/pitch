'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import SourceNote from '@/components/SourceNote'
import Hint from '@/components/Hint'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { analyzeProfilePrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { useSmartBack } from '@/lib/useSmartBack'
import { COMP } from '@/lib/constants'
import type { Profile } from '@/lib/types'

function fmtDate(iso: string) { try { return new Date(iso).toLocaleDateString() } catch { return '' } }

export default function ProfilePage() {
  const router = useRouter()
  const goBack = useSmartBack('/')
  const { profile, setProfile, bank, user } = useApp()

  const [linkedin, setLinkedin] = useState(profile.linkedin ?? '')
  const [resume, setResume] = useState(profile.resume ?? '')
  const [summary, setSummary] = useState(profile.summary ?? '')
  const [firstName, setFirstName] = useState(profile.firstName ?? '')
  const [lastName, setLastName] = useState(profile.lastName ?? '')

  async function saveName() {
    await setProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
    showToast('Name saved.', 'info', 2000)
  }

  async function analyze() {
    if (!linkedin.trim() && !resume.trim()) {
      showToast('Paste your LinkedIn export or resume text first.')
      return
    }
    showLoading('Analyzing your background...')
    try {
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: analyzeProfilePrompt(linkedin, resume) }],
      }, appendStreamText)
      const result = parseJSON<Pick<Profile, 'summary' | 'competencies'>>(text)
      await setProfile({ summary: result.summary, competencies: result.competencies, linkedin: linkedin.trim(), resume: resume.trim() })
      setSummary(result.summary)
      hideLoading('Profile built')
    } catch (e) {
      hideLoading()
      showToast('Profile analysis failed: ' + (e as Error).message)
    }
  }

  async function saveSummaryEdit() {
    await setProfile({ summary })
    showToast('Profile summary saved.', 'info', 2500)
  }

  const storyCompetencies = new Set(bank.flatMap(s => s.competencies))
  const claimedKeys = new Set((profile.competencies ?? []).map(c => c.key))

  return (
    <>
      <div className="header">
        <button className="header-back" onClick={goBack}>←</button>
        <span className="header-title">Your Profile</span>
      </div>
      <Breadcrumb crumbs={[
        { label: 'Campaigns', onClick: () => router.push('/') },
        { label: 'Profile' },
      ]} />
      <div className="content">
        <div className="sec">
          <div className="sec-title">Your Name</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>First name</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Apoorv" />
            </div>
            <div className="form-group">
              <label>Last name</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Deshmukh" />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="text" value={user?.email ?? ''} disabled />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-outline"
              onClick={saveName}
              disabled={firstName.trim() === (profile.firstName ?? '') && lastName.trim() === (profile.lastName ?? '')}
            >
              Save name
            </button>
          </div>
        </div>

        <Hint id="profile-build" text="Paste your LinkedIn export or resume here once — it personalizes the fit analysis on every campaign you create from now on.">
        <div className="sec">
          <div className="sec-title">Build from LinkedIn / Resume</div>
          <p className="tab-subtitle" style={{ margin: '0 0 0.75rem' }}>
            Paste either or both — used to write your profile summary and match it against real competencies, instead of generating a generic candidate.
          </p>
          <div className="form-group">
            <label>LinkedIn profile (exported text)</label>
            <textarea
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              style={{ minHeight: 120 }}
              placeholder="Export your LinkedIn profile and paste the text here..."
            />
          </div>
          <div className="form-group">
            <label>Resume</label>
            <textarea
              value={resume}
              onChange={e => setResume(e.target.value)}
              style={{ minHeight: 120 }}
              placeholder="Paste your resume text here..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-blue" onClick={analyze}>
              {profile.updatedAt ? 'Re-analyze' : 'Analyze & Build Profile'}
            </button>
          </div>
        </div>
        </Hint>

        {profile.updatedAt && (
          <>
            <div className="sec">
              <div className="sec-title">Profile Summary</div>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                style={{ minHeight: 110 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn-outline" onClick={saveSummaryEdit} disabled={summary === profile.summary}>
                  Save edit
                </button>
              </div>
              <SourceNote>Used as your background in every new campaign's fit analysis. Last built {fmtDate(profile.updatedAt)}.</SourceNote>
            </div>

            <div className="sec">
              <div className="sec-title">Competency Coverage</div>
              <p className="tab-subtitle" style={{ margin: '0 0 0.75rem' }}>
                What your profile claims vs. what your Story Bank can actually back up in an interview. Nothing here edits your profile automatically.
              </p>
              {Object.entries(COMP).map(([key, label]) => {
                const claimed = claimedKeys.has(key)
                const backed = storyCompetencies.has(key)
                const evidence = (profile.competencies ?? []).find(c => c.key === key)?.evidence
                if (!claimed && !backed) return null
                return (
                  <div key={key} className="comp-row">
                    <div className={`comp-dot ${backed ? 'covered' : 'gap'}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="comp-name">{label}</div>
                      <div className="comp-story">
                        {claimed && evidence ? evidence : 'Backed by a Story Bank entry, not yet claimed in your profile.'}
                      </div>
                      {claimed && !backed && (
                        <div className="comp-story" style={{ color: 'var(--danger)' }}>No Story Bank entry backs this up yet.</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
