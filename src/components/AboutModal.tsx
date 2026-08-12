'use client'

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">About Pitch</div>

        <div className="form-group">
          <label>Why this app exists</label>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--ink)' }}>
            Prepping for a PM interview loop means different stories, different company facts,
            and different vocabulary for every round of every company — and doing that in scattered
            docs falls apart the moment you&apos;re running more than one live campaign at a time.
            Pitch treats each job application as a &ldquo;campaign&rdquo; with a shared foundation
            (fit analysis, company and role vocab) plus round-specific prep, so nothing gets
            rebuilt from scratch each time.
          </p>
        </div>

        <div className="form-group">
          <label>How to use it well</label>
          <ol style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--ink)', paddingLeft: '1.1rem', margin: 0 }}>
            <li><strong>Build your Profile once</strong> — paste your LinkedIn export or resume, get a real background summary used to personalize every campaign's fit analysis instead of a generic one.</li>
            <li><strong>Start a Campaign</strong> — paste the JD, get a fit analysis grounded in your actual background, plus company and vocab flashcards.</li>
            <li><strong>Add Rounds</strong> — one per stage, each with tailored prep artifacts you can regenerate once you've added an interviewer or matched stories.</li>
            <li><strong>Add the Interviewer</strong> — paste their LinkedIn profile for signals on what they care about and how to angle your stories.</li>
            <li><strong>Build your Story Bank once</strong> — STAR stories tagged by competency, reused automatically across every campaign and round, with visible gaps. Reframe any story into a specific company's language without changing the facts.</li>
            <li><strong>Generate a Day-Before Brief</strong> — best-matched stories, sharp company facts, and an interviewer note in one pre-interview sheet.</li>
            <li><strong>Upload files per campaign</strong> — resumes, offer letters, or reference docs, isolated to that campaign only, up to 10 files.</li>
            <li><strong>Watch it generate live</strong> — every AI step streams in real time instead of a blank spinner, and shows what it's actually grounded in (the JD, your background, your Story Bank) rather than a black box.</li>
          </ol>
        </div>

        <div className="form-group">
          <label>Good to know</label>
          <ul style={{ fontSize: '0.85rem', lineHeight: 1.65, color: 'var(--muted)', paddingLeft: '1.1rem', margin: 0 }}>
            <li>Not interviewing anymore, or want a campaign out of the list without deleting it? Mark it inactive or hidden from its page header.</li>
            <li>Sign in with Google, or with email/password if you'd rather — a "Forgot password?" link is on the login page for the latter.</li>
          </ul>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
