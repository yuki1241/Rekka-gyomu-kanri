import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function isReminderDueToday(task: {
  reminder_start: string | null
  reminder_interval: number | null
  reminder_unit: string | null
  reminder_last_sent_at: string | null
  reminder_end_type: string | null
  reminder_end_date: string | null
  reminder_end_count: number | null
  reminder_sent_count: number | null
}, today: string): boolean {
  if (!task.reminder_start || !task.reminder_interval || !task.reminder_unit) return false

  const start = new Date(task.reminder_start)
  const todayDate = new Date(today)

  if (todayDate < start) return false

  // 終了チェック
  if (task.reminder_end_type === 'date' && task.reminder_end_date) {
    if (todayDate > new Date(task.reminder_end_date)) return false
  }
  if (task.reminder_end_type === 'count' && task.reminder_end_count !== null && task.reminder_sent_count !== null) {
    if (task.reminder_sent_count >= task.reminder_end_count) return false
  }

  // 次回送信日の計算
  const lastSent = task.reminder_last_sent_at ? new Date(task.reminder_last_sent_at) : new Date(start.getTime() - 86400000)
  const next = new Date(lastSent)
  const interval = task.reminder_interval

  if (task.reminder_unit === 'day') next.setDate(next.getDate() + interval)
  else if (task.reminder_unit === 'week') next.setDate(next.getDate() + interval * 7)
  else if (task.reminder_unit === 'month') next.setMonth(next.getMonth() + interval)
  else if (task.reminder_unit === 'year') next.setFullYear(next.getFullYear() + interval)

  return next.toISOString().split('T')[0] <= today
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, due_date, user_email, reminder_start, reminder_interval, reminder_unit, reminder_last_sent_at, reminder_end_type, reminder_end_date, reminder_end_count, reminder_sent_count')
    .eq('reminder_enabled', true)
    .neq('status', 'done')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dueTasks = (tasks ?? []).filter((t) => isReminderDueToday(t, today))

  const results: string[] = []

  for (const task of dueTasks) {
    if (!task.user_email) continue

    const isOverdue = task.due_date && task.due_date < today
    const subject = isOverdue
      ? `【期限超過】タスクリマインド: ${task.title}`
      : `【リマインド】タスク: ${task.title}`

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: task.user_email,
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#1e293b;margin-bottom:8px">${isOverdue ? '⚠️ 期限超過のタスク' : '🔔 タスクリマインド'}</h2>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
              <p style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 8px">${task.title}</p>
              ${task.due_date ? `<p style="font-size:13px;color:${isOverdue ? '#dc2626' : '#64748b'};margin:0">期限: ${task.due_date}${isOverdue ? '（超過）' : ''}</p>` : ''}
            </div>
            <p style="font-size:12px;color:#94a3b8">Rekka Portal からのリマインドメールです</p>
          </div>
        `,
      })

      await supabase
        .from('tasks')
        .update({
          reminder_last_sent_at: today,
          reminder_sent_count: (task.reminder_sent_count ?? 0) + 1,
        })
        .eq('id', task.id)

      results.push(`sent: ${task.id}`)
    } catch {
      results.push(`failed: ${task.id}`)
    }
  }

  return NextResponse.json({ date: today, processed: dueTasks.length, results })
}
