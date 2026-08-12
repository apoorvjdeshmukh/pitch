import { createClient } from './supabase'

// The API route returns two error shapes: genuine Anthropic errors come
// through as {error: {message}} (Anthropic's own format, passed through
// as-is), while our own checks (auth, allowlist, model validation) return
// {error: "..."} as a plain string. Handle both rather than assuming one.
function extractErrorMessage(e: unknown): string {
  const err = (e as { error?: unknown } | null)?.error
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message?: unknown }).message)
  return 'API error'
}

export async function callClaude(body: object): Promise<{ content: Array<{ text: string }> }> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(e))
  }
  return res.json()
}

export async function callClaudeConversation(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maxTokens: number,
): Promise<string> {
  const data = await callClaude({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
  return data.content[0].text
}

// Streams a single-turn completion, calling onDelta for each text chunk as it
// arrives and returning the full accumulated text once the stream ends.
export async function callClaudeStream(
  body: { model: string; max_tokens: number; system?: string; messages: Array<{ role: string; content: string }> },
  onDelta: (chunk: string) => void,
): Promise<string> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
  })
  if (!res.ok || !res.body) {
    const e = await res.json().catch(() => ({}))
    throw new Error(extractErrorMessage(e))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const jsonStr = trimmed.slice(5).trim()
      if (!jsonStr || jsonStr === '[DONE]') continue
      try {
        const evt = JSON.parse(jsonStr)
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          full += evt.delta.text
          onDelta(evt.delta.text)
        }
      } catch {
        // ignore partial/malformed SSE frames
      }
    }
  }

  return full
}

export function parseJSON<T>(text: string): T {
  return JSON.parse(
    text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim(),
  ) as T
}
