import type { FlashCard } from '@/lib/types'
import SourceNote from '@/components/SourceNote'

function CardList({ cards }: { cards: FlashCard[] }) {
  return (
    <div className="cards-list">
      {cards.map((card, i) => (
        <div key={i} className="mini-card">
          <div className="mc-front">{card.front}</div>
          <div className="mc-back">{card.back}</div>
        </div>
      ))}
    </div>
  )
}

export default function CompanyCards({ companyCards, roleVocabCards }: { companyCards: FlashCard[]; roleVocabCards: FlashCard[] }) {
  return (
    <>
      <div className="sec">
        <div className="sec-title">Company Flashcards ({companyCards.length})</div>
        <CardList cards={companyCards} />
      </div>
      <div className="sec">
        <div className="sec-title">Role Vocabulary ({roleVocabCards.length})</div>
        <CardList cards={roleVocabCards} />
        <SourceNote>Generated from the job description and general knowledge — not verified against live company data, so double-check anything time-sensitive.</SourceNote>
      </div>
    </>
  )
}
