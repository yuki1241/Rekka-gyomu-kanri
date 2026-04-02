'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role !== 'admin') {
      router.replace('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
  }

  if (!session || session.user?.role !== 'admin') {
    return null
  }

  return <>{children}</>
}
