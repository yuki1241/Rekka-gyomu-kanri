import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'
import { createOtpCookieValue, COOKIE_NAME, MAX_AGE } from '@/lib/otp-cookie'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'コードが必要です' }, { status: 400 })
  }

  const email = session.user.email
  const supabase = createServerSupabase()

  const { data } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code.trim())
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) {
    return NextResponse.json({ error: '認証コードが正しくないか、期限切れです' }, { status: 400 })
  }

  // 使用済みコードを削除
  await supabase.from('otp_codes').delete().eq('email', email)

  // OTPセッションCookieを設定
  const cookieValue = await createOtpCookieValue(email)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })

  return res
}
