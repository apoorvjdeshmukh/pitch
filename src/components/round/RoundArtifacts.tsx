import type { ArtifactSection, BulletItem, FlashCard } from '@/lib/types'
import SourceNote from '@/components/SourceNote'

function SectionItems({ sec }: { sec: ArtifactSection }) {
  if (sec.type === 'cards') {
    return (
      <div className="cards-list">
        {(sec.items as FlashCard[]).map((c, i) => (
          <div key={i} className="mini-card">
            <div className="mc-front">{c.front}</div>
            <div className="mc-back">{c.back}</div>
          </div>
        ))}
      </div>
    )
  }
  if (sec.type === 'bullets') {
    return (
      <>
        {(sec.items as BulletItem[]).map((item, i) => (
          <div key={i} className="bullet-item">
            <div className="bullet-title">{item.title}</div>
            <div className="bullet-detail">{item.detail}</div>
          </div>
        ))}
      </>
    )
  }
  if (sec.type === 'list') {
    return (
      <>
        {(sec.items as string[]).map((item, i) => (
          <div key={i} className="list-item">· {item}</div>
        ))}
      </>
    )
  }
  return null
}

export default function RoundArtifacts({ sections }: { sections: ArtifactSection[] }) {
  return (
    <>
      {sections.map((sec, i) => (
        <div key={i} className="sec">
          <div className="sec-title">{sec.title}</div>
          <SectionItems sec={sec} />
        </div>
      ))}
      <SourceNote>Based on the job description and round type — regenerate after adding an interviewer profile or bank stories so it can draw on those too.</SourceNote>
    </>
  )
}
