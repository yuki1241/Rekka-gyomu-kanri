import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = session.user.email
  const supabase = createServerSupabase()

  // 自分がメンバーとして参加しているプロジェクトIDを取得
  const { data: memberRows } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_email', email)

  const memberIds = (memberRows ?? []).map((r) => r.project_id as string)

  let query = supabase
    .from('projects')
    .select('*, tasks(count), project_members(user_email, role)')
    .order('created_at', { ascending: false })

  // 作成者 OR メンバーのプロジェクトのみ表示
  if (memberIds.length > 0) {
    query = query.or(`user_email.eq.${email},id.in.(${memberIds.join(',')})`)
  } else {
    query = query.eq('user_email', email)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const email = session.user.email
  const supabase = createServerSupabase()

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...body, user_email: email })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 作成者をオーナーとしてproject_membersに自動追加
  await supabase.from('project_members').insert({
    project_id: data.id,
    user_email: email,
    role: 'owner',
    invited_by: email,
  })

  return NextResponse.json(data, { status: 201 })
}
