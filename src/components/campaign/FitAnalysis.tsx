'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FitAnalysis as FitAnalysisType } from '@/lib/types'
import SourceNote from '@/components/SourceNote'
import { fitScoreEmoji } from '@/lib/format'

interface Props {
  fit: FitAnalysisType
  campaignId: string
  // Offline snapshot view has no live story bank and no network access —
  // render gaps as plain, non-clickable text there instead of dead links.
  interactive?: boolean
}

export default function FitAnalysis({ fit, campaignId, interactive = true }: Props) {
  const router = useRouter()
  const [confirmGap, setConfirmGap] = useState<{ text: string; competencyKey: string } | null>(null)

  return (
    <div className="sec">
      <div className="sec-title fit-title-row">
        <span>Fit Analysis</span>
        {fit.fitScore != null && (
          <span className="fit-score">{fit.fitScore}/10 {fitScoreEmoji(fit.fitScore)}</span>
        )}
      </div>
      <p className="fit-summary">{fit.summary}</p>
      <div className="fit-cols">
        <div className="fit-col str">
          <h4>✓ Strengths</h4>
          {fit.strengths.map((s, i) => <div key={i} className="fit-pill s">{s}</div>)}
        </div>
        <div className="fit-col gap">
          <h4>△ Gaps</h4>
          {fit.gaps.map((g, i) => {
            const text = typeof g === 'string' ? g : g.text
            const remedy = typeof g === 'object' ? g.remedy : null
            const competencyKey = typeof g === 'object' ? g.competencyKey : undefined
            const fillable = interactive && !!competencyKey
            return (
              <div key={i} className="fit-gap-item">
                <div
                  className={`fit-pill g${fillable ? ' fillable' : ''}`}
                  onClick={fillable ? () => setConfirmGap({ text, competencyKey: competencyKey! }) : undefined}
                  title={fillable ? 'Have experience to fill this gap?' : undefined}
                >
                  {text}
                </div>
                {remedy && <div className="fit-remedy">→ {remedy}</div>}
              </div>
            )
          })}
        </div>
      </div>
      <SourceNote>
        {fit.basedOnBackground
          ? 'Based on the job description you pasted and the background you provided.'
          : 'Based on the job description only — add your background when creating a campaign for a personalized read instead of a general one.'}
      </SourceNote>

      {confirmGap && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setConfirmGap(null) }}>
          <div className="modal">
            <div className="modal-title">Have experience to fill this gap?</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{confirmGap.text}</p>
            <div className="modal-footer">
              <button className="btn-outline" onClick={() => setConfirmGap(null)}>No</button>
              <button
                className="btn"
                onClick={() => router.push(`/campaign/${campaignId}/qa?comp=${confirmGap.competencyKey}&gap=${encodeURIComponent(confirmGap.text)}`)}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
