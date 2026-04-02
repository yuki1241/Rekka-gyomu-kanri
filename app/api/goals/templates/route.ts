import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templates } = await req.json()
  const supabase = createServerSupabase()

  for (const t of templates) {
    await supabase
      .from('goal_templates')
      .update({ label: t.label })
      .eq('id', t.id)
      .eq('user_email', session.user.email)
  }

  return NextResponse.json({ ok: true })
}
