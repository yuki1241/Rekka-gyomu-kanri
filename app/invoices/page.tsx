'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, X, PlusCircle, MinusCircle, RefreshCw, FileSpreadsheet, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

// ---------- 型定義 ----------
interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  amount: number
}

interface Assistant {
  name: string
  amount: number
}

interface InvoiceRecord {
  id: string
  month: string
  user_email: string
  number: number | null
  company_name: string
  sales_person: string
  notes: string
  items: InvoiceItem[]
  total_amount: number
  status: '入力未完了' | '入力完了'
  is_recurring: boolean
  assistants: Assistant[]
  director_name: string
  director_amount: number
}

const DEFAULT_ASSISTANTS: Assistant[] = Array(5).fill(null).map(() => ({ name: '', amount: 0 }))

const emptyRecord = (month: string): Omit<InvoiceRecord, 'id' | 'user_email' | 'number'> => ({
  month,
  company_name: '',
  sales_person: '',
  notes: '',
  items: [{ id: crypto.randomUUID(), name: '', quantity: 1, unit_price: 0, amount: 0 }],
  total_amount: 0,
  status: '入力未完了',
  is_recurring: false,
  assistants: DEFAULT_ASSISTANTS.map((a) => ({ ...a })),
  director_name: '',
  director_amount: 0,
})

