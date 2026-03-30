import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: '業務管理システム',
  description: '業務の全体像を把握するダッシュボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>
          <Sidebar />
          <main className="ml-56 min-h-screen">
            <div className="p-8">{children}</div>
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
