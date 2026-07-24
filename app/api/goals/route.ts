import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

const DEFAULT_TEMPLATES = [
  { type: 'KGI', order_num: 1, label: 'KGI（目標）' },
  { type: 'KPI', order_num: 1, label: 'KPI（指標）' },
  ...Array.from({ length: 5 }, (_, i) => ({ type: 'KDI', order_num: i + 1, label: '' })),
]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearMonth = searchParams.get('year_month') ?? ''
  const targetEmail = searchParams.get('target_email')
  const isAdmin = (session.user as { role?: string }).role === 'admin'

  // 管理者が特定メンバーを指定した場合はそのメールアドレスで取得、それ以外は自分
  const userEmail = (isAdmin && targetEmail) ? targetEmail : session.user.email

  const supabase = createServerSupabase()

  // テンプレート取得（なければデフォルト作成）
  let { data: templates } = await supabase
    .from('goal_templates')
    .select('*')
    .eq('user_email', userEmail)
    .order('type').order('order_num')

  if (!templates || templates.length === 0) {
    // 他メンバー表示時はデフォルト作成しない（自分のときのみ作成）
    if (!isAdmin || !targetEmail) {
      const inserts = DEFAULT_TEMPLATES.map((t) => ({ ...t, user_email: userEmail }))
      const { data: created } = await supabase.from('goal_templates').insert(inserts).select()
      templates = created ?? []
    } else {
      templates = []
    }
  }

  // エントリ取得
  let entries: unknown[] = []
  if (yearMonth) {
    const { data } = await supabase
      .from('goal_entries')
      .select('*')
      .eq('user_email', userEmail)
      .eq('year_month', yearMonth)
    entries = data ?? []

    // 当月データが1件もない場合 → 前月の目標値を自動コピー（自分のデータのみ）
    if (entries.length === 0 && (!isAdmin || !targetEmail)) {
      const [y, m] = yearMonth.split('-').map(Number)
      const prevDate = new Date(y, m - 2, 1)
      const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

      const { data: prevEntries } = await supabase
        .from('goal_entries')
        .select('*')
        .eq('user_email', userEmail)
        .eq('year_month', prevYearMonth)

      if (prevEntries && prevEntries.length > 0) {
        const newEntries = prevEntries.map((e: {
          template_id: string
          week_num: number
          target_value: number
        }) => ({
          user_email: userEmail,
          template_id: e.template_id,
          year_month: yearMonth,
          week_num: e.week_num,
          target_value: e.target_value,
          actual_value: 0,
          reflection: '',
        }))

        const { data: inserted } = await supabase
          .from('goal_entries')
          .insert(newEntries)
          .select()

        entries = inserted ?? []
      }
    }
  }

  return NextResponse.json({ templates, entries })
}
