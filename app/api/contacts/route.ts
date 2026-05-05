import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_email', session.user.email)
    .order('display_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServerSupabase()

  // display_order: 現在の最大+1
  const { data: existing } = await supabase
    .from('contacts')
    .select('display_order')
    .eq('user_email', session.user.email)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (existing?.display_order ?? 0) + 1

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_email: session.user.email,
      name: body.name ?? '',
      gender: body.gender ?? '',
      job_type: body.job_type ?? '',
      company: body.company ?? '',
      website: body.website ?? '',
      position: body.position ?? '',
      met_date: body.met_date ?? null,
      met_how: body.met_how ?? '',
      connect_target: body.connect_target ?? '',
      introduction: body.introduction ?? '',
      notes: body.notes ?? '',
      display_order: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
