'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Trash2, X, Briefcase, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

interface Member { id: string; email: string; name: string }

interface CaseTask {
  id: string
  case_id: string
  title: string
  assignee_email: string
  category: string
  is_completed: boolean
  due_date: string | null
  created_at: string
}

interface DirectorCase {
  id: string
  case_number: number
  case_name: string
  client_name: string
  director_email: string
  sales_email: string
  assistant_email: string
  current_position: string
  next_date: string | null
  current_task: string
  case_status: string
  is_active: boolean
  is_archived: boolean
  priority: string
  sales_estimate: number | null
  actual_completion_date: string | null
  start_date: string | null
  manhours_sheet: string
  memo: string
  case_stage: string
  case_media: string
  updated_at: string
}

type ViewType = 'all' | 'new_case' | 'task_list' | 'active' | 'by_director' | 'by_sales' | 'by_month' | 'this_month' | 'archived'

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'all', label: '全案件一覧' },
  { key: 'new_case', label: '新規案件' },
  { key: 'task_list', label: 'タスク一覧' },
  { key: 'by_month', label: '更新月' },
  { key: 'by_sales', label: '営業別' },
  { key: 'by_director', label: 'ディレクター別' },
  { key: 'this_month', label: '今月タスク' },
  { key: 'archived', label: '終了案件' },
]

const NEW_CASE_STAGES = ['人選中', 'スキルシート提出', '面談', '面談終わり', 'トライアル待ち', '本契約'] as const

