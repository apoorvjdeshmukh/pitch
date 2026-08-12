'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import QAFlow from '@/components/round/QAFlow'
import { COMP } from '@/lib/constants'
import { useSmartBack } from '@/lib/useSmartBack'
import { campaignLabel } from '@/lib/format'

export default function QAPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getCampaign, getRound } = useApp()

  const campaignId = params.id as string
  const roundId = params.roundId as string
  const competencyKey = searchParams.get('comp') ?? ''
  const goBack = useSmartBack(`/campaign/${campaignId}/round/${roundId}`)

  const campaign = getCampaign(campaignId)
  const round = getRound(campaignId, roundId)
  const competencyLabel = COMP[competencyKey] ?? competencyKey

  if (!campaign || !round) return null

  return (
    <div className="qa-page">
      <div className="header">
        <button className="header-back" onClick={goBack}>←</button>
        <span className="header-title">{competencyLabel}</span>
      </div>
      <Breadcrumb crumbs={[
        { label: 'Campaigns', onClick: () => router.push('/') },
        { label: campaignLabel(campaign), onClick: () => router.push(`/campaign/${campaignId}`) },
        { label: round.type, onClick: () => router.push(`/campaign/${campaignId}/round/${roundId}`) },
        { label: competencyLabel },
      ]} />

      <QAFlow
        competencyKey={competencyKey}
        contextLabel={round.type}
        company={campaign.company}
        campaignId={campaignId}
        fromRound={roundId}
        onSaved={async () => router.push(`/campaign/${campaignId}/round/${roundId}`)}
      />
    </div>
  )
}
