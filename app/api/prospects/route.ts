import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const showAll = searchParams.get('all') === '1'
  const isAdmin = (session.user as { role?: string }).role === 'admin'

  const supabase = createServerSupabase()
  let query = supabase
    .from('prospect_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (!showAll || !isAdmin) {
    query = query.eq('user_email', session.user.email)
  }

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
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
