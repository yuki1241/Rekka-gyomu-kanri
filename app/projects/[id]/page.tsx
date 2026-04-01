'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowLeft, Pencil, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Task, Priority, TaskStatus } from '@/app/tasks/page'

interface Project {
  id: string
  name: string
  description: string
  color: string
}

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: '未着手', color: 'bg-gray-100' },
  { key: 'in_progress', label: '進行中', color: 'bg-blue-50' },
  { key: 'done', label: '完了', color: 'bg-green-50' },
]

const priorityColor: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
}
const priorityLabel: Record<Priority, string> = { high: '高', medium: '中', low: '低' }

interface AddCardFormProps {
  onSave: (title: string, priority: Priority) => void
  onCancel: () => void
}

function AddCardForm({ onSave, onCancel }: AddCardFormProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mt-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タスク名を入力"
        className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30 mb-2"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) onSave(title.trim(), priority) }}
      />
      <div className="flex items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="text-xs px-2 py-1 border border-gray-200 rounded-md bg-white focus:outline-none"
        >
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <button
          onClick={() => { if (title.trim()) onSave(title.trim(), priority) }}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          追加
        </button>
        <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [projRes, taskRes] = await Promise.all([
      fetch(`/api/projects/${params.id}`),
      fetch(`/api/tasks?project_id=${params.id}`),
    ])
    if (projRes.ok) setProject(await projRes.json())
    if (taskRes.ok) {
      const data = await taskRes.json()
      if (Array.isArray(data)) setTasks(data)
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddTask = async (status: TaskStatus, title: string, priority: Priority) => {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, status, description: '', due_date: null, project_id: params.id }),
    })
    setAddingTo(null)
    fetchData()
  }

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchData()
  }

  const handleDeleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    fetchData()
  }

  // ドラッグ＆ドロップ
  const handleDragStart = (taskId: string) => setDragging(taskId)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    if (dragging) await handleStatusChange(dragging, status)
    setDragging(null)
  }

  const getColumnTasks = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
  if (!project) return <div className="text-center py-16 text-gray-400 text-sm">プロジェクトが見つかりません</div>

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 w-fit">
          <ArrowLeft size={14} />
          プロジェクト一覧
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>
        {project.description && (
          <p className="text-gray-500 mt-1 text-sm ml-6">{project.description}</p>
        )}
      </div>

      {/* カンバンボード */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.key)
          return (
            <div
              key={col.key}
              className={clsx('flex-shrink-0 w-72 rounded-xl p-3', col.color)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              {/* カラムヘッダー */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setAddingTo(col.key)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* カード一覧 */}
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className={clsx(
                      'bg-white rounded-lg shadow-sm border border-gray-100 p-3 cursor-grab active:cursor-grabbing group transition-shadow hover:shadow-md',
                      dragging === task.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={clsx(
                        'text-sm font-medium text-gray-800 flex-1',
                        task.status === 'done' && 'line-through text-gray-400'
                      )}>
                        {task.title}
                      </p>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className={clsx('text-xs px-1.5 py-0.5 rounded-full font-medium', priorityColor[task.priority])}>
                        {priorityLabel[task.priority]}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-gray-400">{task.due_date}</span>
                      )}
                    </div>
                    {/* ステータス変更ボタン */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => handleStatusChange(task.id, c.key)}
                          className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                        >
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* カード追加フォーム */}
                {addingTo === col.key ? (
                  <AddCardForm
                    onSave={(title, priority) => handleAddTask(col.key, title, priority)}
                    onCancel={() => setAddingTo(null)}
                  />
                ) : (
                  <button
                    onClick={() => setAddingTo(col.key)}
                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={12} />
                    カードを追加
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 編集モーダル */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">タスクを編集</h2>
              <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                defaultValue={editingTask.title}
                id="edit-title"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <textarea
                defaultValue={editingTask.description}
                id="edit-desc"
                rows={3}
                placeholder="説明（任意）"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  defaultValue={editingTask.priority}
                  id="edit-priority"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
                <input
                  type="date"
                  defaultValue={editingTask.due_date ?? ''}
                  id="edit-due"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={async () => {
                  const title = (document.getElementById('edit-title') as HTMLInputElement).value
                  const description = (document.getElementById('edit-desc') as HTMLTextAreaElement).value
                  const priority = (document.getElementById('edit-priority') as HTMLSelectElement).value
                  const due_date = (document.getElementById('edit-due') as HTMLInputElement).value
                  await fetch(`/api/tasks/${editingTask.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description, priority, due_date: due_date || null }),
                  })
                  setEditingTask(null)
                  fetchData()
                }}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                保存する
              </button>
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
