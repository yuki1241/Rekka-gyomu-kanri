import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServerSupabase } from '@/lib/supabase'

// Googleのアクセストークンをリフレッシュする
async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number } | null> {
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
    return {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    }
  } catch {
    return null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/spreadsheets.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 初回サインイン時にアクセストークンとroleを取得
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at ?? Math.floor(Date.now() / 1000) + 3600
        // トークンをDBに保存（メンバーのスケジュール閲覧に使用）
        if (token.email) {
          const supabase = createServerSupabase()
          await supabase
            .from('app_users')
            .update({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
            })
            .eq('email', token.email)
        }
        return token
      }

      // アクセストークンがまだ有効な場合はそのまま返す（60秒の余裕を持たせる）
      const expiresAt = token.expiresAt as number | undefined
      if (expiresAt && Date.now() / 1000 < expiresAt - 60) {
        return token
      }

      // 期限切れ or 期限情報なし → リフレッシュ
      const refreshToken = token.refreshToken as string | undefined
      if (!refreshToken) return token

      const refreshed = await refreshGoogleToken(refreshToken)
      if (refreshed) {
        token.accessToken = refreshed.accessToken
        token.expiresAt = refreshed.expiresAt
        // DBのトークンも更新
        if (token.email) {
          const supabase = createServerSupabase()
          await supabase
            .from('app_users')
            .update({ access_token: refreshed.accessToken })
            .eq('email', token.email as string)
        }
      }

      // roleが未取得の場合はDBから取得
      if (!token.role && token.email) {
        const supabase = createServerSupabase()
        const { data } = await supabase
          .from('app_users')
          .select('role')
          .eq('email', token.email)
          .single()
        token.role = data?.role ?? 'viewer'
      }

      return token
    },
    async session({ session, token }) {
      // セッションにアクセストークンとroleを渡す
      session.accessToken = token.accessToken
      if (session.user) {
        session.user.role = token.role
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
