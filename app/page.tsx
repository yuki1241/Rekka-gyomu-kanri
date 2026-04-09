'use client'

import { useEffect, useState } from 'react'
import { Flame, AlertTriangle, TrendingUp, CheckCircle, Bell, Clock } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import Link from 'next/link'
import clsx from 'clsx'
import { Task } from './tasks/page'

const priorityLabel: Record<string, string> = { high: '高', medium: '中', low: '低' }
const priorityColor: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
}

export default function DashboardPage() {
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([])
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/tasks?mode=mine')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMyTasks(data) })
      .catch(() => {})
    fetch('/api/tasks?mode=assigned_to_me')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAssignedTasks(data) })
      .catch(() => {})
  }, [])

  const allTasks = [...myTasks, ...assignedTasks]

  const todayTasks = myTasks.filter((t) => t.due_date === today && t.status !== 'done')

  // 期限切れ（燃えている）
  const overdueTasks = allTasks.filter((t) =>
    t.due_date && t.due_date < today && t.status !== 'done'
  )

  // 期限1日前（警告）
  const warningTasks = allTasks.filter((t) =>
    t.due_date === tomorrowStr && t.status !== 'done'
  )

  const doneTasks = myTasks.filter((t) => t.status === 'done').length

  const alertCount = overdueTasks.length + warningTasks.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1 text-sm">業務の全体像を把握しましょう</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="今日のタスク" value={todayTasks.length} icon={Clock} iconBgColor="bg-gray-100" iconColor="text-gray-600" />
        <StatsCard label="納期アラート" value={alertCount} icon={AlertTriangle} iconBgColor="bg-orange-50" iconColor="text-orange-500" />
        <StatsCard label="全タスク" value={myTasks.length} icon={TrendingUp} iconBgColor="bg-green-50" iconColor="text-green-500" />
        <StatsCard label="完了タスク" value={doneTasks} icon={CheckCircle} iconBgColor="bg-gray-100" iconColor="text-gray-500" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 今日のタスク */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-900">今日のタスク</h2>
            <Link href="/tasks" className="text-sm text-blue-600 hover:underline">すべて見る →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <span className="text-4xl mb-3">🎉</span>
              <p className="text-sm">本日期限のタスクはありません</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {todayTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="mt-0.5 w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
                  </div>
                  <span className={clsx('flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium', priorityColor[task.priority])}>
                    {priorityLabel[task.priority]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* アラートパネル */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={16} className="text-gray-600" />
            <h2 className="font-semibold text-gray-900">納期アラート</h2>
          </div>

          {alertCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">アラートはありません</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {/* 期限切れ（燃えている） */}
              {overdueTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                  <Flame size={14} className="text-red-500 flex-shrink-0 mt-0.5 animate-bounce" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-red-800 truncate">{task.title}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">
                      期限切れ: {task.due_date}
                      {task.assigned_by_email && (
                        <span className="ml-1 text-red-400">（依頼されたタスク）</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
              {/* 期限1日前（警告） */}
              {warningTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-800 truncate">{task.title}</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      明日が期限: {task.due_date}
                      {task.assigned_by_email && (
                        <span className="ml-1 text-amber-400">（依頼されたタスク）</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {alertCount > 0 && (
            <Link href="/tasks" className="block text-center text-xs text-blue-600 hover:underline mt-4">
              タスク一覧で確認 →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
