import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function getWeekMonday(): string {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  return monday.toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabase()
  const today = new Date().toISOString().split('T')[0]
  const weekMonday = getWeekMonday()

  // 全メンバー取得
  const { data: members, error: membersError } = await supabase
    .from('app_users')
    .select('email, name')

  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  // 今週（月〜今日）に提出済みのメールアドレス一覧
  const { data: submitted } = await supabase
    .from('suggestions')
    .select('user_email')
    .gte('submitted_at', weekMonday)
    .lte('submitted_at', today)

  const submittedEmails = new Set((submitted ?? []).map((s) => s.user_email))

  const results: string[] = []

  for (const member of members ?? []) {
    if (submittedEmails.has(member.email)) continue

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: member.email,
        subject: '【意見箱リマインド】今週の意見を提出してください',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b;margin-bottom:8px">💡 今週の意見を投稿してください</h2>
            <p style="font-size:14px;color:#475569;margin-bottom:16px">
              ${member.name || member.email} さん、今週（${weekMonday}〜）の意見箱への投稿がまだです。
            </p>
            <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin:16px 0">
              <p style="font-size:13px;color:#713f12;margin:0">
                意見がない場合は「今週は意見なし」にチェックを入れてください。
                チェックするとこのリマインドは届かなくなります。
              </p>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:16px">Rekka Portal 意見箱より</p>
          </div>
        `,
      })
      results.push(`sent: ${member.email}`)
    } catch {
      results.push(`failed: ${member.email}`)
    }
  }

  return NextResponse.json({
    date: today,
    weekMonday,
    totalMembers: (members ?? []).length,
    alreadySubmitted: submittedEmails.size,
    reminded: results.length,
    results,
  })
}
