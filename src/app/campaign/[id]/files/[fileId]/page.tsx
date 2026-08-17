'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import Breadcrumb from '@/components/Breadcrumb'
import { getFileText } from '@/lib/storage'
import { campaignLabel } from '@/lib/format'

export default function CampaignFileViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { getCampaign } = useApp()

  const campaignId = params.id as string
  const fileId = params.fileId as string
  const campaign = getCampaign(campaignId)
  const file = campaign?.files?.find(f => f.id === fileId)

  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file?.storagePath) return
    let cancelled = false
    getFileText(file.storagePath)
      .then(text => { if (!cancelled) setHtml(text) })
      .catch(err => { if (!cancelled) setError((err as Error).message) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.storagePath])

  if (!campaign) {
    return <div className="content" style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>Campaign not found.</p>
    </div>
  }
  if (!file || file.type !== 'html') {
    return <div className="content" style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--muted)' }}>File not found.</p>
    </div>
  }

  return (
    <div className="file-viewer-page">
      <Breadcrumb crumbs={[
        { label: 'Campaigns', onClick: () => router.push('/') },
        { label: campaignLabel(campaign), onClick: () => router.push(`/campaign/${campaignId}?tab=files`) },
        { label: file.name },
      ]} />
      <div className="file-viewer-frame-wrap">
        {error && <p className="source-note" style={{ padding: '1rem 1.25rem' }}>Failed to load file: {error}</p>}
        {!error && (
          <iframe
            srcDoc={html ?? ''}
            className="file-viewer-frame"
            sandbox="allow-same-origin allow-scripts"
            title={file.name}
          />
        )}
      </div>
    </div>
  )
}
