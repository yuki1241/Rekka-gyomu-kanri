import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { verifyOtpCookie, COOKIE_NAME } from '@/lib/otp-cookie'

// 認証不要なパス
const PUBLIC_PATHS = ['/login', '/verify-otp', '/_next', '/favicon.ico']
// Google OAuth・OTP API は常に通過
const AUTH_API_PREFIXES = ['/api/auth/']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }
  if (AUTH_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Googleログイン済みか確認
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // OTP検証済みか確認
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
