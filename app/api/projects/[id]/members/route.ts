import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

// アクセス権チェック（作成者またはメンバーか）
async function checkAccess(projectId: string, email: string) {
  const supabase = createServerSupabase()
  const { data: project } = await supabase
    .from('projects').select('user_email').eq('id', projectId).single()
  if (!project) return { ok: false, isOwner: false }
  if (project.user_email === email) return { ok: true, isOwner: true }
  const { data: member } = await supabase
    .from('project_members').select('role')
    .eq('project_id', projectId).eq('user_email', email).single()
  return { ok: !!member, isOwner: false }
}

// メンバー一覧取得
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ok } = await checkAccess(params.id, session.user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// メンバー追加（作成者のみ）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isOwner } = await checkAccess(params.id, session.user.email)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_email } = await req.json()
  if (!user_email) return NextResponse.json({ error: 'user_email required' }, { status: 400 })

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('project_members')
    .insert({ project_id: params.id, user_email, role: 'member', invited_by: session.user.email })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// メンバー削除（作成者のみ）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { isOwner } = await checkAccess(params.id, session.user.email)
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_email } = await req.json()
  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', params.id)
    .eq('user_email', user_email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
