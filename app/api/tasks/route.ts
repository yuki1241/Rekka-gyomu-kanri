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
  const prospectId = searchParams.get('prospect_id')
  const mode = searchParams.get('mode') // 'mine' | 'assigned_by_me' | 'assigned_to_me' | 'all' | 'archive'

  const supabase = createServerSupabase()
  const email = session.user.email

  let query = supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (mode === 'archive') {
    // アーカイブ済みタスク（自分のもののみ）
    query = query.eq('user_email', email).eq('archived', true)
  } else if (prospectId) {
    // 見込みリスト連動：prospect_idで絞り込み（ユーザー制限なし）
    query = query.eq('prospect_id', prospectId).or('archived.is.null,archived.eq.false')
  } else if (mode === 'all') {
    // 全員のタスクを表示（アーカイブ除外）
    query = query.or('archived.is.null,archived.eq.false')
  } else if (mode === 'assigned_by_me') {
    // 自分が他人に依頼したタスク（アーカイブ除外）
    query = query
      .eq('assigned_by_email', email)
      .neq('assigned_to_email', email)
      .or('archived.is.null,archived.eq.false')
  } else if (mode === 'assigned_to_me') {
    // 他人から自分に依頼されたタスク（アーカイブ除外）
    query = query
      .eq('assigned_to_email', email)
      .neq('user_email', email)
      .or('archived.is.null,archived.eq.false')
  } else if (!projectId) {
    // 自分のタスク（アーカイブ除外）
    query = query
      .eq('user_email', email)
      .or(`assigned_to_email.is.null,assigned_to_email.eq.${email}`)
      .or('archived.is.null,archived.eq.false')
  } else {
    // プロジェクト内タスク（アーカイブ除外）
    query = query.or('archived.is.null,archived.eq.false')
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
