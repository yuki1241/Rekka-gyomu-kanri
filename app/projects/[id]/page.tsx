'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, ArrowLeft, Pencil, Trash2, X, BarChart2, Kanban } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { Task, Priority, TaskStatus } from '@/app/tasks/page'
import { useSession } from 'next-auth/react'

interface Project {
  id: string
  name: string
  description: string
  color: string
  prospect_id?: string
  user_email: string
  sales_email?: string | null
  director_email?: string | null
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

const statusBarColor: Record<TaskStatus, string> = {
  todo: '#D1D5DB',
  in_progress: '#60A5FA',
  done: '#4ADE80',
}

// ---------- ガントチャート ----------
function GanttChart({ tasks }: { tasks: Task[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const tasksWithDue = tasks.filter((t) => t.due_date)
  const tasksNoDue = tasks.filter((t) => !t.due_date)

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        タスクがありません
      </div>
    )
  }

  if (tasksWithDue.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        期限が設定されたタスクがありません。タスクに期限を設定するとガントチャートが表示されます。
      </div>
    )
  }

  // 日付範囲を計算
  const allDates: Date[] = [today]
  tasksWithDue.forEach((t) => {
    allDates.push(new Date(t.created_at))
    allDates.push(new Date(t.due_date!))
  })

  let minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  let maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  minDate.setHours(0, 0, 0, 0)
  maxDate.setHours(0, 0, 0, 0)
  minDate.setDate(minDate.getDate() - 3)
  maxDate.setDate(maxDate.getDate() + 7)

