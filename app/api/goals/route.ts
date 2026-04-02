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
  const supabase = createServerSupabase()

  // テンプレート取得（なければデフォルト作成）
  let { data: templates } = await supabase
    .from('goal_templates')
    .select('*')
    .eq('user_email', session.user.email)
    .order('type').order('order_num')

  if (!templates || templates.length === 0) {
    const inserts = DEFAULT_TEMPLATES.map((t) => ({ ...t, user_email: session.user.email }))
    const { data: created } = await supabase.from('goal_templates').insert(inserts).select()
    templates = created ?? []
  }

  // エントリ取得
  let entries: unknown[] = []
  if (yearMonth) {
    const { data } = await supabase
      .from('goal_entries')
      .select('*')
      .eq('user_email', session.user.email)
      .eq('year_month', yearMonth)
    entries = data ?? []
  }

  return NextResponse.json({ templates, entries })
}
