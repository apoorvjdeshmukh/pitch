'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import FitAnalysis from '@/components/campaign/FitAnalysis'
import CompanyCards from '@/components/campaign/CompanyCards'
import RoundsList from '@/components/campaign/RoundsList'
import CampaignFiles from '@/components/campaign/CampaignFiles'
import Workspace from '@/components/campaign/Workspace'
import SectionNav from '@/components/SectionNav'
import { ARTIFACTS } from '@/lib/constants'
import { useSmartBack } from '@/lib/useSmartBack'
import { campaignLabel } from '@/lib/format'
import type { Campaign } from '@/lib/types'

type Tab = 'overview' | 'rounds' | 'files'
const TABS: Tab[] = ['overview', 'rounds', 'files']
const TAB_SUBTITLES: Record<Tab, string> = {
  overview: 'Fit analysis and company/role vocab shared across every round in this campaign.',
  rounds: "Each interview stage in this loop, with its own tailored prep.",
  files: 'Reference docs, plus your own uploads and links — isolated to this campaign only.',
}

const SECTIONS = [
  { id: 'fit-analysis', label: 'Fit analysis' },
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'files', label: 'Files' },
]

export default function CampaignPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const goBack = useSmartBack('/')
  const { getCampaign, removeCamp, mutateCamp } = useApp()
  const initialTab = TABS.includes(searchParams.get('tab') as Tab) ? (searchParams.get('tab') as Tab) : 'overview'
  const [tab, setTabState] = useState<Tab>(initialTab)
  const contentRef = useRef<HTMLDivElement>(null)

  function setTab(t: Tab) {
    setTabState(t)
    router.replace(`/campaign/${params.id}?tab=${t}`, { scroll: false })
  }

  const campaign = getCampaign(params.id as string)
  if (!campaign) {
    return (
      <div className="content" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Campaign not found.</p>
      </div>
    )
  }

  const campaignFiles = ARTIFACTS.filter(a =>
    a.campaignCompany &&
    campaign.company.toLowerCase().includes(a.campaignCompany.toLowerCase())
  )

  async function deleteCampaign() {
    if (!confirm('Delete this campaign?')) return
    await removeCamp(campaign!.id)
    router.push('/')
  }

  async function toggleActive() {
    await mutateCamp(campaign!.id, c => { c.active = !c.active })
  }

  async function toggleHidden() {
    await mutateCamp(campaign!.id, c => { c.hidden = !c.hidden })
  }

  function renderFilesContent(c: Campaign) {
    return (
      <>
        <CampaignFiles campaign={c} />
        {campaignFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '4px' }}>
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
        )}
      </>
    )
  }

  return (
    <>
      {/* ── Mobile (unchanged tab-bar layout) ── */}
      <div className="mobile-view">
        <div className="header">
          <button className="header-back" onClick={goBack}>←</button>
          <span className="header-title">{campaignLabel(campaign)}</span>
          <button className="header-action" onClick={toggleHidden}>
            {campaign.hidden ? 'Unhide' : 'Hide from list'}
          </button>
          <button className="header-action danger" onClick={deleteCampaign}>Delete</button>
        </div>
        <Breadcrumb crumbs={[
          { label: 'Campaigns', onClick: () => router.push('/') },
          { label: campaignLabel(campaign) },
        ]} />
        <div className="content">
          <div className="sec" style={{ marginBottom: '0.75rem', padding: '0.65rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              {campaign.active ? 'Actively interviewing' : 'Not interviewing anymore'}
            </span>
            <button className="header-action" style={{ flexShrink: 0 }} onClick={toggleActive}>
              {campaign.active ? 'Mark not interviewing' : 'Mark active again'}
            </button>
          </div>
          <div className="tab-bar">
            <button className={`tab-btn${tab === 'overview' ? ' active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
            <button className={`tab-btn${tab === 'rounds' ? ' active' : ''}`} onClick={() => setTab('rounds')}>Rounds</button>
            <button className={`tab-btn${tab === 'files' ? ' active' : ''}`} onClick={() => setTab('files')}>
              Files {(campaignFiles.length + (campaign.files?.length ?? 0)) > 0 && (
                <span className="tab-badge">{campaignFiles.length + (campaign.files?.length ?? 0)}</span>
              )}
            </button>
          </div>
          <p className="tab-subtitle">{TAB_SUBTITLES[tab]}</p>
          {tab === 'overview' && (
            <>
              <FitAnalysis fit={campaign.artifacts.fitAnalysis} campaignId={campaign.id} />
              <CompanyCards
                companyCards={campaign.artifacts.companyCards}
                roleVocabCards={campaign.artifacts.roleVocabCards}
              />
            </>
          )}
          {tab === 'rounds' && <RoundsList campaign={campaign} />}
          {tab === 'files' && renderFilesContent(campaign)}
        </div>
      </div>

      {/* ── Desktop (persistent workspace) ── */}
      <div className="desktop-view">
        <Workspace campaign={campaign}>
          <div className="workspace-content" ref={contentRef}>
            <section id="fit-analysis" className="workspace-section">
              <FitAnalysis fit={campaign.artifacts.fitAnalysis} campaignId={campaign.id} />
            </section>
            <section id="vocabulary" className="workspace-section">
              <CompanyCards
                companyCards={campaign.artifacts.companyCards}
                roleVocabCards={campaign.artifacts.roleVocabCards}
              />
            </section>
            <section id="files" className="workspace-section">
              {renderFilesContent(campaign)}
            </section>
          </div>
          <div className="workspace-rail">
            <SectionNav items={SECTIONS} containerRef={contentRef} />
          </div>
        </Workspace>
      </div>
    </>
  )
}
