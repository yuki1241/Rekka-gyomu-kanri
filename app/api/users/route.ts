import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

// 管理者チェック
async function isAdmin(email: string) {
  const supabase = createServerSupabase()
  const { data } = await supabase
    .from('app_users')
    .select('role')
    .eq('email', email)
    .single()
  return data?.role === 'admin'
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await isAdmin(session.user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, name, role } = await req.json()
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('app_users')
    .insert({ email, name: name || '', role: role || 'viewer', invited_by: session.user.email })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
