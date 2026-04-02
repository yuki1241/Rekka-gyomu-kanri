'use client'

import AdminGuard from '@/components/AdminGuard'

function AdminFinanceContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
      <p className="text-lg font-medium">準備中</p>
      <p className="text-sm mt-1">このページは近日公開予定です</p>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><AdminFinanceContent /></AdminGuard>
}