// ---------- モーダル ----------
function InvoiceModal({
  record,
  currentMonth,
  onClose,
  onSave,
}: {
  record: InvoiceRecord | null
  currentMonth: string
  onClose: () => void
  onSave: (data: Omit<InvoiceRecord, 'id' | 'user_email' | 'number'>) => Promise<void>
}) {
  const [form, setForm] = useState(() => {
    if (record) {
      // assistantsが5件未満なら補完
      const assistants = [...(record.assistants ?? [])]
      while (assistants.length < 5) assistants.push({ name: '', amount: 0 })
      return { ...record, assistants }
    }
    return emptyRecord(currentMonth)
  })
  const [saving, setSaving] = useState(false)

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const items = form.items.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    })
    setForm({ ...form, items })
  }

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { id: crypto.randomUUID(), name: '', quantity: 1, unit_price: 0, amount: 0 }] })

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  }

  const updateAssistant = (idx: number, field: keyof Assistant, value: string | number) => {
    const assistants = form.assistants.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setForm({ ...form, assistants })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const totalAmount = form.items.reduce((s, i) => s + i.amount, 0)
  const assistantTotal = form.assistants.reduce((s, a) => s + (Number(a.amount) || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-gray-900">{record ? '請求先を編集' : '請求先を追加'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">会社名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">営業担当</label>
              <input
                type="text"
                value={form.sales_person}
                onChange={(e) => setForm({ ...form, sales_person: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">補足情報</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="メールアドレス・振込先・備考など"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          {/* オプション */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })}
                className={clsx(
                  'w-10 h-5 rounded-full transition-colors relative flex-shrink-0',
                  form.is_recurring ? 'bg-blue-500' : 'bg-gray-300'
                )}
              >
                <div className={clsx(
                  'w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform',
                  form.is_recurring ? 'translate-x-5' : 'translate-x-0.5'
                )} />
              </div>
              <span className="text-sm text-gray-700">月額（翌月へ繰り越し）</span>
            </label>
          </div>

          {/* 請求項目 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">請求項目</label>
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                <PlusCircle size={13} /> 項目追加
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <div className="col-span-5">項目名</div>
                <div className="col-span-2 text-right">数量</div>
                <div className="col-span-2 text-right">単価(税抜)</div>
                <div className="col-span-2 text-right">金額(税抜)</div>
                <div className="col-span-1" />
              </div>
              {form.items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-1 items-center">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    placeholder="項目名"
                    className="col-span-5 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="col-span-2 px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                    className="col-span-2 px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <div className="col-span-2 text-right text-xs font-medium text-gray-700 pr-1">
                    ¥{item.amount.toLocaleString()}
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-500">
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
              <div className="text-right text-sm font-bold text-gray-800 pr-6 pt-1 border-t border-gray-100">
                合計（税抜）: ¥{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>

          {/* アシスタント報酬（5名） */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">アシスタント報酬（最大5名）</label>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 px-1">
                <div>名前</div>
                <div className="text-right">金額</div>
              </div>
              {form.assistants.map((asst, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={asst.name}
                    onChange={(e) => updateAssistant(idx, 'name', e.target.value)}
                    placeholder={`アシスタント${idx + 1}`}
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                  <input
                    type="number"
                    value={asst.amount || ''}
                    onChange={(e) => updateAssistant(idx, 'amount', Number(e.target.value))}
                    placeholder="0"
                    className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                  />
                </div>
              ))}
              <div className="text-right text-xs font-medium text-gray-600 pr-1 pt-1 border-t border-gray-100">
                アシスタント合計: ¥{assistantTotal.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ディレクター報酬（1名） */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">ディレクター報酬（1名）</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={form.director_name}
                onChange={(e) => setForm({ ...form, director_name: e.target.value })}
                placeholder="ディレクター名"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
              <input
                type="number"
                value={form.director_amount || ''}
                onChange={(e) => setForm({ ...form, director_amount: Number(e.target.value) })}
                placeholder="0"
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- インポートモーダル ----------
const SPREADSHEET_ID = '1qLasN4V9t0wNgbPqBCDdhIKQoLaTZYe2z43mWjgfOdE'

function ImportModal({
  currentMonth,
  onClose,
  onDone,
}: {
  currentMonth: string
  onClose: () => void
  onDone: () => void
}) {
  const [sheets, setSheets] = useState<{ title: string; sheetId: number }[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [loadingSheets, setLoadingSheets] = useState(false)
  const [preview, setPreview] = useState<{ company_name: string; total_amount: number }[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoadingSheets(true)
    fetch(`/api/invoices/import?id=${SPREADSHEET_ID}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.sheets) {
          setSheets(data.sheets)
          setSelectedSheet(data.sheets[0]?.title ?? '')
        } else {
          setError(data.error ?? 'シート取得に失敗しました')
        }
      })
      .catch(() => setError('シート取得に失敗しました'))
      .finally(() => setLoadingSheets(false))
  }, [])

  const handlePreview = async () => {
    setPreviewing(true)
    setError('')
    setPreview([])
    const res = await fetch('/api/invoices/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, sheetName: selectedSheet, month: currentMonth, dryRun: true }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setPreviewing(false); return }
    setPreview(data.preview ?? [])
    setPreviewing(false)
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    const res = await fetch('/api/invoices/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId: SPREADSHEET_ID, sheetName: selectedSheet, month: currentMonth, dryRun: false }),
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setImporting(false); return }
    setResult({ inserted: data.inserted, skipped: data.skipped })
    setImporting(false)
    onDone()
  }

  const [y, m] = currentMonth.split('-')
  const monthLabel = `${y}年${Number(m)}月`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">スプレッドシートから取込</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}のデータとして取り込みます</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* シート選択 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">取込シートを選択</label>
            {loadingSheets ? (
              <p className="text-xs text-gray-400">シート一覧を取得中...</p>
            ) : (
              <div className="relative">
                <select
                  value={selectedSheet}
                  onChange={(e) => { setSelectedSheet(e.target.value); setPreview([]); setResult(null) }}
                  className="w-full appearance-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  {sheets.map((s) => <option key={s.sheetId} value={s.title}>{s.title}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* プレビュー結果 */}
          {preview.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">プレビュー（先頭10件）</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {preview.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate max-w-[200px]">{c.company_name}</span>
                    <span className="text-gray-400 flex-shrink-0">¥{(c.total_amount ?? 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 完了メッセージ */}
          {result && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
              取込完了: <strong>{result.inserted}件</strong> を追加しました
              {result.skipped > 0 && <span className="text-gray-400 ml-2">（{result.skipped}件は重複のためスキップ）</span>}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              閉じる
            </button>
            {!result && (
              <>
                <button
                  onClick={handlePreview}
                  disabled={previewing || loadingSheets}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                >
                  {previewing ? '確認中...' : 'プレビュー確認'}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || loadingSheets}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} />
                  {importing ? '取込中...' : '取込実行'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- メインページ ----------
export default function InvoicesPage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [records, setRecords] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InvoiceRecord | null>(null)
  const [carryingOver, setCarryingOver] = useState(false)
  const [carryMsg, setCarryMsg] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/invoices?month=${currentMonth}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setRecords(data)
    }
    setLoading(false)
  }, [currentMonth])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const moveMonth = (delta: number) => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setCarryMsg('')
  }

  // ステータストグル（即時保存）
  const toggleStatus = async (record: InvoiceRecord) => {
    const newStatus = record.status === '入力完了' ? '入力未完了' : '入力完了'
    setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, status: newStatus } : r))
    await fetch(`/api/invoices/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  // 月額トグル（即時保存）
  const toggleRecurring = async (record: InvoiceRecord) => {
    const newVal = !record.is_recurring
    setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, is_recurring: newVal } : r))
    await fetch(`/api/invoices/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_recurring: newVal }),
    })
  }

  // 前月繰り越し
  const handleCarryForward = async () => {
    setCarryingOver(true)
    setCarryMsg('')
    const res = await fetch('/api/invoices/carry-forward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month: currentMonth }),
    })
    const data = await res.json()
    setCarryMsg(data.message ?? '')
    setCarryingOver(false)
    fetchRecords()
  }

  const handleSave = async (data: Omit<InvoiceRecord, 'id' | 'user_email' | 'number'>) => {
    if (editingRecord) {
      await fetch(`/api/invoices/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setModalOpen(false)
    setEditingRecord(null)
    fetchRecords()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    fetchRecords()
  }

  // ---------- 集計 ----------
  const companyTotals = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.company_name] = (acc[r.company_name] ?? 0) + r.total_amount
    return acc
  }, {})

  const assistantTotals = records.reduce<Record<string, number>>((acc, r) => {
    for (const a of r.assistants ?? []) {
      if (a.name) acc[a.name] = (acc[a.name] ?? 0) + (Number(a.amount) || 0)
    }
    return acc
  }, {})

  const directorTotals = records.reduce<Record<string, number>>((acc, r) => {
    if (r.director_name) acc[r.director_name] = (acc[r.director_name] ?? 0) + (Number(r.director_amount) || 0)
    return acc
  }, {})

  const [y, m] = currentMonth.split('-')
  const monthLabel = `${y}年${Number(m)}月`
  const grandTotal = records.reduce((s, r) => s + r.total_amount, 0)
  const doneCount = records.filter((r) => r.status === '入力完了').length

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">請求管理</h1>
          <p className="text-gray-500 mt-1 text-sm">請求書チェックリスト</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-green-200 rounded-lg hover:bg-green-50 text-green-700 transition-colors"
          >
            <FileSpreadsheet size={14} />
            スプレッドシートから取込
          </button>
          <button
            onClick={handleCarryForward}
            disabled={carryingOver}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50"
            title="前月の「月額」フラグ付き案件を今月に引き継ぐ"
          >
            <RefreshCw size={14} className={carryingOver ? 'animate-spin' : ''} />
            前月から繰り越し
          </button>
          <button
            onClick={() => { setEditingRecord(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium shadow-sm"
          >
            <Plus size={16} />
            請求先を追加
          </button>
        </div>
      </div>

      {carryMsg && (
        <div className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100">
          {carryMsg}
        </div>
      )}

      {/* 月セレクター */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 shadow-sm">
          <button onClick={() => moveMonth(-1)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-sm font-semibold text-gray-800 min-w-[90px] text-center">{monthLabel}</span>
          <button onClick={() => moveMonth(1)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        {!loading && records.length > 0 && (
          <div className="flex gap-4 text-sm text-gray-500">
            <span>請求合計: <strong className="text-gray-800">¥{grandTotal.toLocaleString()}</strong></span>
            <span>入力完了: <strong className="text-green-600">{doneCount}</strong> / {records.length} 件</span>
          </div>
        )}
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto mb-8">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-3">この月の請求先はまだありません</p>
            <button onClick={() => { setEditingRecord(null); setModalOpen(true) }} className="text-blue-600 text-sm hover:underline">
              最初の請求先を追加する →
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-36">会社名</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-20">営業担当</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-44">請求項目</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 w-28">請求金額(税抜)</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 w-24">ステータス</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 w-16">月額</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-blue-500 w-44 border-l border-gray-100">アシスタント報酬</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-purple-500 w-36 border-l border-gray-100">ディレクター報酬</th>
                <th className="px-3 py-2.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group align-top">
                  <td className="px-3 py-3 text-xs text-gray-400">{record.number ?? '—'}</td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-semibold text-gray-800">{record.company_name}</p>
                    {record.notes && (
                      <p className="text-[10px] text-gray-400 mt-0.5 whitespace-pre-wrap">{record.notes}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{record.sales_person}</td>
                  <td className="px-3 py-3">
                    <div className="space-y-0.5">
                      {(record.items ?? []).map((item) => (
                        <div key={item.id} className="text-[11px] text-gray-600">
                          <span className="truncate block max-w-[160px]">{item.name}</span>
                          <span className="text-gray-400 text-[10px]">{item.quantity}×¥{item.unit_price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-bold text-gray-800">¥{record.total_amount.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => toggleStatus(record)}
                      className={clsx(
                        'text-[10px] font-medium px-2 py-1 rounded-full transition-colors',
                        record.status === '入力完了'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      )}
                    >
                      {record.status ?? '入力未完了'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => toggleRecurring(record)}
                      className={clsx(
                        'text-[10px] font-medium px-2 py-1 rounded-full transition-colors',
                        record.is_recurring
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      )}
                    >
                      {record.is_recurring ? '月額' : '単発'}
                    </button>
                  </td>
                  <td className="px-3 py-3 border-l border-gray-100">
                    <div className="space-y-0.5">
                      {(record.assistants ?? []).filter((a) => a.name).map((a, i) => (
                        <div key={i} className="text-[11px] text-gray-600 flex justify-between gap-2">
                          <span>{a.name}</span>
                          <span className="text-gray-400">¥{Number(a.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 border-l border-gray-100">
                    {record.director_name && (
                      <div className="text-[11px] text-gray-600 flex justify-between gap-2">
                        <span>{record.director_name}</span>
                        <span className="text-gray-400">¥{Number(record.director_amount).toLocaleString()}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingRecord(record); setModalOpen(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.id, record.company_name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">合計（{records.length}件）</td>
                <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">¥{grandTotal.toLocaleString()}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* 集計セクション */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-5">
          {/* 会社別集計 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">会社別 請求金額</h3>
            <div className="space-y-2">
              {Object.entries(companyTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 truncate max-w-[160px]">{name}</span>
                    <span className="text-xs font-semibold text-gray-800 flex-shrink-0">¥{total.toLocaleString()}</span>
                  </div>
                ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-xs font-semibold text-gray-600">合計</span>
                <span className="text-xs font-bold text-gray-900">¥{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* アシスタント別集計 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-blue-700 mb-3">アシスタント別 報酬</h3>
            {Object.keys(assistantTotals).length === 0 ? (
              <p className="text-xs text-gray-400">データなし</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(assistantTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, total]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{name}</span>
                      <span className="text-xs font-semibold text-blue-700">¥{total.toLocaleString()}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="text-xs font-semibold text-gray-600">合計</span>
                  <span className="text-xs font-bold text-blue-800">
                    ¥{Object.values(assistantTotals).reduce((s, v) => s + v, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ディレクター別集計 */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-purple-700 mb-3">ディレクター別 報酬</h3>
            {Object.keys(directorTotals).length === 0 ? (
              <p className="text-xs text-gray-400">データなし</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(directorTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, total]) => (
                    <div key={name} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{name}</span>
                      <span className="text-xs font-semibold text-purple-700">¥{total.toLocaleString()}</span>
                    </div>
                  ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between">
                  <span className="text-xs font-semibold text-gray-600">合計</span>
                  <span className="text-xs font-bold text-purple-800">
                    ¥{Object.values(directorTotals).reduce((s, v) => s + v, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <InvoiceModal
          record={editingRecord}
          currentMonth={currentMonth}
          onClose={() => { setModalOpen(false); setEditingRecord(null) }}
          onSave={handleSave}
        />
      )}

      {importModalOpen && (
        <ImportModal
          currentMonth={currentMonth}
          onClose={() => setImportModalOpen(false)}
          onDone={() => { fetchRecords(); setImportModalOpen(false) }}
        />
      )}
    </div>
  )
}
