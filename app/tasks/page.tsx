'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ChevronDown, Pencil, Trash2 } from 'lucide-react'
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
}

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tasks')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setTasks(data)
    }
    setLoading(false)
  }, [])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タスク</h1>
          <p className="text-gray-500 mt-1 text-sm">全 {tasks.length} 件</p>
        </div>
        <button
          onClick={() => { setEditingTask(null); setIsModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={16} />
          新規タスク
        </button>
      </div>

      {/* フィルタータブ */}
      <div className="flex items-center gap-1 mb-5">
        {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={clsx(
              'px-4 py-1.5 text-sm rounded-lg font-medium transition-colors',
              filterStatus === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            {s === 'all' ? 'すべて' : statusLabel[s]}
            <span className="ml-1.5 text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* 検索・フィルター */}
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

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 w-8" />
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">タスク名</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-24">優先度</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">ステータス</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-28">期限</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">
                  読み込み中...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-gray-400 text-sm">
                  タスクはありません
                </td>
              </tr>
            ) : (
              filtered.map((task) => {
                const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
                return (
                  <tr key={task.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-5 py-3.5">
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
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={clsx('text-sm font-medium', task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800')}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{task.description}</p>
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
                        <span className={clsx('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-gray-500')}>
                          {task.due_date}{isOverdue && ' ⚠'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingTask(task); setIsModalOpen(true) }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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
          onClose={() => { setIsModalOpen(false); setEditingTask(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
