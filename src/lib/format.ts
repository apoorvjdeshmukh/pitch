import type { InterviewerSignals, Story, Profile, Brief } from './types'

export function campaignLabel(c: { role: string; company: string }) {
  return `${c.company}: ${c.role}`
}

// Local-time value for an <input type="datetime-local">, derived from a stored ISO string.
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Word count and read time (200wpm, rounded up, min 1 min) across every
// field a candidate actually reads on the Day Before Brief.
export function briefReadStats(brief: Brief): { words: number; minutes: number } {
  const text = [
    ...(brief.storiesToLead ?? []).flatMap(s => [s.title, s.angle]),
    ...(brief.companyFacts ?? []),
    brief.interviewerNote,
    ...(brief.questionsToAsk ?? []),
  ].filter(Boolean).join(' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return { words, minutes: Math.max(1, Math.ceil(words / 200)) }
}

export function fitScoreEmoji(score: number): string {
  if (score >= 9) return '🤩'
  if (score >= 7) return '😃'
  if (score >= 5) return '🙂'
  if (score >= 3) return '😕'
  return '😬'
}

// Short relative phrasing for a future ISO date, e.g. "in 3h", "tomorrow", "in 5d".
export function relativeFromNow(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return 'now'
  const hours = diffMs / 3_600_000
  if (hours < 24) return `in ${Math.max(1, Math.round(hours))}h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

export function fmtScheduled(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch { return '' }
}

// Earliest scheduledAt among a campaign's rounds, or null if none are scheduled.
export function nextScheduled(rounds: Array<{ scheduledAt?: string | null }>): string | null {
  const dates = rounds.map(r => r.scheduledAt).filter((d): d is string => !!d)
  if (dates.length === 0) return null
  return dates.reduce((soonest, d) => (new Date(d) < new Date(soonest) ? d : soonest))
}

// The round with the earliest scheduledAt, or null if none are scheduled.
export function nextRound<T extends { scheduledAt?: string | null }>(rounds: T[]): T | null {
  const scheduled = rounds.filter((r): r is T & { scheduledAt: string } => !!r.scheduledAt)
  if (scheduled.length === 0) return null
  return scheduled.reduce((soonest, r) => (new Date(r.scheduledAt) < new Date(soonest.scheduledAt) ? r : soonest))
}

export function displayName(profile: Profile | null | undefined): string {
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim()
}

export function interviewerNoteText(signals: InterviewerSignals | null): string {
  if (!signals) return ''
  return `${signals.name}, ${signals.title}. ${signals.background} Likely cares about: ${(signals.priorities ?? []).join(', ')}.`
}

export function storyContextText(stories: Story[], limit = 5): string {
  return stories.slice(0, limit).map(s =>
    `"${s.title}": Situation: ${s.situation} Action: ${(s.action ?? '').slice(0, 200)} Result: ${s.result}`
  ).join('\n---\n')
}

// Turns the raw streaming JSON into something that reads like prose instead
// of code: drops keys/braces/quotes, keeps only the string content being
// written, one line per field. Works incrementally on partial/incomplete
// JSON since it never requires a closing quote or brace to match.
export function formatStreamPreview(raw: string): string {
  let s = raw
  s = s.replace(/"(?:[^"\\]|\\.)*"\s*:\s*/g, '')
  s = s.replace(/[{}[\]]/g, '')
  s = s.replace(/\\n/g, ' ').replace(/\\"/g, '"')
  s = s.replace(/"/g, '')
  s = s.replace(/,\s*/g, '\n')
  s = s.replace(/\n{2,}/g, '\n')
  return s.trim()
}
