import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServerSupabase } from '@/lib/supabase'

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
