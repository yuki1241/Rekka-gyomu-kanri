import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = session.user.email
  const code = generateOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分

  const supabase = createServerSupabase()

  // 既存コードを削除してから新規作成
  await supabase.from('otp_codes').delete().eq('email', email)
  const { error: dbError } = await supabase.from('otp_codes').insert({
    email,
    code,
    expires_at: expiresAt.toISOString(),
  })

  if (dbError) {
    return NextResponse.json({ error: 'OTP生成に失敗しました' }, { status: 500 })
  }

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: email,
    subject: '【Rekka Portal】ログイン認証コード',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
          <div style="width: 36px; height: 36px; background: #e85d04; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <span style="color: #fff; font-size: 18px;">🔥</span>
          </div>
          <div>
            <p style="margin: 0; font-size: 15px; font-weight: bold; color: #1a1a1a;">Rekka Portal</p>
            <p style="margin: 0; font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Business System</p>
          </div>
        </div>
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #1a1a1a;">ログイン認証コード</h2>
        <p style="margin: 0 0 24px; font-size: 14px; color: #666;">以下の認証コードを入力してください。有効期限は<strong>10分</strong>です。</p>
        <div style="background: #fef3e2; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #e85d04; font-variant-numeric: tabular-nums;">${code}</span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #aaa;">このメールに心当たりがない場合は無視してください。</p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Resend error:', emailError)
    return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
