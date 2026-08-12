'use client'

import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { callClaudeStream, callClaudeConversation, parseJSON } from '@/lib/claude'
import { qaSystemPrompt, synthesizeStoryPrompt } from '@/lib/prompts'
import { showLoading, hideLoading, appendStreamText } from '@/lib/loadingStore'
import { showToast } from '@/lib/toastStore'
import { COMP } from '@/lib/constants'
import type { QAMessage, Story } from '@/lib/types'

interface Props {
  competencyKey: string
  contextLabel: string
  company: string
  campaignId: string
  fromRound?: string
  onSaved: (story: Story) => void | Promise<void>
}

export default function QAFlow({ competencyKey, contextLabel, company, campaignId, fromRound, onSaved }: Props) {
  const { addStory, uid } = useApp()
  const competencyLabel = COMP[competencyKey] ?? competencyKey

  const [messages, setMessages] = useState<Array<{ role: 'coach' | 'user'; text: string }>>([])
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([])
  const [exchangeCount, setExchangeCount] = useState(0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showSynthesize, setShowSynthesize] = useState(false)
  const [draft, setDraft] = useState<Partial<Story> | null>(null)
  const [starFields, setStarFields] = useState({ title: '', situation: '', task: '', action: '', result: '' })
  const msgsRef = useRef<HTMLDivElement>(null)

  const scrollDown = () => { msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' }) }

  useEffect(() => {
    if (!competencyKey) return
    const init = async () => {
      showLoading('Starting conversation...')
      const initMsg: QAMessage = {
        role: 'user',
        content: `I want to build a story for the competency: "${competencyLabel}". Context: ${contextLabel} at ${company}. Please ask me your first question to get started.`,
      }
      try {
        const response = await callClaudeConversation(
          [initMsg],
          qaSystemPrompt(competencyLabel, contextLabel, company),
          300,
        )
        setQaMessages([initMsg, { role: 'assistant', content: response }])
        setMessages([{ role: 'coach', text: response }])
        hideLoading()
        setTimeout(scrollDown, 100)
      } catch (e) {
        hideLoading()
        showToast('Failed to start: ' + (e as Error).message)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const userMsg: QAMessage = { role: 'user', content: text }
    const newQaMsgs = [...qaMessages, userMsg]
    setQaMessages(newQaMsgs)
    setMessages(prev => [...prev, { role: 'user', text }, { role: 'coach', text: '…' }])
    const newCount = exchangeCount + 1
    setExchangeCount(newCount)
    if (newCount >= 3) setShowSynthesize(true)
    setTimeout(scrollDown, 50)

    try {
      const response = await callClaudeConversation(
        newQaMsgs,
        qaSystemPrompt(competencyLabel, contextLabel, company),
        300,
      )
      const assistantMsg: QAMessage = { role: 'assistant', content: response }
      setQaMessages(prev => [...prev, assistantMsg])
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'coach', text: response }
        return copy
      })
    } catch (e) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'coach', text: 'Error: ' + (e as Error).message }
        return copy
      })
    }
    setSending(false)
    setTimeout(scrollDown, 50)
  }

  async function synthesize() {
    showLoading('Synthesizing your story...')
    const transcript = qaMessages
      .slice(1)
      .map(m => (m.role === 'assistant' ? 'Coach' : 'You') + ': ' + m.content)
      .join('\n\n')
    try {
      const text = await callClaudeStream({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: synthesizeStoryPrompt(competencyLabel, competencyKey, transcript) }],
      }, appendStreamText)
      const d = parseJSON<Partial<Story>>(text)
      hideLoading('Story synthesized')
      setDraft(d)
      setStarFields({
        title: (d.title as string) ?? '',
        situation: (d.situation as string) ?? '',
        task: (d.task as string) ?? '',
        action: (d.action as string) ?? '',
        result: (d.result as string) ?? '',
      })
    } catch (e) {
      hideLoading()
      showToast('Synthesis failed: ' + (e as Error).message)
    }
  }

  async function save() {
    if (!starFields.situation && !starFields.action) {
      showToast('Fill in at least Situation and Action before saving.')
      return
    }
    showLoading('Saving story...')
    const story: Story = {
      id: uid(),
      title: starFields.title || draft?.title as string || 'Untitled story',
      situation: starFields.situation,
      task: starFields.task,
      action: starFields.action,
      result: starFields.result,
      competencies: (draft?.competencies as string[]) ?? [competencyKey],
      createdAt: new Date().toISOString(),
      fromCampaign: campaignId,
      fromRound,
    }
    await addStory(story)
    hideLoading()
    await onSaved(story)
  }

  return (
    <>
      <div className="qa-messages" ref={msgsRef}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'coach' ? 'chat-coach' : 'chat-user'}>{m.text}</div>
        ))}
      </div>

      {draft ? (
        <div style={{ padding: '0 1.25rem 1.5rem' }}>
          <div className="sec">
            <div className="sec-title">Your Story Draft — Review &amp; Edit</div>
            <div className="star-field">
              <div className="star-label">Story title</div>
              <input type="text" value={starFields.title} onChange={e => setStarFields(p => ({ ...p, title: e.target.value }))} />
            </div>
            {(['situation', 'task', 'action', 'result'] as const).map(f => (
              <div key={f} className={`star-field${f === 'action' ? ' action' : ''}`}>
                <div className="star-label">{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                <textarea value={starFields[f]} onChange={e => setStarFields(p => ({ ...p, [f]: e.target.value }))} />
              </div>
            ))}
            <button className="btn" style={{ marginTop: '0.5rem' }} onClick={save}>Save to Story Bank</button>
          </div>
        </div>
      ) : (
        <div className="qa-input-wrap">
          <div className="qa-input-row">
            <textarea
              placeholder="Your answer..."
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button className="btn-blue" onClick={send} disabled={!input.trim() || sending}>Send</button>
          </div>
          {showSynthesize ? (
            <div className="qa-force">
              <button className="btn-outline" style={{ width: '100%' }} onClick={synthesize}>
                Generate story from our conversation ↗
              </button>
            </div>
          ) : (
            <p className="qa-hint">
              {exchangeCount}/3 answers — story generation unlocks after 3
            </p>
          )}
        </div>
      )}
    </>
  )
}
