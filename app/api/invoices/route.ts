import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const section = searchParams.get('section')

  const supabase = createServerSupabase()
  let query = supabase
    .from('invoice_records')
    .select('*')
    .order('section')
    .order('number')

  if (month) query = query.eq('month', month)
  if (section) query = query.eq('section', section)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = createServerSupabase()

  // 合計金額を計算
  const items = body.items ?? []
  const total_amount = items.reduce((sum: number, item: { amount?: number; quantity?: number; unit_price?: number }) =>
    sum + (item.amount ?? (item.quantity ?? 0) * (item.unit_price ?? 0)), 0)

  const { data, error } = await supabase
    .from('invoice_records')
    .insert({ ...body, total_amount, updated_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
