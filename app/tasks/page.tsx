'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Search, ChevronDown, Pencil, Trash2, UserCheck, SendHorizonal, Flame, AlertTriangle, Globe, Archive, ArchiveRestore } from 'lucide-react'
import TaskModal from '@/components/tasks/TaskModal'
import clsx from 'clsx'

export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  due_date: string | null
  created_at: string
  assigned_to_email?: string | null
  assigned_by_email?: string | null
  user_email?: string
  prospect_id?: string | null
  prospect_name?: string | null
  archived?: boolean
}

type TabMode = 'mine' | 'assigned_by_me' | 'assigned_to_me' | 'all' | 'archive'

const statusLabel: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
}
const statusColor: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}
const priorityLabel: Record<Priority, string> = { high: '高', medium: '中', low: '低' }
const priorityColor: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
}

type FilterStatus = 'all' | TaskStatus
type FilterPriority = 'all' | Priority

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<TabMode>('mine')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const today = new Date().toISOString().split('T')[0]

  // メンバー名をメールから引けるようにしておく
  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {}
          for (const m of data) map[m.email] = m.name || m.email
          setMemberNames(map)
        }
      })
      .catch(() => {})
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    if (activeTab === 'mine') {
      // 自分のタスク + 自分に依頼されたタスクをまとめて表示
      const [mineRes, assignedRes] = await Promise.all([
        fetch('/api/tasks?mode=mine'),
        fetch('/api/tasks?mode=assigned_to_me'),
      ])
      const mineData = mineRes.ok ? await mineRes.json() : []
      const assignedData = assignedRes.ok ? await assignedRes.json() : []
      const merged = [
        ...(Array.isArray(mineData) ? mineData : []),
        ...(Array.isArray(assignedData) ? assignedData : []),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      setTasks(merged)
    } else {
      const res = await fetch(`/api/tasks?mode=${activeTab}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setTasks(data)
      }
    }
    setLoading(false)
  }, [activeTab])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleSave = async (data: Omit<Task, 'id' | 'created_at'>) => {
    if (editingTask) {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setIsModalOpen(false)
    setEditingTask(null)
    fetchTasks()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  const handleArchive = async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    })
    fetchTasks()
  }

  const handleRestore = async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false }),
    })
    fetchTasks()
  }

  const handleStatusToggle = async (task: Task) => {
    const next: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    }
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next[task.status] }),
    })
    fetchTasks()
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (searchQuery &&
      !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  const getName = (email?: string | null) => {
    if (!email) return ''
    if (email === session?.user?.email) return '自分'
    return memberNames[email] || email
  }

  const tabs: { mode: TabMode; label: string; icon: React.ReactNode; color: string }[] = [
    { mode: 'mine', label: '自分のタスク', icon: null, color: 'bg-blue-600' },
    { mode: 'assigned_by_me', label: '依頼中', icon: <SendHorizonal size={13} />, color: 'bg-orange-500' },
    { mode: 'all', label: '全員のタスク', icon: <Globe size={13} />, color: 'bg-teal-600' },
    { mode: 'archive', label: 'アーカイブ', icon: <Archive size={13} />, color: 'bg-gray-500' },
  ]

  const overdueTasks = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== 'done' && activeTab === 'mine'
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タスク</h1>
          <p className="text-gray-500 mt-1 text-sm">全 {tasks.length} 件</p>
        </div>
        {activeTab !== 'all' && activeTab !== 'archive' && (
          <button
            onClick={() => { setEditingTask(null); setIsModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={16} />
            新規タスク
          </button>
        )}
      </div>

      {/* 期限超過アラートバナー */}
      {overdueTasks.length > 0 && (
        <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <Flame size={16} className="text-red-500 mt-0.5 flex-shrink-0 animate-bounce" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">
              期限超過のタスクが {overdueTasks.length} 件あります
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {overdueTasks.map((t) => t.title).join('、')}
            </p>
          </div>
        </div>
      )}

      {/* タブ切り替え（自分・依頼中・全員・アーカイブ） */}
      <div className="flex items-center gap-2 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => { setActiveTab(tab.mode); setFilterStatus('all') }}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition-all',
              activeTab === tab.mode
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブ説明バナー */}
      {activeTab === 'assigned_by_me' && (
        <div className="mb-4 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-700">
          あなたが他のメンバーに依頼しているタスクです。担当者のステータス更新がここに反映されます。
        </div>
      )}
      {activeTab === 'all' && (
        <div className="mb-4 px-4 py-2.5 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-700">
          全メンバーのタスク一覧です。チーム全体の進捗を確認できます。編集・削除は自分のタスクのみ可能です。
        </div>
      )}
      {activeTab === 'archive' && (
        <div className="mb-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
          アーカイブ済みのタスクです。「復元」で通常タスクに戻すか、「完全に削除」で削除できます。
        </div>
      )}

      {/* ステータスフィルター・検索（アーカイブタブでは非表示） */}
      {activeTab !== 'archive' && (
        <>
          <div className="flex items-center gap-1 mb-5">
            {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={clsx(
                  'px-4 py-1.5 text-sm rounded-lg font-medium transition-colors',
                  filterStatus === s ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {s === 'all' ? 'すべて' : statusLabel[s]}
                <span className="ml-1.5 text-xs opacity-70">{counts[s]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="タスクを検索..."
                className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div className="relative">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
              >
                <option value="all">優先度: すべて</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 w-8" />
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">タスク名</th>
              {activeTab === 'assigned_by_me' && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-orange-500 w-28">依頼先</th>
              )}
              {activeTab === 'mine' && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">依頼者</th>
              )}
              {activeTab === 'all' && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-teal-600 w-28">メンバー</th>
              )}
              {activeTab === 'archive' && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">ステータス</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-24">優先度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">期限</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">読み込み中...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-gray-400 text-sm">
                  {activeTab === 'assigned_by_me' ? '依頼中のタスクはありません' :
                   activeTab === 'all' ? 'タスクがありません' :
                   activeTab === 'archive' ? 'アーカイブ済みのタスクはありません' :
                   'タスクはありません'}
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tomorrowStr = tomorrow.toISOString().split('T')[0]
                const isWarning = !isOverdue && task.due_date === tomorrowStr && task.status !== 'done'
                const isOwner = task.user_email === session?.user?.email
                const isAssignee = task.assigned_to_email === session?.user?.email
                // mine/archive タブはAPIが自分が関わるタスクのみ返すため常に編集可能
                const canEdit = activeTab === 'mine' || activeTab === 'archive' || isOwner || isAssignee
                // 削除・アーカイブは作成者のみ（依頼されたタスクは不可）
                const canDelete = activeTab === 'archive' || isOwner
                const assigneeName = getName(task.assigned_to_email)
                const requesterName = getName(task.assigned_by_email)
                // 全員タブ: 担当者（assigned_to_email優先、なければuser_email）
                const memberName = getName(task.assigned_to_email || task.user_email)

                return (
                  <tr
                    key={task.id}
                    className={clsx(
                      'transition-colors group',
                      isOverdue ? 'task-burning' : isWarning ? 'task-warning' : 'hover:bg-gray-50/70'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      {activeTab === 'all' ? (
                        // 全員タブでは読み取り専用
                        <div className={clsx(
                          'w-4 h-4 rounded border-2 flex items-center justify-center',
                          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        )}>
                          {task.status === 'done' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStatusToggle(task)}
                          className={clsx(
                            'w-4 h-4 rounded border-2 transition-colors flex items-center justify-center',
                            task.status === 'done'
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 hover:border-blue-400'
                          )}
                        >
                          {task.status === 'done' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={clsx('text-sm font-medium', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800')}>
                        {task.title}
                      </p>
                      {task.prospect_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 mt-0.5">
                          見込み: {task.prospect_name}
                        </span>
                      )}
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.description}</p>
                      )}
                    </td>
                    {/* 担当者・依頼先・依頼者・メンバーカラム */}
                    <td className="px-4 py-3.5">
                      {activeTab === 'assigned_by_me' && assigneeName && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-medium">
                          <SendHorizonal size={10} />
                          {assigneeName}
                        </span>
                      )}
                      {activeTab === 'mine' && !isOwner && requesterName && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                          <UserCheck size={10} />
                          {requesterName}
                        </span>
                      )}
                      {activeTab === 'mine' && isOwner && assigneeName && assigneeName !== '自分' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                          {assigneeName}
                        </span>
                      )}
                      {activeTab === 'all' && (
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
                          isOwner || isAssignee
                            ? 'bg-teal-50 text-teal-700'
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {memberName || '—'}
                        </span>
                      )}
                      {activeTab === 'archive' && (
                        <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusColor[task.status])}>
                          {statusLabel[task.status]}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', priorityColor[task.priority])}>
                        {priorityLabel[task.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusColor[task.status])}>
                        {statusLabel[task.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {task.due_date ? (
                        <span className={clsx('inline-flex items-center gap-1 text-xs font-medium',
                          isOverdue ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'
                        )}>
                          {isOverdue && <Flame size={12} className="animate-bounce" />}
                          {isWarning && <AlertTriangle size={12} />}
                          {task.due_date}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {activeTab === 'archive' ? (
                          // アーカイブタブ：復元・完全削除ボタン
                          <>
                            <button
                              onClick={() => handleRestore(task.id)}
                              title="復元"
                              className="p-1.5 text-gray-300 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            >
                              <ArchiveRestore size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              title="完全に削除"
                              className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          // 通常タブ：編集・アーカイブ・削除ボタン
                          <>
                            {canEdit && (
                              <button
                                onClick={() => { setEditingTask(task); setIsModalOpen(true) }}
                                title="編集"
                                className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleArchive(task.id)}
                                title="アーカイブ"
                                className="p-1.5 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                              >
                                <Archive size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(task.id)}
                                title="削除"
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          currentUserEmail={session?.user?.email ?? ''}
          onClose={() => { setIsModalOpen(false); setEditingTask(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
