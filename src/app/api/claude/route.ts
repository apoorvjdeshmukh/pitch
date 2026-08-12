import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const ALLOWED_MODELS = new Set(['claude-sonnet-4-6'])
const MAX_TOKENS_LIMIT = 5000

export const maxDuration = 60

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  })
  if (!userRes.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Optional cost gate: if ALLOWED_EMAILS is set, only those emails can trigger
  // generation (everyone else can still sign in and browse, just not generate).
  // Unset = open to any authenticated user, same as before this existed.
  const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  if (allowedEmails.length > 0) {
    const userJson = await userRes.json().catch(() => null) as { email?: string } | null
    const email = userJson?.email?.toLowerCase()
    if (!email || !allowedEmails.includes(email)) {
      return NextResponse.json({ error: 'You are not an authorized user' }, { status: 403 })
    }
  }

  try {
    const body = await req.json()

    const model: string = body.model ?? 'claude-sonnet-4-6'
    if (!ALLOWED_MODELS.has(model)) {
      return NextResponse.json({ error: 'Model not allowed' }, { status: 400 })
    }

    const maxTokens: number = Math.min(body.max_tokens ?? 1024, MAX_TOKENS_LIMIT)
    const stream: boolean = !!body.stream

    const payload = {
      model,
      max_tokens: maxTokens,
      stream,
      ...(body.system ? { system: body.system } : {}),
      messages: body.messages,
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    })

    if (stream) {
      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '')
        let parsed: unknown
        try { parsed = JSON.parse(errText) } catch { parsed = { error: errText || 'API error' } }
        return NextResponse.json(parsed, { status: response.status || 500 })
      }
      return new NextResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