  const msPerDay = 86400000
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / msPerDay)
  const DAY_W = 36 // px per day
  const LABEL_W = 200 // px for task label

  const dayX = (date: Date) => {
    date.setHours(0, 0, 0, 0)
    return Math.round((date.getTime() - minDate.getTime()) / msPerDay) * DAY_W
  }

  const todayX = dayX(new Date(today))

  // 週ヘッダーを生成（月曜日）
  const weeks: { date: Date; x: number; label: string }[] = []
  const d = new Date(minDate)
  while (d <= maxDate) {
    if (d.getDay() === 1 || weeks.length === 0) {
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      weeks.push({ date: new Date(d), x: dayX(new Date(d)), label })
      if (d.getDay() !== 1) {
        // snap to next Monday
        d.setDate(d.getDate() + (8 - d.getDay()) % 7 || 7)
        continue
      }
    }
    d.setDate(d.getDate() + 1)
  }

  // 月ラベルを生成
  const months: { label: string; x: number }[] = []
  const dm = new Date(minDate)
  let lastMonth = -1
  while (dm <= maxDate) {
    if (dm.getMonth() !== lastMonth) {
      months.push({ label: `${dm.getFullYear()}年${dm.getMonth() + 1}月`, x: dayX(new Date(dm)) })
      lastMonth = dm.getMonth()
    }
    dm.setDate(dm.getDate() + 1)
  }

  const totalWidth = totalDays * DAY_W

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: LABEL_W + totalWidth + 16 }}>
        {/* 月ヘッダー */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div style={{ width: LABEL_W }} className="flex-shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200">
            タスク名
          </div>
          <div style={{ width: totalWidth }} className="relative h-8 flex-shrink-0">
            {months.map((m, i) => (
              <div key={i}
                style={{ position: 'absolute', left: m.x, top: 0, bottom: 0 }}
                className="flex items-center px-2">
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 週ヘッダー */}
        <div className="flex border-b border-gray-200 bg-gray-50/50">
          <div style={{ width: LABEL_W }} className="flex-shrink-0 border-r border-gray-200" />
          <div style={{ width: totalWidth }} className="relative h-7 flex-shrink-0">
            {weeks.map((w, i) => (
              <div key={i}
                style={{ position: 'absolute', left: w.x, top: 0, bottom: 0, width: DAY_W * 7 }}
                className="flex items-center border-l border-gray-200 px-1">
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* タスク行 */}
        {tasksWithDue.map((task) => {
          const startDate = new Date(task.created_at)
          const endDate = new Date(task.due_date!)
          const barLeft = dayX(startDate)
          const barRight = dayX(endDate)
          const barWidth = Math.max(barRight - barLeft, DAY_W)
          const isOverdue = task.due_date! < todayStr && task.status !== 'done'

          return (
            <div key={task.id} className="flex border-b border-gray-50 hover:bg-blue-50/20 transition-colors" style={{ height: 44 }}>
              {/* タスク名 */}
              <div style={{ width: LABEL_W }} className="flex-shrink-0 px-3 flex items-center border-r border-gray-100 gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusBarColor[task.status] }} />
                <span className={clsx(
                  'text-xs truncate',
                  task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'
                )}>
                  {task.title}
                </span>
              </div>

              {/* バー */}
              <div style={{ width: totalWidth }} className="relative flex-shrink-0">
                {/* 週グリッド線 */}
                {weeks.map((w, i) => (
                  <div key={i}
                    style={{ position: 'absolute', left: w.x, top: 0, bottom: 0, width: 1 }}
                    className="bg-gray-100" />
                ))}

                {/* 今日のライン */}
                {todayX >= 0 && todayX <= totalWidth && (
                  <div
                    style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, width: 2 }}
                    className="bg-red-400/50 z-10"
                  >
                    <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400" />
                  </div>
                )}

                {/* ガントバー */}
                <div
                  style={{
                    position: 'absolute',
                    left: barLeft,
                    width: barWidth,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: 22,
                    backgroundColor: isOverdue ? '#FCA5A5' : statusBarColor[task.status],
                    borderRadius: 5,
                    border: isOverdue ? '1px solid #F87171' : 'none',
                  }}
                  className="flex items-center px-2 overflow-hidden"
                >
                  <span style={{ fontSize: 10, color: task.status === 'done' ? '#166534' : '#374151', whiteSpace: 'nowrap' }}>
                    {task.due_date}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* 期限なしタスク */}
        {tasksNoDue.length > 0 && (
          <div className="mt-4 px-3">
            <p className="text-xs text-gray-400 mb-2">期限未設定のタスク（ガントに表示されません）</p>
            <div className="space-y-1">
              {tasksNoDue.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusBarColor[t.status] }} />
                  <span className={clsx('text-xs', t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-600')}>{t.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 凡例 */}
        <div className="flex items-center gap-5 mt-4 px-3 pb-3">
          {[
            { color: statusBarColor.todo, label: '未着手' },
            { color: statusBarColor.in_progress, label: '進行中' },
            { color: statusBarColor.done, label: '完了' },
            { color: '#FCA5A5', label: '期限超過' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-400/50 flex-shrink-0" />
            <span className="text-xs text-gray-500">今日</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- カード追加フォーム ----------
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

// ---------- メインページ ----------
export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [view, setView] = useState<'kanban' | 'gantt'>('kanban')
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [projRes, taskRes] = await Promise.all([
      fetch(`/api/projects/${params.id}`),
      fetch(`/api/tasks?project_id=${params.id}`),
    ])
    const proj: Project | null = projRes.ok ? await projRes.json() : null
    if (proj) setProject(proj)

    let allTasks: Task[] = []
    if (taskRes.ok) {
      const data = await taskRes.json()
      if (Array.isArray(data)) allTasks = data
    }

    // 見込みリスト連動タスクを追加取得・マージ
    if (proj?.prospect_id) {
      const prospectTaskRes = await fetch(`/api/tasks?prospect_id=${proj.prospect_id}`)
      if (prospectTaskRes.ok) {
        const prospectData = await prospectTaskRes.json()
        if (Array.isArray(prospectData)) {
          const existingIds = new Set(allTasks.map((t) => t.id))
          allTasks = [...allTasks, ...prospectData.filter((t: Task) => !existingIds.has(t.id))]
        }
      }
    }

    setTasks(allTasks)
    setLoading(false)
  }, [params.id])

  useEffect(() => { fetchData() }, [fetchData])

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

  const getName = (email?: string | null) => {
    if (!email) return null
    if (email === session?.user?.email) return '自分'
    return memberNames[email] || email
  }

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

  const isOwner = project.user_email === session?.user?.email

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <Link href="/projects" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 w-fit">
          <ArrowLeft size={14} />
          プロジェクト一覧
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            </div>
            {project.description && (
              <p className="text-gray-500 mt-1 text-sm ml-6">{project.description}</p>
            )}
            {/* 担当者バッジ */}
            <div className="flex flex-wrap gap-2 mt-2 ml-6">
              {project.sales_email && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-medium border border-orange-100">
                  <span className="text-orange-400 font-bold">営</span>
                  {getName(project.sales_email)}
                </span>
              )}
              {project.director_email && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-100">
                  <span className="text-purple-400 font-bold">D</span>
                  {getName(project.director_email)}
                </span>
              )}
              {!isOwner && project.user_email && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                  作成者: {getName(project.user_email)}
                </span>
              )}
            </div>
          </div>

          {/* ビュー切り替え */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0">
            <button
              onClick={() => setView('kanban')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Kanban size={13} />
              カンバン
            </button>
            <button
              onClick={() => setView('gantt')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                view === 'gantt' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <BarChart2 size={13} />
              ガント
            </button>
          </div>
        </div>
      </div>

      {/* カンバンビュー */}
      {view === 'kanban' && (
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
                      {task.prospect_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 mt-0.5">
                          見込み: {task.prospect_name}
                        </span>
                      )}
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
      )}

      {/* ガントビュー */}
      {view === 'gantt' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <GanttChart tasks={tasks} />
        </div>
      )}

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
