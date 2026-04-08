import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

// 前月の「月額」フラグ付きレコードを今月にコピーする
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { month } = await req.json() // コピー先の月 (YYYY-MM)
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  // 前月を計算
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const supabase = createServerSupabase()
  const userEmail = session.user.email

  // 前月の月額レコードを取得
  const { data: sourceRecords, error: fetchError } = await supabase
    .from('invoice_records')
    .select('*')
    .eq('user_email', userEmail)
    .eq('month', prevMonth)
    .eq('is_recurring', true)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!sourceRecords || sourceRecords.length === 0) {
    return NextResponse.json({ copied: 0, message: '前月に月額案件がありません' })
  }

  // 今月に既にコピー済みの会社名リストを取得（重複防止）
  const { data: existing } = await supabase
    .from('invoice_records')
    .select('company_name')
    .eq('user_email', userEmail)
    .eq('month', month)

  const existingNames = new Set((existing ?? []).map((r: { company_name: string }) => r.company_name))

  // 今月の最大番号を取得
  const { data: maxRecord } = await supabase
    .from('invoice_records')
    .select('number')
    .eq('month', month)
    .eq('user_email', userEmail)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  let nextNumber = (maxRecord?.number ?? 0) + 1
  let copied = 0

  for (const src of sourceRecords) {
    if (existingNames.has(src.company_name)) continue // 重複スキップ

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, ...rest } = src
    await supabase.from('invoice_records').insert({
      ...rest,
      month,
      number: nextNumber++,
      status: '入力未完了', // ステータスはリセット
      check_entered: false,
      check_created: false,
      check_reviewed: false,
      check_sent: false,
      check_payment: false,
      updated_at: new Date().toISOString(),
    })
    copied++
  }

  return NextResponse.json({ copied, message: `${copied}件を今月に引き継ぎました` })
}
