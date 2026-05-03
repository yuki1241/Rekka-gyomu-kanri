'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Settings, X, MessageSquare, Check, Plus, Trash2, ChevronDown, ChevronUp, Upload, CheckSquare } from 'lucide-react'
import clsx from 'clsx'

interface GoalTemplate {
  id: string
  type: string
  order_num: number
  label: string
}

interface GoalEntry {
  id: string
  template_id: string
  year_month: string
  week_num: number
  target_value: number
  actual_value: number
  reflection: string
}

type EntryMap = Record<string, GoalEntry> // key: `${template_id}-${week_num}`

interface ProspectClient {
  id: string
  company_name: string
  contact_name: string
  service_content: string
  status: '見込み' | '成約' | '失注'
  contracted_at: string | null
  memo: string
  created_at: string
}

const SPREADSHEET_ID = '1a5UjlKCA_FwqHLagEpeCPdh1C0hytLHWyjTkrbDeoqQ'

function SheetImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [sheets, setSheets] = useState<{ title: string; sheetId: number }[]>([])
  const [sheetName, setSheetName] = useState('')
  const [fromMonth, setFromMonth] = useState('2025-01')
  const [toMonth, setToMonth] = useState('2026-03')
  const [importProspects, setImportProspects] = useState(true)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ months: string[]; total: number; prospectTotal: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState<{ months: string[]; inserted: number; prospectInserted: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/sheets/import?id=${SPREADSHEET_ID}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.sheets) {
          setSheets(d.sheets)
          setSheetName(d.sheets[0]?.title ?? '')
        } else {
          setError(d.error ?? 'シート一覧の取得に失敗しました')
        }
      })
      .catch((e) => setError(String(e)))
  }, [])

  const handlePreview = async () => {
    setLoading(true); setError(''); setPreview(null)
    const res = await fetch('/api/sheets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, sheetName, dryRun: true, fromMonth, toMonth, importProspects }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'エラーが発生しました'); return }
    setPreview({ months: data.months, total: data.total, prospectTotal: data.prospectTotal ?? 0 })
  }

  const handleImport = async () => {
    setImporting(true); setError('')
    const res = await fetch('/api/sheets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, sheetName, dryRun: false, fromMonth, toMonth }),
    })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) { setError(data.error ?? 'エラーが発生しました'); return }
    setDone({ months: data.months, inserted: data.inserted, prospectInserted: data.prospectInserted ?? 0 })
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">スプレッドシートからインポート</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">シートを選択</label>
            <select value={sheetName} onChange={(e) => setSheetName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 bg-white">
              {sheets.map((s) => <option key={s.sheetId} value={s.title}>{s.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">取込開始月</label>
              <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">取込終了月</label>
              <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={importProspects} onChange={(e) => setImportProspects(e.target.checked)}
              className="w-4 h-4 accent-orange-500" />
            <span className="text-xs text-gray-600">KGI振り返り欄の企業名を「成約」として取込む</span>
          </label>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {done ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-700 mb-1">インポート完了！</p>
              <p className="text-xs text-green-600">KGI/KPI/KDI：{done.months.length}ヶ月分 {done.inserted}件</p>
              {done.prospectInserted > 0 && <p className="text-xs text-green-600">成約企業：{done.prospectInserted}件</p>}
              <p className="text-xs text-green-600 mt-1">対象月：{done.months.join('、')}</p>
            </div>
          ) : preview ? (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-orange-700 mb-1">プレビュー</p>
              <p className="text-xs text-gray-600">KGI/KPI/KDI：{preview.months.length}ヶ月分 / {preview.total}件</p>
              {importProspects && <p className="text-xs text-gray-600">成約企業：{preview.prospectTotal}件（KGI振り返りから抽出）</p>}
              <p className="text-xs text-gray-500 mt-1">対象月：{preview.months.join('、')}</p>
              <p className="text-xs text-gray-400 mt-2">※既存データは上書きされます</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              KGI・KPI・KDIデータと成約企業名を取り込みます。
            </p>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          {done ? (
            <button onClick={onClose} className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">閉じる</button>
          ) : preview ? (
            <>
              <button onClick={handleImport} disabled={importing}
                className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50">
                {importing ? 'インポート中...' : 'インポート実行'}
              </button>
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">戻る</button>
            </>
          ) : (
            <>
              <button onClick={handlePreview} disabled={loading || !sheetName}
                className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50">
                {loading ? '確認中...' : '内容を確認'}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- 見込み×タスク連動 ----------
interface ProspectTask {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  due_date: string | null
}

function ProspectTaskSection({ prospectId, prospectName }: { prospectId: string; prospectName: string }) {
  const [expanded, setExpanded] = useState(false)
  const [tasks, setTasks] = useState<ProspectTask[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchTasks = async () => {
    setLoading(true)
    const res = await fetch(`/api/tasks?prospect_id=${prospectId}`)
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }

  const handleToggle = () => {
    if (!expanded) fetchTasks()
    setExpanded((v) => !v)
  }

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        due_date: newDueDate || null,
        prospect_id: prospectId,
        prospect_name: prospectName,
        status: 'todo',
        priority: 'medium',
        description: '',
      }),
    })
    setNewTitle('')
    setNewDueDate('')
    setShowForm(false)
    setAdding(false)
    fetchTasks()
  }

  const statusLabel = { todo: '未着手', in_progress: '進行中', done: '完了' }
  const statusCls = {
    todo: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-600',
    done: 'bg-green-100 text-green-600',
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors"
      >
        <CheckSquare size={11} />
        <span>タスク</span>
        {tasks.length > 0 && (
          <span className="bg-blue-100 text-blue-600 rounded-full px-1.5 text-[10px] font-bold">{tasks.length}</span>
        )}
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {loading ? (
            <p className="text-[11px] text-gray-300">読み込み中...</p>
          ) : tasks.length === 0 && !showForm ? (
            <p className="text-[11px] text-gray-300">タスクはありません</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${statusCls[t.status]}`}>
                  {statusLabel[t.status]}
                </span>
                <span className={`text-xs flex-1 truncate ${t.status === 'done' ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                  {t.title}
                </span>
                {t.due_date && <span className="text-[10px] text-gray-300 flex-shrink-0">{t.due_date}</span>}
              </div>
            ))
          )}

          {showForm ? (
            <div className="flex gap-1 mt-1">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="タスク名"
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newTitle.trim()}
                className="text-xs bg-blue-500 text-white rounded px-2 py-1 disabled:opacity-50"
              >
                追加
              </button>
              <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">×</button>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-600 transition-colors mt-1"
            >
              <Plus size={11} /> タスクを追加
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const STATUS_STYLES: Record<string, string> = {
  '見込み': 'bg-blue-100 text-blue-700',
  '成約': 'bg-green-100 text-green-700',
  '失注': 'bg-gray-100 text-gray-500',
}

function ProspectForm({ initial, onSave, onCancel }: {
  initial?: Partial<ProspectClient>
  onSave: (data: Partial<ProspectClient>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    company_name: initial?.company_name ?? '',
    contact_name: initial?.contact_name ?? '',
    service_content: initial?.service_content ?? '',
    status: initial?.status ?? '見込み' as ProspectClient['status'],
    contracted_at: initial?.contracted_at ?? '',
    memo: initial?.memo ?? '',
  })

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }))

  return (
    <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">会社名</label>
          <input value={form.company_name} onChange={(e) => set('company_name', e.target.value)}
            placeholder="株式会社〇〇" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">顧客名</label>
          <input value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)}
            placeholder="山田 太郎" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
        </div>
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">商談内容</label>
        <input value={form.service_content} onChange={(e) => set('service_content', e.target.value)}
          placeholder="DXコンサル、kintone導入 など" className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 mb-1 block">ステータス</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 bg-white">
            <option value="見込み">見込み</option>
            <option value="成約">成約</option>
            <option value="失注">失注</option>
          </select>
        </div>
        {(form.status === '成約' || form.status === '失注') && (
          <div>
            <label className="text-[10px] font-semibold text-gray-500 mb-1 block">
              {form.status === '成約' ? '成約日' : '失注日'}
            </label>
            <input type="date" value={form.contracted_at ?? ''} onChange={(e) => set('contracted_at', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300" />
          </div>
        )}
      </div>
      <div className="mb-4">
        <label className="text-[10px] font-semibold text-gray-500 mb-1 block">メモ</label>
        <textarea value={form.memo} onChange={(e) => set('memo', e.target.value)}
          rows={2} placeholder="備考など..." className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300 resize-none" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">キャンセル</button>
        <button onClick={() => onSave({ ...form, contracted_at: form.contracted_at || null })}
          className="px-4 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">保存</button>
      </div>
    </div>
  )
}

const WEEKS = [
  { num: 0, label: '月合計' },
  { num: 1, label: '1週目' },
  { num: 2, label: '2週目' },
  { num: 3, label: '3週目' },
  { num: 4, label: '4週目' },
  { num: 5, label: '5週目' },
]

function getRate(target: number, actual: number): number | null {
  if (!target) return null
  return Math.round((actual / target) * 100)
}

function RateCell({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-gray-300 text-xs">—</span>
  const color = rate >= 100 ? 'text-green-700 bg-green-100' : rate >= 50 ? 'text-yellow-700 bg-yellow-100' : 'text-red-700 bg-red-100'
  return (
    <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded', color)}>
      {rate}%
    </span>
  )
}

function NumberCell({
  value, onChange
}: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLocal(String(value)) }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { setEditing(false); onChange(parseFloat(local) || 0) }}
        onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(false); onChange(parseFloat(local) || 0) } }}
        className="w-14 text-center text-xs border border-orange-300 rounded px-1 py-0.5 focus:outline-none"
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className="text-xs text-gray-800 cursor-pointer hover:bg-orange-50 px-1.5 py-0.5 rounded min-w-[2rem] text-center block"
    >
      {value || 0}
    </span>
  )
}

