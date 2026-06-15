import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'
import { sendTaskAssignedEmail } from '@/lib/email'

// タスクの操作権限をチェック
async function checkTaskAccess(taskId: string, email: string) {
  const supabase = createServerSupabase()

  const { data: task } = await supabase
    .from('tasks')
    .select('user_email, assigned_to_email, project_id')
    .eq('id', taskId)
    .single()

  if (!task) return { ok: false, isTaskOwner: false, task: null }

  // タスク作成者 or 担当者は常に操作可能
  const isTaskOwner = task.user_email === email
  const isAssignee = task.assigned_to_email === email
  if (isTaskOwner || isAssignee) return { ok: true, isTaskOwner, task }

  // プロジェクトに紐づくタスクはプロジェクトメンバーも操作可能
  if (task.project_id) {
    // プロジェクト作成者チェック
    const { data: project } = await supabase
      .from('projects')
      .select('user_email')
      .eq('id', task.project_id)
      .single()
    if (project?.user_email === email) return { ok: true, isTaskOwner: false, task }

    // プロジェクトメンバーチェック
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', task.project_id)
      .eq('user_email', email)
      .single()
    if (member) return { ok: true, isTaskOwner: false, task }
  }

  return { ok: false, isTaskOwner: false, task }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ok, task: before } = await checkTaskAccess(params.id, session.user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 担当者が新しく設定・変更された場合のみ通知
  if (
    data.assigned_to_email &&
    data.assigned_to_email !== session.user.email &&
    data.assigned_to_email !== before?.assigned_to_email
  ) {
    await sendTaskAssignedEmail({
      to: data.assigned_to_email,
      taskTitle: data.title,
      taskDescription: data.description,
      dueDate: data.due_date,
      priority: data.priority,
      fromName: session.user.name ?? session.user.email,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ok } = await checkTaskAccess(params.id, session.user.email)
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createServerSupabase()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