const STAGE_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  '人選中':          { bg: 'bg-slate-50',   border: 'border-slate-100',  text: 'text-slate-700',  badge: 'bg-slate-100 text-slate-500' },
  'スキルシート提出': { bg: 'bg-blue-50',    border: 'border-blue-100',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-500' },
  '面談':            { bg: 'bg-indigo-50',  border: 'border-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-500' },
  '面談終わり':      { bg: 'bg-violet-50',  border: 'border-violet-100', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-500' },
  'トライアル待ち':   { bg: 'bg-amber-50',   border: 'border-amber-100',  text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-600' },
  '本契約':          { bg: 'bg-green-50',   border: 'border-green-100',  text: 'text-green-700',  badge: 'bg-green-100 text-green-600' },
}

const MEDIA_OPTIONS = ['', 'ランサーズ', '公式LINE', 'Indeed', 'Wantedly', 'Green', 'リファラル', 'その他']
const TASK_CATEGORIES = ['週次', '月次', '業務'] as const

const STATUS_STYLES: Record<string, string> = {
  '継続案件': 'bg-blue-100 text-blue-700',
  '単発案件': 'bg-orange-100 text-orange-700',
  '新規開拓': 'bg-green-100 text-green-700',
}

const PRIORITY_STYLES: Record<string, string> = {
  '高': 'bg-red-100 text-red-700',
  '中': 'bg-yellow-100 text-yellow-700',
  '低': 'bg-gray-100 text-gray-500',
}

const POSITION_STYLES: Record<string, string> = {
  'ディレクター': 'bg-indigo-100 text-indigo-700',
  'クライアント': 'bg-orange-100 text-orange-700',
  '採用': 'bg-green-100 text-green-700',
  'アシスタント': 'bg-purple-100 text-purple-700',
}

const DIRECTOR_COLORS = [
  { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-500' },
  { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-500' },
  { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', badge: 'bg-green-100 text-green-500' },
  { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-500' },
  { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-500' },
  { bg: 'bg-teal-50', border: 'border-teal-100', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-500' },
  { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-600' },
]

const CASE_STATUSES = ['継続案件', '単発案件', '新規開拓']
const PRIORITIES = ['高', '中', '低']
const POSITIONS = ['', 'ディレクター', 'クライアント', '採用', 'アシスタント']

const emptyForm = () => ({
  case_name: '',
  client_name: '',
  director_email: '',
  sales_email: '',
  assistant_email: '',
  current_position: '',
  next_date: '',
  current_task: '',
  case_status: '継続案件',
  is_active: true,
  priority: '中',
  sales_estimate: '',
  actual_completion_date: '',
  start_date: '',
  manhours_sheet: '',
  memo: '',
  case_stage: '',
  case_media: '',
})

export default function DirectorCasesPage() {
  useSession()
  const [cases, setCases] = useState<DirectorCase[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [view, setView] = useState<ViewType>('all')
  const [loading, setLoading] = useState(true)
  const [editingCase, setEditingCase] = useState<DirectorCase | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [ganttTab, setGanttTab] = useState<'deadline' | 'by_person' | 'person_tasks'>('deadline')
  const [allCasesSort, setAllCasesSort] = useState<'default' | 'oldest' | 'sales' | 'active'>('default')
  const [caseTasks, setCaseTasks] = useState<CaseTask[]>([])
  const [taskLoading, setTaskLoading] = useState(false)
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, { title: string; assignee: string }>>({
    '業務': { title: '', assignee: '' },
    '週次': { title: '', assignee: '' },
    '月次': { title: '', assignee: '' },
  })
  const [taskListTab, setTaskListTab] = useState<'週次' | '月次' | '業務'>('業務')
  const [allTasks, setAllTasks] = useState<CaseTask[]>([])
  const toggleExpand = (id: string) => setExpandedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMembers(data)
          const map: Record<string, string> = {}
          for (const m of data) map[m.email] = m.name || m.email
          setMemberNames(map)
        }
      })
      .catch(() => {})
  }, [])

  const fetchCases = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/director-cases')
    const data = await res.json()
    if (Array.isArray(data)) setCases(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCases() }, [fetchCases])

  useEffect(() => {
    if (!editingCase) { setCaseTasks([]); return }
    setTaskLoading(true)
    fetch(`/api/director-case-tasks?case_id=${editingCase.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCaseTasks(data) })
      .catch(() => {})
      .finally(() => setTaskLoading(false))
  }, [editingCase])

  useEffect(() => {
    if (view !== 'task_list') return
    fetch('/api/director-case-tasks')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllTasks(data) })
      .catch(() => {})
  }, [view])

  const addTaskForCategory = async (category: string) => {
    const input = newTaskInputs[category]
    if (!input?.title.trim() || !editingCase) return
    const body = { case_id: editingCase.id, title: input.title.trim(), category, assignee_email: input.assignee, is_completed: false }
    const res = await fetch('/api/director-case-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const created = await res.json()
      setCaseTasks(prev => [...prev, created])
      setNewTaskInputs(prev => ({ ...prev, [category]: { ...prev[category], title: '' } }))
    }
  }

  const toggleTask = async (task: CaseTask) => {
    const res = await fetch(`/api/director-case-tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_completed: !task.is_completed }) })
    if (res.ok) {
      const updated = await res.json()
      setCaseTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
      setAllTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    }
  }

  const deleteTask = async (id: string) => {
    const res = await fetch(`/api/director-case-tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setCaseTasks(prev => prev.filter(t => t.id !== id))
      setAllTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  const monthsElapsed = (startDate: string | null): string => {
    if (!startDate) return '—'
    const start = new Date(startDate)
    const now = new Date()
    const m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    if (m <= 0) return '初月'
    return `${m + 1}か月`
  }

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarYear(y => y - 1); setCalendarMonth(11) }
    else setCalendarMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarYear(y => y + 1); setCalendarMonth(0) }
    else setCalendarMonth(m => m + 1)
  }

  const activeCases = cases.filter(c => !c.is_archived)
  const archivedCases = cases.filter(c => c.is_archived)

  const filteredCases = (() => {
    if (view === 'archived') return archivedCases
    const now = new Date()
    switch (view) {
      case 'active':
        return activeCases.filter(c => c.is_active && !c.actual_completion_date)
      case 'this_month':
        return activeCases.filter(c => {
          if (!c.next_date) return false
          const d = new Date(c.next_date)
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        })
      default:
        return activeCases
    }
  })()

  const casesByDay = (() => {
    const map: Record<number, DirectorCase[]> = {}
    for (const c of activeCases) {
      if (!c.next_date) continue
      const d = new Date(c.next_date)
      if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) continue
      const day = d.getDate()
      if (!map[day]) map[day] = []
      map[day].push(c)
    }
    return map
  })()

  const byDirector = (() => {
    if (view !== 'by_director') return null
    const groups: Record<string, DirectorCase[]> = {}
    for (const c of activeCases) {
      const key = c.director_email || '__none__'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  })()

  const bySales = (() => {
    if (view !== 'by_sales') return null
    const groups: Record<string, DirectorCase[]> = {}
    for (const c of activeCases) {
      const key = c.sales_email || '__none__'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  })()

  const MONTH_GROUPS: { key: string; label: string; color: { bg: string; border: string; text: string; badge: string } }[] = [
    { key: '初月', label: '初月', color: { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-500' } },
    { key: '3か月目', label: '3か月目', color: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-500' } },
    { key: '5か月目', label: '5か月目', color: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-500' } },
    { key: '半年', label: '半年以上', color: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-500' } },
    { key: '1年以上', label: '1年以上', color: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', badge: 'bg-red-100 text-red-500' } },
    { key: 'other', label: '開始日未設定', color: { bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-400' } },
  ]

  const byMonth = (() => {
    if (view !== 'by_month') return null
    const now = new Date()
    const getGroup = (startDate: string | null): string => {
      if (!startDate) return 'other'
      const start = new Date(startDate)
      const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      if (months <= 1) return '初月'
      if (months <= 3) return '3か月目'
      if (months <= 5) return '5か月目'
      if (months <= 11) return '半年'
      return '1年以上'
    }
    const groups: Record<string, DirectorCase[]> = { '初月': [], '3か月目': [], '5か月目': [], '半年': [], '1年以上': [], 'other': [] }
    const sorted = [...activeCases].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    for (const c of sorted) {
      groups[getGroup(c.start_date)].push(c)
    }
    return groups
  })()

  const openAdd = () => {
    setEditingCase(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (c: DirectorCase) => {
    setEditingCase(c)
    setForm({
      case_name: c.case_name,
      client_name: c.client_name,
      director_email: c.director_email,
      sales_email: c.sales_email,
      assistant_email: c.assistant_email,
      current_position: c.current_position,
      next_date: c.next_date ? (c.next_date.includes('T') ? c.next_date.slice(0, 16) : c.next_date + 'T00:00') : '',
      current_task: c.current_task,
      case_status: c.case_status,
      is_active: c.is_active,
      priority: c.priority,
      sales_estimate: c.sales_estimate != null ? String(c.sales_estimate) : '',
      actual_completion_date: c.actual_completion_date ?? '',
      start_date: c.start_date ?? '',
      manhours_sheet: c.manhours_sheet,
      memo: c.memo,
      case_stage: c.case_stage ?? '',
      case_media: c.case_media ?? '',
    })
    setShowForm(true)
  }

  const saveCase = async () => {
    if (!form.case_name.trim()) return
    setSaving(true)
    const body = {
      ...form,
      sales_estimate: form.sales_estimate !== '' ? Number(form.sales_estimate) : null,
      next_date: form.next_date || null,
      actual_completion_date: form.actual_completion_date || null,
      start_date: form.start_date || null,
    }
    if (editingCase) {
      const res = await fetch(`/api/director-cases/${editingCase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setCases(prev => prev.map(c => c.id === updated.id ? updated : c))
      }
    } else {
      const res = await fetch('/api/director-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setCases(prev => [created, ...prev])
      }
    }
    setSaving(false)
    setShowForm(false)
  }

  const archiveCase = async (id: string) => {
    const res = await fetch(`/api/director-cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true }),
    })
    if (res.ok) setCases(prev => prev.map(c => c.id === id ? { ...c, is_archived: true } : c))
  }

  const restoreCase = async (id: string) => {
    const res = await fetch(`/api/director-cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: false }),
    })
    if (res.ok) setCases(prev => prev.map(c => c.id === id ? { ...c, is_archived: false } : c))
  }

  const permanentDelete = async (id: string) => {
    if (!confirm('完全に削除しますか？元に戻せません。')) return
    const res = await fetch(`/api/director-cases/${id}`, { method: 'DELETE' })
    if (res.ok) setCases(prev => prev.filter(c => c.id !== id))
  }

  const fmtDate = (d: string | null) => {
    if (!d) return ''
    if (d.includes('T')) {
      const [datePart, timePart] = d.split('T')
      const time = timePart.slice(0, 5)
      return time === '00:00' ? datePart.replace(/-/g, '/') : `${datePart.replace(/-/g, '/')} ${time}`
    }
    return d.replace(/-/g, '/')
  }

  const fmtUpdated = (ts: string) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const renderGanttCombined = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const todayDate = new Date()
    const isCurrentMonth = todayDate.getFullYear() === calendarYear && todayDate.getMonth() === calendarMonth
    const todayDay = isCurrentMonth ? todayDate.getDate() : -1
    const DOW = ['日','月','火','水','木','金','土']

    // 担当別グループ（next_date が今月の案件）
    const monthCases = activeCases.filter(c => {
      if (!c.next_date) return false
      const d = new Date(c.next_date)
      return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth
    })
    const groups: Record<string, DirectorCase[]> = {}
    for (const c of monthCases) {
      const key = c.director_email || '__none__'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    const entries = Object.entries(groups)

    if (entries.length === 0) {
      return <div className="py-12 text-center text-gray-300 text-sm">この月の案件はありません</div>
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0 z-20">
              <th className="sticky left-0 z-30 bg-gray-50/80 px-3 py-2 text-[10px] font-semibold text-gray-500 whitespace-nowrap min-w-[160px]">案件名</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 whitespace-nowrap min-w-[140px]">現在タスク</th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1
                const dow = new Date(calendarYear, calendarMonth, d).getDay()
                return (
                  <th key={d} className={clsx('w-7 py-2 text-center text-[9px] font-semibold',
                    d === todayDay ? 'text-orange-500' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-400'
                  )}>
                    <div>{d}</div>
                    <div className="font-normal">{DOW[dow]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {entries.map(([email, grpCases], idx) => {
              const color = DIRECTOR_COLORS[idx % DIRECTOR_COLORS.length]
              const sorted = [...grpCases].sort((a, b) => (a.next_date ?? '').localeCompare(b.next_date ?? ''))
              return (
                <Fragment key={email}>
                  {/* 担当ヘッダー行 */}
                  <tr>
                    <td colSpan={daysInMonth + 2}
                      className={clsx('px-4 py-2 border-y text-sm font-bold', color.bg, color.border, color.text)}>
                      {email === '__none__' ? '未設定' : memberNames[email] || email}
                      <span className={clsx('ml-2 text-xs px-2 py-0.5 rounded-full font-normal', color.badge)}>{sorted.length}件</span>
                    </td>
                  </tr>
                  {/* 案件行 */}
                  {sorted.map(c => {
                    const day = c.next_date ? new Date(c.next_date).getDate() : null
                    const time = c.next_date?.includes('T') && c.next_date.split('T')[1].slice(0, 5) !== '00:00'
                      ? c.next_date.split('T')[1].slice(0, 5) : null
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-orange-50/20 transition-colors">
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 whitespace-nowrap max-w-[200px]">
                          <button onClick={() => openEdit(c)}
                            className="text-[11px] font-semibold text-gray-800 hover:text-orange-500 transition-colors truncate block max-w-full text-left">
                            {c.case_name}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-500 whitespace-nowrap max-w-[160px]">
                          <span className="block truncate">{c.current_task || '—'}</span>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const d = i + 1
                          const dow = new Date(calendarYear, calendarMonth, d).getDay()
                          return (
                            <td key={d} className={clsx('text-center px-0 py-1.5',
                              d === todayDay ? 'bg-orange-50/40' : dow === 0 || dow === 6 ? 'bg-gray-50/40' : ''
                            )}>
                              {day === d && (
                                <button onClick={() => openEdit(c)}
                                  title={time ? `${c.case_name} ${time}` : c.case_name}
                                  className={clsx('w-5 h-5 rounded-full mx-auto flex items-center justify-center transition-colors', color.badge.split(' ')[0].replace('bg-', 'bg-').replace('100', '400'), 'hover:opacity-80')}>
                                  {time && <span className="text-[7px] text-white font-bold leading-none">{time.replace(':','')}</span>}
                                </button>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderCalendarCard = (c: DirectorCase) => (
    <button
      key={c.id}
      onClick={() => openEdit(c)}
      className="text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-orange-300 hover:shadow-sm transition-all flex items-center gap-2.5 min-w-[160px] max-w-[260px]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{c.case_name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {c.current_position && (
            <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-bold leading-none flex-shrink-0', POSITION_STYLES[c.current_position] ?? 'bg-gray-100 text-gray-600')}>
              {c.current_position}
            </span>
          )}
          {c.director_email && (
            <span className="text-[10px] text-gray-400 truncate">{memberNames[c.director_email] || c.director_email}</span>
          )}
        </div>
      </div>
    </button>
  )

  const renderCalendarGrid = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const today = new Date()
    const isToday = (day: number) =>
      today.getFullYear() === calendarYear &&
      today.getMonth() === calendarMonth &&
      today.getDate() === day
    const DOW = ['日', '月', '火', '水', '木', '金', '土']
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const dow = new Date(calendarYear, calendarMonth, day).getDay()
      const dayCases = casesByDay[day] ?? []
      const hasCases = dayCases.length > 0
      return (
        <div
          key={day}
          className={clsx(
            'flex items-start gap-3 px-5 py-2.5 border-b border-gray-100',
            isToday(day) ? 'bg-orange-50/40' : hasCases ? 'bg-white' : 'bg-gray-50/30'
          )}
        >
          <div className="flex-shrink-0 flex items-center gap-2 w-14">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              isToday(day) ? 'bg-orange-500 text-white' : dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-500'
            )}>
              {day}
            </div>
            <span className={clsx(
              'text-[10px] font-medium',
              dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-400'
            )}>
              {DOW[dow]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 flex-1 py-0.5">
            {dayCases.map(c => renderCalendarCard(c))}
          </div>
        </div>
      )
    })
  }

  const TableHead = () => (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50/80">
        {['','No','','月数','案件名','クライアント','ディレクター','営業','アシスタント','次回予定','タスク','案件ステータス','最終更新日','優先度','売上見込み','開始日'].map((h, i) => (
          <th key={i} className="px-2 py-2 text-left text-[9px] font-semibold text-gray-500 whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
  )

  const rowCells = (c: DirectorCase) => (
    <>
      <td className="px-2 py-2 whitespace-nowrap text-center">
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{monthsElapsed(c.start_date)}</span>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <span className="text-[11px] font-semibold text-gray-900">{c.case_name}</span>
      </td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{c.client_name}</td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{memberNames[c.director_email] || c.director_email || '—'}</td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{memberNames[c.sales_email] || c.sales_email || '—'}</td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{c.assistant_email || '—'}</td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{fmtDate(c.next_date)}</td>
      <td className="px-2 py-2 text-[11px] text-gray-700 whitespace-nowrap max-w-[180px]">
        <span className="block truncate">{c.current_task}</span>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <span className={clsx('text-[9px] px-1 py-0.5 rounded font-bold', STATUS_STYLES[c.case_status] ?? 'bg-gray-100 text-gray-600')}>
          {c.case_status}
        </span>
      </td>
      <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmtUpdated(c.updated_at)}</td>
      <td className="px-2 py-2 whitespace-nowrap">
        <span className={clsx('text-[9px] px-1 py-0.5 rounded font-bold', PRIORITY_STYLES[c.priority] ?? 'bg-gray-100 text-gray-500')}>
          {c.priority}
        </span>
      </td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">
        {c.sales_estimate != null ? `¥${Number(c.sales_estimate).toLocaleString()}` : '—'}
      </td>
      <td className="px-2 py-2 text-[11px] text-gray-600 whitespace-nowrap">{fmtDate(c.start_date)}</td>
    </>
  )

  const renderRow = (c: DirectorCase) => {
    const expanded = expandedIds.has(c.id)
    return (
      <Fragment key={c.id}>
        <tr className="hover:bg-orange-50/30 border-b border-gray-100 transition-colors">
          <td className="pl-2 pr-0 py-2 whitespace-nowrap">
            <button onClick={() => toggleExpand(c.id)} className="text-gray-300 hover:text-gray-500 transition-colors p-1">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </td>
          <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">{c.case_number}</td>
          <td className="pl-1 pr-2 py-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <button onClick={() => openEdit(c)} className="text-[11px] text-gray-400 hover:text-orange-500 px-1 py-0.5 hover:bg-orange-50 rounded transition-colors">編集</button>
              <button onClick={() => archiveCase(c.id)} className="text-gray-300 hover:text-red-400 transition-colors" title="終了案件へ移動">
                <Trash2 size={11} />
              </button>
            </div>
          </td>
          {rowCells(c)}
        </tr>
        {expanded && (
          <tr className="bg-amber-50/40 border-b border-gray-100">
            <td colSpan={16} className="pl-10 pr-6 py-3">
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{c.memo || '（メモなし）'}</p>
            </td>
          </tr>
        )}
      </Fragment>
    )
  }

  const renderArchivedRow = (c: DirectorCase) => {
    const expanded = expandedIds.has(c.id)
    return (
      <Fragment key={c.id}>
        <tr className="hover:bg-gray-50/50 border-b border-gray-100 transition-colors opacity-70">
          <td className="pl-2 pr-0 py-2 whitespace-nowrap">
            <button onClick={() => toggleExpand(c.id)} className="text-gray-300 hover:text-gray-500 transition-colors p-1">
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </td>
          <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">{c.case_number}</td>
          <td className="pl-1 pr-2 py-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <button onClick={() => restoreCase(c.id)} className="text-[11px] text-gray-400 hover:text-green-600 px-1 py-0.5 hover:bg-green-50 rounded transition-colors">復元</button>
              <button onClick={() => permanentDelete(c.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="完全削除">
                <Trash2 size={11} />
              </button>
            </div>
          </td>
          {rowCells(c)}
        </tr>
        {expanded && (
          <tr className="bg-gray-50 border-b border-gray-100">
            <td colSpan={16} className="pl-10 pr-6 py-3">
              <p className="text-xs text-gray-600 whitespace-pre-wrap">{c.memo || '（メモなし）'}</p>
            </td>
          </tr>
        )}
      </Fragment>
    )
  }

  const renderTable = (rows: DirectorCase[], archived = false) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <TableHead />
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={17} className="px-4 py-12 text-center text-gray-300 text-sm">案件がありません</td>
            </tr>
          ) : rows.map(c => archived ? renderArchivedRow(c) : renderRow(c))}
        </tbody>
      </table>
    </div>
  )

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300'
  const labelClass = 'block text-xs font-semibold text-gray-700 mb-1'

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
            <Briefcase size={18} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ディレクター管理表</h1>
            <p className="text-gray-500 mt-0.5 text-sm">案件・担当者・タスクの一元管理</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus size={14} />
          案件を追加
        </button>
      </div>

      {/* ビュータブ */}
      <div className="flex items-center gap-0 mb-4 border-b border-gray-200">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              view === v.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {v.label}
            {v.key === 'all' && <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{activeCases.length}</span>}
            {v.key === 'archived' && archivedCases.length > 0 && <span className="ml-1.5 text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">{archivedCases.length}</span>}
          </button>
        ))}
      </div>

      {/* テーブルエリア */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden -mx-6">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : (view === 'by_director' && byDirector) || (view === 'by_sales' && bySales) ? (
          <div>
            {(() => {
              const groups = view === 'by_director' ? byDirector! : bySales!
              const emailKey = view === 'by_director' ? 'director' : 'sales'
              return Object.keys(groups).length === 0 ? (
                <div className="py-12 text-center text-gray-300 text-sm">案件がありません</div>
              ) : Object.entries(groups).map(([email, grpCases], idx) => {
                const color = DIRECTOR_COLORS[idx % DIRECTOR_COLORS.length]
                return (
                  <div key={`${emailKey}-${email}`}>
                    <div className={clsx('px-4 py-2.5 border-b flex items-center gap-2', color.bg, color.border)}>
                      <span className={clsx('text-sm font-bold', color.text)}>
                        {email === '__none__' ? '未設定' : (memberNames[email] || email)}
                      </span>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full', color.badge)}>{grpCases.length}件</span>
                    </div>
                    {renderTable(grpCases)}
                  </div>
                )
              })
            })()}
          </div>
        ) : view === 'by_month' && byMonth ? (
          <div>
            {MONTH_GROUPS.map(({ key, label, color }) => {
              const grpCases = byMonth[key] ?? []
              return (
                <div key={key}>
                  <div className={clsx('px-4 py-2.5 border-b flex items-center gap-2', color.bg, color.border)}>
                    <span className={clsx('text-sm font-bold', color.text)}>{label}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', color.badge)}>{grpCases.length}件</span>
                  </div>
                  {renderTable(grpCases)}
                </div>
              )
            })}
          </div>
        ) : view === 'this_month' ? (
          <div>
            <div className="flex items-center gap-1 px-5 py-2.5 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={14} className="text-gray-500" /></button>
              <span className="text-sm font-bold text-gray-800 px-1">{calendarYear}年{calendarMonth + 1}月</span>
              <button onClick={() => { setCalendarYear(new Date().getFullYear()); setCalendarMonth(new Date().getMonth()) }} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded-lg transition-colors">今日</button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={14} className="text-gray-500" /></button>
            </div>
            {renderGanttCombined()}
          </div>
        ) : view === 'new_case' ? (
          <div>
            {NEW_CASE_STAGES.map(stage => {
              const s = STAGE_STYLES[stage]
              const stageCases = activeCases.filter(c => c.case_stage === stage)
              return (
                <div key={stage}>
                  <div className={clsx('px-4 py-2.5 border-b flex items-center gap-2', s.bg, s.border)}>
                    <span className={clsx('text-sm font-bold', s.text)}>{stage}</span>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full', s.badge)}>{stageCases.length}件</span>
                  </div>
                  {renderTable(stageCases)}
                </div>
              )
            })}
          </div>
        ) : view === 'task_list' ? (
          <div>
            <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
              {TASK_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setTaskListTab(cat as typeof taskListTab)}
                  className={clsx('px-3 py-1.5 text-xs rounded-lg font-medium transition-colors',
                    taskListTab === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="divide-y divide-gray-100">
              {allTasks.filter(t => t.category === taskListTab).length === 0 ? (
                <p className="py-12 text-center text-gray-300 text-sm">タスクがありません</p>
              ) : allTasks.filter(t => t.category === taskListTab).map(task => {
                const c = cases.find(x => x.id === task.case_id)
                return (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50">
                    <button onClick={() => toggleTask(task)}
                      className={clsx('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        task.is_completed ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-300')}>
                      {task.is_completed && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <span className={clsx('flex-1 text-sm', task.is_completed && 'line-through text-gray-400')}>{task.title}</span>
                    {c && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{c.case_name}</span>}
                    {task.assignee_email && <span className="text-[10px] text-gray-500">{memberNames[task.assignee_email] || task.assignee_email}</span>}
                    <button onClick={() => deleteTask(task.id)} className="text-gray-200 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : view === 'all' ? (
          <div>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100">
              <span className="text-[11px] text-gray-500">並び替え:</span>
              {([['default','デフォルト'],['oldest','古い順'],['sales','売上順'],['active','稼働中順']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setAllCasesSort(key)}
                  className={clsx('px-2.5 py-1 text-[10px] rounded font-medium transition-colors',
                    allCasesSort === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {label}
                </button>
              ))}
            </div>
            {(() => {
              const sortCases = (arr: DirectorCase[]) => {
                if (allCasesSort === 'oldest') return [...arr].sort((a, b) => (a.case_number ?? 0) - (b.case_number ?? 0))
                if (allCasesSort === 'sales') return [...arr].sort((a, b) => (b.sales_estimate ?? 0) - (a.sales_estimate ?? 0))
                if (allCasesSort === 'active') return [...arr].sort((a, b) => Number(b.is_active) - Number(a.is_active))
                return arr
              }
              const unassigned = sortCases(activeCases.filter(c => !c.assistant_email))
              const assigned = sortCases(activeCases.filter(c => !!c.assistant_email))
              return (
                <>
                  <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-amber-50 border-amber-100">
                    <span className="text-sm font-bold text-amber-700">未振り分け</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">{unassigned.length}件</span>
                  </div>
                  {renderTable(unassigned)}
                  <div className="px-4 py-2.5 border-b flex items-center gap-2 bg-green-50 border-green-100">
                    <span className="text-sm font-bold text-green-700">振り分け済み</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600">{assigned.length}件</span>
                  </div>
                  {renderTable(assigned)}
                </>
              )
            })()}
          </div>
        ) : renderTable(filteredCases, view === 'archived')}
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">
                {editingCase ? '案件を編集' : '案件を追加'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 案件名 */}
              <div>
                <label className={labelClass}>案件名 <span className="text-red-400">*</span></label>
                <input
                  value={form.case_name}
                  onChange={e => setForm(f => ({ ...f, case_name: e.target.value }))}
                  className={inputClass}
                  placeholder="案件名を入力"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* クライアント */}
                <div>
                  <label className={labelClass}>クライアント</label>
                  <input
                    value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className={inputClass}
                    placeholder="クライアント名"
                  />
                </div>

                {/* 案件ステータス */}
                <div>
                  <label className={labelClass}>案件ステータス</label>
                  <select
                    value={form.case_status}
                    onChange={e => setForm(f => ({ ...f, case_status: e.target.value }))}
                    className={inputClass}
                  >
                    {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* ディレクター */}
                <div>
                  <label className={labelClass}>ディレクター</label>
                  <select
                    value={form.director_email}
                    onChange={e => setForm(f => ({ ...f, director_email: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">未設定</option>
                    {members.map(m => <option key={m.id} value={m.email}>{m.name || m.email}</option>)}
                  </select>
                </div>

                {/* 営業 */}
                <div>
                  <label className={labelClass}>営業</label>
                  <select
                    value={form.sales_email}
                    onChange={e => setForm(f => ({ ...f, sales_email: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">未設定</option>
                    {members.map(m => <option key={m.id} value={m.email}>{m.name || m.email}</option>)}
                  </select>
                </div>

                {/* アシスタント */}
                <div>
                  <label className={labelClass}>アシスタント</label>
                  <input
                    value={form.assistant_email}
                    onChange={e => setForm(f => ({ ...f, assistant_email: e.target.value }))}
                    className={inputClass}
                    placeholder="アシスタント名を入力"
                  />
                </div>

                {/* 次回予定 */}
                <div>
                  <label className={labelClass}>次回予定</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={form.next_date ? form.next_date.split('T')[0] : ''}
                      onChange={e => {
                        const d = e.target.value
                        setForm(f => {
                          const t = f.next_date.includes('T') ? f.next_date.split('T')[1].slice(0, 5) : '00:00'
                          return { ...f, next_date: d ? `${d}T${t}` : '' }
                        })
                      }}
                      className={clsx(inputClass, 'flex-1')}
                    />
                    <select
                      value={form.next_date.includes('T') ? form.next_date.split('T')[1].slice(0, 5) : '00:00'}
                      onChange={e => setForm(f => {
                        const d = f.next_date ? f.next_date.split('T')[0] : ''
                        return { ...f, next_date: d ? `${d}T${e.target.value}` : f.next_date }
                      })}
                      className={clsx(inputClass, 'w-28')}
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const h = String(Math.floor(i / 2)).padStart(2, '0')
                        const m = i % 2 === 0 ? '00' : '30'
                        return <option key={i} value={`${h}:${m}`}>{`${h}:${m}`}</option>
                      })}
                    </select>
                  </div>
                </div>

                {/* 優先度 */}
                <div>
                  <label className={labelClass}>優先度</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={inputClass}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* タスク */}
              <div>
                <label className={labelClass}>タスク</label>
                <input
                  value={form.current_task}
                  onChange={e => setForm(f => ({ ...f, current_task: e.target.value }))}
                  className={inputClass}
                  placeholder="タスク内容"
                />
                {editingCase && !taskLoading && (() => {
                  const tasks = caseTasks.filter(t => t.category === '業務')
                  return (
                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                      {tasks.length > 0 && (
                        <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                          {tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 px-3 py-1.5">
                              <button onClick={() => toggleTask(task)}
                                className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  task.is_completed ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 hover:border-orange-300')}>
                                {task.is_completed && <span className="text-[8px] font-bold">✓</span>}
                              </button>
                              <span className={clsx('flex-1 text-xs', task.is_completed && 'line-through text-gray-400')}>{task.title}</span>
                              {task.assignee_email && <span className="text-[9px] text-gray-400">{memberNames[task.assignee_email] || task.assignee_email}</span>}
                              <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 p-2 bg-gray-50 border-t border-gray-100">
                        <input value={newTaskInputs['業務'].title}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '業務': { ...p['業務'], title: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTaskForCategory('業務') } }}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                          placeholder="タスクを追加..." />
                        <select value={newTaskInputs['業務'].assignee}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '業務': { ...p['業務'], assignee: e.target.value } }))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none">
                          <option value="">担当未設定</option>
                          {members.map(m => <option key={m.id} value={m.email}>{m.name || m.email}</option>)}
                        </select>
                        <button onClick={() => addTaskForCategory('業務')}
                          className="px-2.5 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors flex items-center gap-1">
                          <Plus size={10} />追加
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* 週次タスク */}
              {editingCase && !taskLoading && (() => {
                const tasks = caseTasks.filter(t => t.category === '週次')
                return (
                  <div>
                    <label className={labelClass}>週次タスク</label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {tasks.length > 0 && (
                        <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                          {tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 px-3 py-1.5">
                              <button onClick={() => toggleTask(task)}
                                className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  task.is_completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 hover:border-blue-300')}>
                                {task.is_completed && <span className="text-[8px] font-bold">✓</span>}
                              </button>
                              <span className={clsx('flex-1 text-xs', task.is_completed && 'line-through text-gray-400')}>{task.title}</span>
                              {task.assignee_email && <span className="text-[9px] text-gray-400">{memberNames[task.assignee_email] || task.assignee_email}</span>}
                              <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 p-2 bg-gray-50 border-t border-gray-100">
                        <input value={newTaskInputs['週次'].title}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '週次': { ...p['週次'], title: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTaskForCategory('週次') } }}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                          placeholder="週次タスクを追加..." />
                        <select value={newTaskInputs['週次'].assignee}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '週次': { ...p['週次'], assignee: e.target.value } }))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none">
                          <option value="">担当未設定</option>
                          {members.map(m => <option key={m.id} value={m.email}>{m.name || m.email}</option>)}
                        </select>
                        <button onClick={() => addTaskForCategory('週次')}
                          className="px-2.5 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex items-center gap-1">
                          <Plus size={10} />追加
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 月次タスク */}
              {editingCase && !taskLoading && (() => {
                const tasks = caseTasks.filter(t => t.category === '月次')
                return (
                  <div>
                    <label className={labelClass}>月次タスク</label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {tasks.length > 0 && (
                        <div className="divide-y divide-gray-100 max-h-36 overflow-y-auto">
                          {tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 px-3 py-1.5">
                              <button onClick={() => toggleTask(task)}
                                className={clsx('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                  task.is_completed ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300 hover:border-purple-300')}>
                                {task.is_completed && <span className="text-[8px] font-bold">✓</span>}
                              </button>
                              <span className={clsx('flex-1 text-xs', task.is_completed && 'line-through text-gray-400')}>{task.title}</span>
                              {task.assignee_email && <span className="text-[9px] text-gray-400">{memberNames[task.assignee_email] || task.assignee_email}</span>}
                              <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 p-2 bg-gray-50 border-t border-gray-100">
                        <input value={newTaskInputs['月次'].title}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '月次': { ...p['月次'], title: e.target.value } }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTaskForCategory('月次') } }}
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-300"
                          placeholder="月次タスクを追加..." />
                        <select value={newTaskInputs['月次'].assignee}
                          onChange={e => setNewTaskInputs(p => ({ ...p, '月次': { ...p['月次'], assignee: e.target.value } }))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none">
                          <option value="">担当未設定</option>
                          {members.map(m => <option key={m.id} value={m.email}>{m.name || m.email}</option>)}
                        </select>
                        <button onClick={() => addTaskForCategory('月次')}
                          className="px-2.5 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors flex items-center gap-1">
                          <Plus size={10} />追加
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-4">
                {/* 開始日 */}
                <div>
                  <label className={labelClass}>開始日</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                {/* 実際の完了日 */}
                <div>
                  <label className={labelClass}>実際の完了日</label>
                  <input
                    type="date"
                    value={form.actual_completion_date}
                    onChange={e => setForm(f => ({ ...f, actual_completion_date: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                {/* 売上見込み */}
                <div>
                  <label className={labelClass}>売上見込み（円）</label>
                  <input
                    type="number"
                    value={form.sales_estimate}
                    onChange={e => setForm(f => ({ ...f, sales_estimate: e.target.value }))}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>

                {/* 進行中フラグ */}
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer py-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">進行中の案件</span>
                  </label>
                </div>
              </div>

              {/* 新規案件ステージ＋媒体 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>新規案件ステージ</label>
                  <select
                    value={form.case_stage}
                    onChange={e => setForm(f => ({ ...f, case_stage: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">未設定</option>
                    {NEW_CASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>媒体</label>
                  <select
                    value={form.case_media}
                    onChange={e => setForm(f => ({ ...f, case_media: e.target.value }))}
                    className={inputClass}
                  >
                    {MEDIA_OPTIONS.map(m => <option key={m} value={m}>{m || '未設定'}</option>)}
                  </select>
                </div>
              </div>

              {/* 工数シート */}
              <div>
                <label className={labelClass}>工数シート（URLまたはシート名）</label>
                <input
                  value={form.manhours_sheet}
                  onChange={e => setForm(f => ({ ...f, manhours_sheet: e.target.value }))}
                  className={inputClass}
                  placeholder="https://docs.google.com/..."
                />
              </div>

              {/* メモ */}
              <div>
                <label className={labelClass}>メモ</label>
                <textarea
                  value={form.memo}
                  onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
                  className={inputClass}
                  rows={3}
                  placeholder="メモを入力"
                />
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveCase}
                disabled={saving || !form.case_name.trim()}
                className="px-5 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-40"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
