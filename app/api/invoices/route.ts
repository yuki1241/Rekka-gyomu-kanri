import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

function calcTotal(items: { amount?: number; quantity?: number; unit_price?: number }[]) {
  return items.reduce((sum, item) =>
    sum + (item.amount ?? (item.quantity ?? 0) * (item.unit_price ?? 0)), 0)
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  const supabase = createServerSupabase()
  let query = supabase
    .from('invoice_records')
    .select('*')
    .eq('user_email', session.user.email)
    .order('number', { ascending: true })

  if (month) query = query.eq('month', month)

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
  const userEmail = session.user.email
  const month = body.month

  // 自動採番：同月・同ユーザーの最大番号 + 1
  const { data: maxRecord } = await supabase
    .from('invoice_records')
    .select('number')
    .eq('month', month)
    .eq('user_email', userEmail)
    .order('number', { ascending: false })
    .limit(1)
    .single()

  const nextNumber = (maxRecord?.number ?? 0) + 1
  const total_amount = calcTotal(body.items ?? [])

  const { data, error } = await supabase
    .from('invoice_records')
    .insert({
      ...body,
      user_email: userEmail,
      number: nextNumber,
      total_amount,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
