'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Settings, X, MessageSquare, Check } from 'lucide-react'
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

  const fetchData = useCallback(async (ym: string) => {
    setLoading(true)
    const res = await fetch(`/api/goals?year_month=${ym}`)
    const data = await res.json()
    setTemplates(data.templates ?? [])
    const map: EntryMap = {}
    for (const e of (data.entries ?? [])) {
      map[`${e.template_id}-${e.week_num}`] = e
    }
    setEntryMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData(yearMonth) }, [yearMonth, fetchData])

  const getEntry = (templateId: string, weekNum: number): GoalEntry => {
    return entryMap[`${templateId}-${weekNum}`] ?? {
      id: '', template_id: templateId, year_month: yearMonth,
      week_num: weekNum, target_value: 0, actual_value: 0, reflection: '',
    }
  }

  const updateEntry = async (templateId: string, weekNum: number, patch: Partial<GoalEntry>) => {
    const current = getEntry(templateId, weekNum)
    const updated = { ...current, ...patch }
    // 楽観的更新
    setEntryMap((prev) => ({
      ...prev,
      [`${templateId}-${weekNum}`]: updated,
    }))
    await fetch('/api/goals/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        year_month: yearMonth,
        week_num: weekNum,
        target_value: updated.target_value,
        actual_value: updated.actual_value,
        reflection: updated.reflection,
      }),
    })
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
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings size={14} />
          ラベルを編集
        </button>
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
