'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import QAFlow from '@/components/round/QAFlow'
import { callClaudeStream, parseJSON } from '@/lib/claude'
import { fitAnalysisPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { COMP } from '@/lib/constants'
import { useSmartBack } from '@/lib/useSmartBack'
import { campaignLabel, storyContextText } from '@/lib/format'
import type { FitAnalysis, Story } from '@/lib/types'

export default function CampaignQAPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getCampaign, mutateCamp, background, bank } = useApp()

  const campaignId = params.id as string
  const competencyKey = searchParams.get('comp') ?? ''
  const gapText = searchParams.get('gap') ?? ''
  const goBack = useSmartBack(`/campaign/${campaignId}?tab=overview`)

  const campaign = getCampaign(campaignId)
  const competencyLabel = COMP[competencyKey] ?? competencyKey

  if (!campaign) return null

  async function onSaved(story: Story) {
    showLoading('Updating fit analysis...')
    try {
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: fitAnalysisPrompt(campaign!.role, campaign!.company, campaign!.jd, background, storyContextText([...bank, story])),
        }],
      }, appendStreamText)
      const fitAnalysis = parseJSON<FitAnalysis>(text)
      await mutateCamp(campaignId, c => { c.artifacts.fitAnalysis = fitAnalysis })
      hideLoading('Fit analysis updated')
    } catch (e) {
      hideLoading()
      showToast('Fit analysis update failed: ' + (e as Error).message)
    }
    router.push(`/campaign/${campaignId}?tab=overview`)
  }

  return (
    <div className="qa-page">
      <div className="header">
        <button className="header-back" onClick={goBack}>←</button>
        <span className="header-title">{competencyLabel}</span>
      </div>
      <Breadcrumb crumbs={[
        { label: 'Campaigns', onClick: () => router.push('/') },
        { label: campaignLabel(campaign), onClick: () => router.push(`/campaign/${campaignId}?tab=overview`) },
        { label: competencyLabel },
      ]} />

      <QAFlow
        competencyKey={competencyKey}
        contextLabel={gapText ? `closing this gap in your fit analysis: "${gapText}"` : 'your overall fit for this role'}
        company={campaign.company}
        campaignId={campaignId}
        onSaved={onSaved}
      />
    </div>
  )
}
