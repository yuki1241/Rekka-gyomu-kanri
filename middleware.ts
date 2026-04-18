import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const COOKIE_NAME = 'otp_session'
const MAX_AGE_MS = 60 * 60 * 8 * 1000 // 8時間

async function verifyOtpCookie(cookieValue: string, email: string): Promise<boolean> {
  try {
    const decoded = atob(cookieValue)
    const firstBar = decoded.indexOf('|')
    const secondBar = decoded.indexOf('|', firstBar + 1)
    if (firstBar === -1 || secondBar === -1) return false
    const storedEmail = decoded.slice(0, firstBar)
    const ts = decoded.slice(firstBar + 1, secondBar)
    const sig = decoded.slice(secondBar + 1)
    if (storedEmail !== email) return false
    if (Date.now() - parseInt(ts) > MAX_AGE_MS) return false
    const secret = process.env.NEXTAUTH_SECRET ?? ''
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const buf = await crypto.subtle.sign('HMAC', key, encoder.encode(`${email}|${ts}`))
    const expected = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return sig === expected
  } catch {
    return false
  }
}

const PUBLIC_PATHS = ['/login', '/verify-otp', '/_next', '/favicon.ico']
const AUTH_API_PREFIXES = ['/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (AUTH_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const otpCookie = req.cookies.get(COOKIE_NAME)?.value
  const otpValid = otpCookie ? await verifyOtpCookie(otpCookie, token.email as string) : false
  if (!otpValid) {
    return NextResponse.redirect(new URL('/verify-otp', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