function ReflectionCell({
  value, onChange
}: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'p-1 rounded transition-colors',
          value ? 'text-orange-500 hover:bg-orange-50' : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'
        )}
      >
        <MessageSquare size={12} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
          onClick={() => { setOpen(false); onChange(local) }}>
          <div className="bg-white rounded-xl shadow-2xl p-4 w-72"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">振り返り</p>
              <div className="flex gap-1">
                <button onClick={() => { onChange(local); setOpen(false) }}
                  className="p-1 text-orange-500 hover:bg-orange-50 rounded">
                  <Check size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                  <X size={14} />
                </button>
              </div>
            </div>
            <textarea
              autoFocus
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              rows={4}
              placeholder="振り返りを入力..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-orange-300"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ラベル編集モーダル
function TemplateEditor({ templates, onClose, onSaved }: {
  templates: GoalTemplate[]
  onClose: () => void
  onSaved: (updated: GoalTemplate[]) => void
}) {
  const [local, setLocal] = useState(templates.map((t) => ({ ...t })))
  const [saving, setSaving] = useState(false)

  const setLabel = (id: string, label: string) => {
    setLocal((prev) => prev.map((t) => t.id === id ? { ...t, label } : t))
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/goals/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates: local }),
    })
    setSaving(false)
    onSaved(local)
  }

  const kgi = local.filter((t) => t.type === 'KGI')
  const kpi = local.filter((t) => t.type === 'KPI')
  const kdi = local.filter((t) => t.type === 'KDI').sort((a, b) => a.order_num - b.order_num)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">ラベルを編集</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {[...kgi, ...kpi].map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className={clsx(
                'text-xs font-bold px-2 py-1 rounded flex-shrink-0 w-12 text-center',
                t.type === 'KGI' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              )}>{t.type}</span>
              <input
                value={t.label}
                onChange={(e) => setLabel(t.id, e.target.value)}
                placeholder={`${t.type}の内容を入力`}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300"
              />
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 mb-2">KDI（行動指標）</p>
            {kdi.map((t) => (
              <div key={t.id} className="flex items-center gap-3 mb-2">
                <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 flex-shrink-0 w-12 text-center">
                  KDI{t.order_num}
                </span>
                <input
                  value={t.label}
                  onChange={(e) => setLabel(t.id, e.target.value)}
                  placeholder={`KDI${t.order_num}の内容`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-300"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

// メインページ
export default function ProspectsPage() {
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [templates, setTemplates] = useState<GoalTemplate[]>([])
  const [entryMap, setEntryMap] = useState<EntryMap>({})
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // 顧客管理
  const [prospects, setProspects] = useState<ProspectClient[]>([])
  const [showProspectForm, setShowProspectForm] = useState(false)
  const [editingProspect, setEditingProspect] = useState<ProspectClient | null>(null)
  const [showLost, setShowLost] = useState(false)

  const fetchData = useCallback(async (ym: string) => {
    setLoading(true)
    const [goalsRes, prospectsRes] = await Promise.all([
      fetch(`/api/goals?year_month=${ym}`),
      fetch('/api/prospects'),
    ])
    const data = await goalsRes.json()
    setTemplates(data.templates ?? [])
    const map: EntryMap = {}
    for (const e of (data.entries ?? [])) {
      map[`${e.template_id}-${e.week_num}`] = e
    }
    setEntryMap(map)
    const pData = await prospectsRes.json()
    setProspects(Array.isArray(pData) ? pData : [])
    setLoading(false)
  }, [])

  const addProspect = async (form: Partial<ProspectClient>) => {
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setProspects((prev) => [data, ...prev])
    setShowProspectForm(false)
  }

  const updateProspect = async (id: string, form: Partial<ProspectClient>) => {
    const currentProspect = prospects.find((p) => p.id === id)
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setProspects((prev) => prev.map((p) => p.id === id ? data : p))
    setEditingProspect(null)

    // 成約になった瞬間にプロジェクト自動作成
    if (form.status === '成約' && currentProspect?.status !== '成約') {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.company_name ?? currentProspect?.company_name ?? '新規プロジェクト',
          description: form.service_content ?? currentProspect?.service_content ?? '',
          color: '#10B981',
          prospect_id: id,
        }),
      })
    }
  }

  const deleteProspect = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/prospects/${id}`, { method: 'DELETE' })
    setProspects((prev) => prev.filter((p) => p.id !== id))
  }

  useEffect(() => { fetchData(yearMonth) }, [yearMonth, fetchData])

  const getEntry = (templateId: string, weekNum: number): GoalEntry => {
    return entryMap[`${templateId}-${weekNum}`] ?? {
      id: '', template_id: templateId, year_month: yearMonth,
      week_num: weekNum, target_value: 0, actual_value: 0, reflection: '',
    }
  }

  const upsertEntry = async (templateId: string, weekNum: number, data: { target_value?: number; actual_value?: number; reflection?: string }) => {
    await fetch('/api/goals/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        year_month: yearMonth,
        week_num: weekNum,
        ...data,
      }),
    })
  }

  const updateEntry = async (templateId: string, weekNum: number, patch: Partial<GoalEntry>) => {
    const current = getEntry(templateId, weekNum)
    const updated = { ...current, ...patch }

    // 月合計の目標を変更 → 1〜4週目に÷4を自動セット、5週目は0
    if (weekNum === 0 && 'target_value' in patch) {
      const perWeek = Math.round((patch.target_value ?? 0) / 4)
      const newMap: EntryMap = { [`${templateId}-0`]: updated }
      for (let w = 1; w <= 4; w++) {
        const wCurrent = getEntry(templateId, w)
        newMap[`${templateId}-${w}`] = { ...wCurrent, target_value: perWeek }
      }
      const w5Current = getEntry(templateId, 5)
      newMap[`${templateId}-5`] = { ...w5Current, target_value: 0 }
      setEntryMap((prev) => ({ ...prev, ...newMap }))

      await upsertEntry(templateId, 0, { target_value: updated.target_value, actual_value: updated.actual_value, reflection: updated.reflection })
      for (let w = 1; w <= 4; w++) {
        await upsertEntry(templateId, w, { target_value: perWeek })
      }
      await upsertEntry(templateId, 5, { target_value: 0 })
      return
    }

    // 週次実績を変更 → 月合計実績に自動集計
    if (weekNum >= 1 && 'actual_value' in patch) {
      setEntryMap((prev) => {
        const next = { ...prev, [`${templateId}-${weekNum}`]: updated }
        const sum = [1, 2, 3, 4, 5].reduce((acc, w) => {
          const e = next[`${templateId}-${w}`]
          return acc + (e?.actual_value ?? 0)
        }, 0)
        const summary = next[`${templateId}-0`] ?? getEntry(templateId, 0)
        next[`${templateId}-0`] = { ...summary, actual_value: sum }
        return next
      })
      await upsertEntry(templateId, weekNum, { target_value: updated.target_value, actual_value: updated.actual_value, reflection: updated.reflection })
      // 月合計実績の更新（最新のentryMapから計算）
      const sum = [1, 2, 3, 4, 5].reduce((acc, w) => {
        const key = `${templateId}-${w}`
        const val = w === weekNum ? (patch.actual_value ?? 0) : (entryMap[key]?.actual_value ?? 0)
        return acc + val
      }, 0)
      const summary0 = getEntry(templateId, 0)
      await upsertEntry(templateId, 0, { actual_value: sum, target_value: summary0.target_value, reflection: summary0.reflection })
      return
    }

    // 通常更新
    setEntryMap((prev) => ({ ...prev, [`${templateId}-${weekNum}`]: updated }))
    await upsertEntry(templateId, weekNum, { target_value: updated.target_value, actual_value: updated.actual_value, reflection: updated.reflection })
  }

  const changeMonth = (delta: number) => {
    const [y, m] = yearMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const displayMonth = () => {
    const [y, m] = yearMonth.split('-')
    return `${y}年${parseInt(m)}月`
  }

  const kgi = templates.filter((t) => t.type === 'KGI')
  const kpi = templates.filter((t) => t.type === 'KPI')
  const kdi = templates.filter((t) => t.type === 'KDI').sort((a, b) => a.order_num - b.order_num)
  const rows = [...kgi, ...kpi, ...kdi]

  const typeStyle = (type: string) => {
    if (type === 'KGI') return 'bg-red-50 text-red-700 font-bold'
    if (type === 'KPI') return 'bg-yellow-50 text-yellow-700 font-bold'
    return 'bg-blue-50 text-blue-700'
  }
  const typeLabel = (t: GoalTemplate) => {
    if (t.type === 'KGI') return 'KGI'
    if (t.type === 'KPI') return 'KPI'
    return `KDI${t.order_num}`
  }
  const rowBg = (type: string) => {
    if (type === 'KGI') return 'bg-red-50/30'
    if (type === 'KPI') return 'bg-yellow-50/30'
    return ''
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
            <span className="text-orange-500 font-bold text-sm">目</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">見込みリスト</h1>
            <p className="text-gray-500 mt-0.5 text-sm">KGI・KPI・KDIの目標管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-600 text-sm rounded-lg hover:bg-orange-50 transition-colors"
          >
            <Upload size={14} />
            シートから取込
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings size={14} />
            ラベルを編集
          </button>
        </div>
      </div>

      {/* 月ナビゲーション */}
      <div className="flex items-center gap-4 mb-5">
        <button onClick={() => changeMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 w-36 text-center">{displayMonth()}</h2>
        <button onClick={() => changeMonth(1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
          <table className="text-sm border-collapse min-w-max">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 text-center w-16 border-r border-gray-200">
                  タイプ
                </th>
                <th className="sticky left-16 z-10 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 text-left w-36 border-r border-gray-200">
                  ラベル
                </th>
                {WEEKS.map((w) => (
                  <th key={w.num} colSpan={4}
                    className={clsx(
                      'px-2 py-2.5 text-xs font-semibold text-center border-r border-gray-200',
                      w.num === 0 ? 'text-gray-700 bg-orange-50/50' : 'text-gray-500'
                    )}>
                    {w.label}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200" />
                <th className="sticky left-16 z-10 bg-gray-50 border-r border-gray-200" />
                {WEEKS.map((w) => (
                  ['目標', '実績', '進捗', '振返'].map((h) => (
                    <th key={`${w.num}-${h}`}
                      className={clsx(
                        'px-2 py-1.5 text-[10px] font-medium text-gray-400 text-center w-14',
                        h === '振返' && 'border-r border-gray-200 w-10'
                      )}>
                      {h}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={clsx('border-b border-gray-100 hover:bg-orange-50/20 transition-colors', rowBg(t.type))}>
                  <td className="sticky left-0 z-10 px-2 py-2.5 text-center border-r border-gray-200"
                    style={{ backgroundColor: 'inherit' }}>
                    <span className={clsx('text-[11px] px-1.5 py-0.5 rounded', typeStyle(t.type))}>
                      {typeLabel(t)}
                    </span>
                  </td>
                  <td className="sticky left-16 z-10 px-3 py-2.5 border-r border-gray-200 font-medium text-gray-800 text-xs"
                    style={{ backgroundColor: 'inherit' }}>
                    {t.label || <span className="text-gray-300">（未設定）</span>}
                  </td>
                  {WEEKS.map((w) => {
                    const entry = getEntry(t.id, w.num)
                    const rate = getRate(entry.target_value, entry.actual_value)
                    return (
                      <>
                        <td key={`${w.num}-target`} className="px-1 py-2 text-center">
                          <NumberCell
                            value={entry.target_value}
                            onChange={(v) => updateEntry(t.id, w.num, { target_value: v })}
                          />
                        </td>
                        <td key={`${w.num}-actual`} className="px-1 py-2 text-center">
                          <NumberCell
                            value={entry.actual_value}
                            onChange={(v) => updateEntry(t.id, w.num, { actual_value: v })}
                          />
                        </td>
                        <td key={`${w.num}-rate`} className="px-1 py-2 text-center">
                          <RateCell rate={rate} />
                        </td>
                        <td key={`${w.num}-ref`} className="px-1 py-2 text-center border-r border-gray-100">
                          <ReflectionCell
                            value={entry.reflection}
                            onChange={(v) => updateEntry(t.id, w.num, { reflection: v })}
                          />
                        </td>
                      </>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 凡例 */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <span>進捗率：</span>
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">100%以上</span>
        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">50〜99%</span>
        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">50%未満</span>
        <span className="ml-2">数値セルをクリックで編集　💬アイコンで振り返りを入力</span>
      </div>

      {/* 顧客管理セクション */}
      <div className="mt-10 space-y-6">

        {/* 見込み中 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <h3 className="text-sm font-bold text-gray-800">見込み中</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {prospects.filter((p) => p.status === '見込み').length}件
              </span>
            </div>
            <button
              onClick={() => { setShowProspectForm(true); setEditingProspect(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              <Plus size={12} /> 追加
            </button>
          </div>

          {showProspectForm && !editingProspect && (
            <div className="mb-3">
              <ProspectForm
                onSave={addProspect}
                onCancel={() => setShowProspectForm(false)}
              />
            </div>
          )}

          {prospects.filter((p) => p.status === '見込み').length === 0 && !showProspectForm ? (
            <div className="text-center py-8 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
              見込み客を追加してください
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.filter((p) => p.status === '見込み').map((p) => (
                <div key={p.id}>
                  {editingProspect?.id === p.id ? (
                    <ProspectForm
                      initial={p}
                      onSave={(form) => updateProspect(p.id, form)}
                      onCancel={() => setEditingProspect(null)}
                    />
                  ) : (
                    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-orange-200 transition-colors shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">{p.company_name || '（会社名未入力）'}</span>
                            {p.contact_name && <span className="text-xs text-gray-400">{p.contact_name}</span>}
                          </div>
                          {p.service_content && <p className="text-xs text-gray-500 truncate">{p.service_content}</p>}
                          {p.memo && <p className="text-xs text-gray-400 mt-1 truncate">{p.memo}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => setEditingProspect(p)}
                            className="text-xs text-gray-400 hover:text-orange-500 px-2 py-1 hover:bg-orange-50 rounded transition-colors">編集</button>
                          <button onClick={() => deleteProspect(p.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <ProspectTaskSection prospectId={p.id} prospectName={p.company_name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 成約（選択月） */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <h3 className="text-sm font-bold text-gray-800">{displayMonth()} 成約</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {prospects.filter((p) => p.status === '成約' && p.contracted_at?.startsWith(yearMonth)).length}件
            </span>
          </div>
          {prospects.filter((p) => p.status === '成約' && p.contracted_at?.startsWith(yearMonth)).length === 0 ? (
            <div className="text-center py-6 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
              この月の成約はありません
            </div>
          ) : (
            <div className="space-y-2">
              {prospects.filter((p) => p.status === '成約' && p.contracted_at?.startsWith(yearMonth)).map((p) => (
                <div key={p.id}>
                  {editingProspect?.id === p.id ? (
                    <ProspectForm
                      initial={p}
                      onSave={(form) => updateProspect(p.id, form)}
                      onCancel={() => setEditingProspect(null)}
                    />
                  ) : (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 hover:border-green-300 transition-colors shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">{p.company_name || '（会社名未入力）'}</span>
                            {p.contact_name && <span className="text-xs text-gray-400">{p.contact_name}</span>}
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">成約</span>
                            {p.contracted_at && <span className="text-[10px] text-gray-400">{p.contracted_at}</span>}
                          </div>
                          {p.service_content && <p className="text-xs text-gray-500 truncate">{p.service_content}</p>}
                          {p.memo && <p className="text-xs text-gray-400 mt-1 truncate">{p.memo}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => setEditingProspect(p)}
                            className="text-xs text-gray-400 hover:text-orange-500 px-2 py-1 hover:bg-orange-50 rounded transition-colors">編集</button>
                          <button onClick={() => deleteProspect(p.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <ProspectTaskSection prospectId={p.id} prospectName={p.company_name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 失注（トグル） */}
        <div>
          <button
            onClick={() => setShowLost((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showLost ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            失注
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
              {prospects.filter((p) => p.status === '失注').length}件
            </span>
          </button>
          {showLost && (
            <div className="mt-3 space-y-2">
              {prospects.filter((p) => p.status === '失注').length === 0 ? (
                <div className="text-center py-6 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">失注はありません</div>
              ) : (
                prospects.filter((p) => p.status === '失注').map((p) => (
                  <div key={p.id}>
                    {editingProspect?.id === p.id ? (
                      <ProspectForm
                        initial={p}
                        onSave={(form) => updateProspect(p.id, form)}
                        onCancel={() => setEditingProspect(null)}
                      />
                    ) : (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 opacity-60">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-700 truncate">{p.company_name || '（会社名未入力）'}</span>
                              {p.contact_name && <span className="text-xs text-gray-400">{p.contact_name}</span>}
                              <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold">失注</span>
                              {p.contracted_at && <span className="text-[10px] text-gray-400">{p.contracted_at}</span>}
                            </div>
                            {p.service_content && <p className="text-xs text-gray-400 truncate">{p.service_content}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => setEditingProspect(p)}
                              className="text-xs text-gray-400 hover:text-orange-500 px-2 py-1 hover:bg-orange-50 rounded transition-colors">編集</button>
                            <button onClick={() => deleteProspect(p.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors p-1">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <ProspectTaskSection prospectId={p.id} prospectName={p.company_name} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <SheetImportModal
          onClose={() => setShowImport(false)}
          onDone={() => fetchData(yearMonth)}
        />
      )}

      {showEditor && (
        <TemplateEditor
          templates={templates}
          onClose={() => setShowEditor(false)}
          onSaved={(updated) => { setTemplates(updated); setShowEditor(false) }}
        />
      )}
    </div>
  )
}
