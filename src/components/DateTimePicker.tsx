'use client'

import { useEffect, useRef, useState } from 'react'
import { fmtScheduled } from '@/lib/format'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MINUTE_OPTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

function pad(n: number): string { return String(n).padStart(2, '0') }

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

interface Props {
  value: string | null | undefined
  onChange: (iso: string | null) => void
}

export default function DateTimePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const initial = value ? new Date(value) : new Date()
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(initial))
  const [selectedDay, setSelectedDay] = useState<Date | null>(value ? initial : null)
  const [hour12, setHour12] = useState(() => { const h = initial.getHours() % 12; return h === 0 ? 12 : h })
  const [minute, setMinute] = useState(() => initial.getMinutes())
  const [isPM, setIsPM] = useState(() => initial.getHours() >= 12)

  // Re-sync local picker state whenever the popover is (re)opened, so it
  // reflects the round's current scheduledAt rather than stale edits from a
  // previous open/close cycle.
  useEffect(() => {
    if (!open) return
    const d = value ? new Date(value) : new Date()
    setViewMonth(startOfMonth(d))
    setSelectedDay(value ? d : null)
    const h = d.getHours() % 12
    setHour12(h === 0 ? 12 : h)
    setMinute(d.getMinutes())
    setIsPM(d.getHours() >= 12)
  }, [open, value])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function commit(day: Date, h12: number, min: number, pm: boolean) {
    const hour24 = (h12 % 12) + (pm ? 12 : 0)
    const combined = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour24, min)
    onChange(combined.toISOString())
  }

  function pickDay(day: Date) {
    setSelectedDay(day)
    commit(day, hour12, minute, isPM)
  }

  function updateTime(h12: number, min: number, pm: boolean) {
    setHour12(h12); setMinute(min); setIsPM(pm)
    if (selectedDay) commit(selectedDay, h12, min, pm)
  }

  function clear() {
    onChange(null)
    setSelectedDay(null)
    setOpen(false)
  }

  // MINUTE_OPTS only offers 5-minute increments, but an existing scheduledAt
  // (set elsewhere, e.g. AI-suggested times) can land on any minute. Without
  // this, a value like :13 has no matching <option>, so the <select> silently
  // falls back to displaying :00 - and saving from there would silently
  // overwrite the real time. Splicing the actual value in keeps it visible
  // and preserved until the user deliberately changes it.
  const minuteOpts = MINUTE_OPTS.includes(minute)
    ? MINUTE_OPTS
    : [...MINUTE_OPTS, minute].sort((a, b) => a - b)

  const today = new Date()
  const gridStart = new Date(viewMonth)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="datetime-picker" ref={containerRef}>
      <button
        type="button"
        className={`date-chip${value ? '' : ' empty'}`}
        onClick={() => setOpen(v => !v)}
      >
        {value ? fmtScheduled(value) : 'Not scheduled'}
      </button>
      {open && (
        <div className="dt-popover">
          <div className="dt-cal-head">
            <button type="button" className="dt-cal-nav" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>‹</button>
            <span className="dt-cal-title">{viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <button type="button" className="dt-cal-nav" onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="dt-cal-weekdays">
            {WEEKDAY_LABELS.map(w => <span key={w}>{w}</span>)}
          </div>
          <div className="dt-cal-grid">
            {days.map(d => {
              const inMonth = d.getMonth() === viewMonth.getMonth()
              const isSelected = !!selectedDay && sameDay(d, selectedDay)
              const isToday = sameDay(d, today)
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  className={`dt-cal-day${inMonth ? '' : ' outside'}${isSelected ? ' selected' : ''}${isToday && !isSelected ? ' today' : ''}`}
                  onClick={() => pickDay(d)}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="dt-time-row">
            <select value={hour12} onChange={e => updateTime(Number(e.target.value), minute, isPM)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="dt-time-colon">:</span>
            <select value={minute} onChange={e => updateTime(hour12, Number(e.target.value), isPM)}>
              {minuteOpts.map(m => <option key={m} value={m}>{pad(m)}</option>)}
            </select>
            <div className="dt-ampm">
              <button type="button" className={!isPM ? 'active' : ''} onClick={() => updateTime(hour12, minute, false)}>AM</button>
              <button type="button" className={isPM ? 'active' : ''} onClick={() => updateTime(hour12, minute, true)}>PM</button>
            </div>
          </div>
          <div className="dt-popover-footer">
            <button type="button" className="btn-outline" onClick={clear} disabled={!value}>Clear</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
