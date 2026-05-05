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
    .from('suggestions')
    .select('*')
    .order('submitted_at', { ascending: false })

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
    .from('suggestions')
    .insert({
      user_email: session.user.email,
      subject: body.subject ?? '',
      body: body.body ?? '',
      submitted_at: body.submitted_at ?? new Date().toISOString().split('T')[0],
      no_opinion: body.no_opinion ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
