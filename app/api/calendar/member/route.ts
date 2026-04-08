import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createServerSupabase } from '@/lib/supabase'

// アクセストークンをリフレッシュする
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token ?? null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const timeMin = searchParams.get('timeMin') || new Date().toISOString()
  const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  // 対象メンバーのトークンを取得
  const { data: member } = await supabase
    .from('app_users')
    .select('email, access_token, refresh_token')
    .eq('id', userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // 自分自身の場合は詳細を返す（/api/calendar と同じ）
  const isSelf = member.email === session.user.email

  let accessToken = member.access_token

  if (!accessToken && !member.refresh_token) {
    return NextResponse.json({ error: 'no_token', message: 'このメンバーはまだログインしていません' }, { status: 404 })
  }

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })

  // Google Calendar APIを呼び出す
  let calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  // トークン期限切れの場合はリフレッシュ
  if (calRes.status === 401 && member.refresh_token) {
    const newToken = await refreshAccessToken(member.refresh_token)
    if (newToken) {
      accessToken = newToken
      // 新しいトークンをDBに保存
      await supabase
        .from('app_users')
        .update({ access_token: newToken })
        .eq('id', userId)

      calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    }
  }

  if (!calRes.ok) {
    return NextResponse.json({ error: 'calendar_fetch_failed' }, { status: calRes.status })
  }

  const calData = await calRes.json()
  const events = calData.items ?? []

  // 自分自身なら詳細をそのまま、他人なら「予定あり」にマスク
  if (isSelf) {
    return NextResponse.json(events)
  }

  const masked = events.map((event: {
    id: string
    start: { dateTime?: string; date?: string }
    end: { dateTime?: string; date?: string }
    colorId?: string
  }) => ({
    id: event.id,
    summary: '予定あり',
    start: event.start,
    end: event.end,
    colorId: '8', // グレー固定
  }))

  return NextResponse.json(masked)
}
