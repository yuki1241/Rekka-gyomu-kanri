import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === '1'
  const targetEmail = searchParams.get('target_email') // 特定メンバーを指定（管理者のみ）
  const isAdmin = (session.user as { role?: string }).role === 'admin'

  const supabase = createServerSupabase()
  let query = supabase
    .from('prospect_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (isAdmin && targetEmail) {
    // 特定メンバーの見込みリストを表示
    query = query.eq('user_email', targetEmail)
  } else if (!showAll || !isAdmin) {
    // 自分の見込みリストのみ
    query = query.eq('user_email', session.user.email)
  }
  // showAll && isAdmin の場合はフィルターなし（全員分）

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('prospect_clients')
    .insert({
      user_email: session.user.email,
      company_name: body.company_name ?? '',
      contact_name: body.contact_name ?? '',
      service_content: body.service_content ?? '',
      status: body.status ?? '見込み',
      contracted_at: body.contracted_at ?? null,
      memo: body.memo ?? '',
      term: body.term ?? null,
      amount: body.amount ?? null,
      lost_reason: body.lost_reason ?? null,
      lost_reason_detail: body.lost_reason_detail ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
