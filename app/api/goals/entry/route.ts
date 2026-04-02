import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { template_id, year_month, week_num, target_value, actual_value, reflection } = body

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('goal_entries')
    .upsert(
      {
        user_email: session.user.email,
        template_id,
        year_month,
        week_num,
        target_value: target_value ?? 0,
        actual_value: actual_value ?? 0,
        reflection: reflection ?? '',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_id,year_month,week_num' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
