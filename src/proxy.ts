import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isAuthCallback = pathname === '/auth/callback'
  // The recovery link lands here with the session established client-side via
  // a URL hash fragment - the server doesn't see it as authenticated on the
  // first request, so this route must stay reachable regardless.
  const isResetPassword = pathname === '/reset-password'
  const isApiRoute = pathname.startsWith('/api/')
  const isPublicAsset = pathname.startsWith('/_next') || pathname.includes('.')

  if (!user && !isLoginPage && !isAuthCallback && !isResetPassword && !isApiRoute && !isPublicAsset) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isLoginPage) {
    const next = request.nextUrl.searchParams.get('next')
    return NextResponse.redirect(new URL(next && next.startsWith('/') ? next : '/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
