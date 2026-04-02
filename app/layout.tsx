import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Rekka Portal',
  description: '社長の伴走型業務整理 - Rekka Portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-[#F9F7F5] text-gray-900">
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
