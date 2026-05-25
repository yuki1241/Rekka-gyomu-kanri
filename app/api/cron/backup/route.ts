import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const TABLES = [
  'app_users',
  'appointments',
  'tasks',
  'projects',
  'expenses',
  'prospects',
  'contacts',
  'goals',
  'goal_templates',
  'goal_entries',
  'invoices',
  'suggestions',
]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const toEmail = process.env.BACKUP_NOTIFY_EMAIL || 'mum.yuki.k@gmail.com'

  const supabase = createServerSupabase()
  const backup: Record<string, unknown[]> = {}
  const errors: string[] = []

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      errors.push(`${table}: ${error.message}`)
    } else {
      backup[table] = data ?? []
    }
  }

  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const fileName = `rekka-portal-backup-${yearMonth}.json`
  const content = JSON.stringify(
    { backup_at: now.toISOString(), errors, data: backup },
    null,
    2
  )

  const totalRecords = Object.values(backup).reduce((sum, rows) => sum + rows.length, 0)

  await resend.emails.send({
    from: 'Rekka Portal <onboarding@resend.dev>',
    to: toEmail,
    subject: `【月次バックアップ】Rekkaポータル ${yearMonth}`,
    html: `
      <h2>Rekka ポータル 月次バックアップ</h2>
      <p>バックアップ日時：${now.toLocaleString('ja-JP')}</p>
      <table border="1" cellpadding="6" style="border-collapse:collapse;font-size:14px;">
        <tr><th>テーブル</th><th>件数</th></tr>
        ${Object.entries(backup)
          .map(([t, rows]) => `<tr><td>${t}</td><td>${rows.length}件</td></tr>`)
          .join('')}
        <tr><td><strong>合計</strong></td><td><strong>${totalRecords}件</strong></td></tr>
      </table>
      ${errors.length > 0 ? `<p style="color:red">エラー: ${errors.join(', ')}</p>` : ''}
      <p>バックアップファイル（${fileName}）を添付しています。</p>
    `,
    attachments: [
      {
        filename: fileName,
        content: Buffer.from(content).toString('base64'),
      },
    ],
  })

  return NextResponse.json({ success: true, fileName, totalRecords, errors })
}
