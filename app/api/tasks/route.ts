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
  const projectId = searchParams.get('project_id')
  const mode = searchParams.get('mode') // 'mine' | 'assigned_by_me' | 'assigned_to_me'

  const supabase = createServerSupabase()
  const email = session.user.email

  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (mode === 'assigned_by_me') {
    // 自分が他人に依頼したタスク
    query = query
      .eq('assigned_by_email', email)
      .neq('assigned_to_email', email)
  } else if (mode === 'assigned_to_me') {
    // 他人から自分に依頼されたタスク
    query = query
      .eq('assigned_to_email', email)
      .neq('user_email', email)
  } else {
    // 自分のタスク（自分で作って自分担当 or 担当者未設定）
    query = query
      .eq('user_email', email)
      .or(`assigned_to_email.is.null,assigned_to_email.eq.${email}`)
  }

  if (projectId) query = query.eq('project_id', projectId)

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
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...body,
      user_email: session.user.email,
      assigned_by_email: body.assigned_to_email ? session.user.email : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
