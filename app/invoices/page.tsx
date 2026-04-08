'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, X, PlusCircle, MinusCircle } from 'lucide-react'
import clsx from 'clsx'

// ---------- 型定義 ----------
interface InvoiceItem {
  id: string
  name: string
  quantity: number
  unit_price: number
  amount: number
}

interface InvoiceRecord {
  id: string
  month: string
  section: string
  number: number | null
  company_name: string
  sales_person: string
  contact_info: string
  label: string
  items: InvoiceItem[]
  total_amount: number
  check_entered: boolean
  check_created: boolean
  check_reviewed: boolean
  check_sent: boolean
  check_payment: boolean
  assistant_memo: string
  assistant_check_consult: boolean
  assistant_check_invoice: boolean
  assistant_check_transfer: boolean
  director_memo: string
  director_check_consult: boolean
  director_check_invoice: boolean
  director_check_transfer: boolean
}

type CheckField = keyof Pick<InvoiceRecord,
  'check_entered' | 'check_created' | 'check_reviewed' | 'check_sent' | 'check_payment' |
  'assistant_check_consult' | 'assistant_check_invoice' | 'assistant_check_transfer' |
  'director_check_consult' | 'director_check_invoice' | 'director_check_transfer'
>

const LABEL_OPTIONS = ['', '新規', '留保', '要確認']
const LABEL_COLOR: Record<string, string> = {
  '新規': 'bg-blue-100 text-blue-700',
  '留保': 'bg-yellow-100 text-yellow-700',
  '要確認': 'bg-red-100 text-red-700',
}

const emptyRecord = (month: string, section: string): Omit<InvoiceRecord, 'id'> => ({
  month,
  section,
  number: null,
  company_name: '',
  sales_person: '',
  contact_info: '',
  label: '',
  items: [{ id: crypto.randomUUID(), name: '', quantity: 1, unit_price: 0, amount: 0 }],
  total_amount: 0,
  check_entered: false,
  check_created: false,
  check_reviewed: false,
  check_sent: false,
  check_payment: false,
  assistant_memo: '',
  assistant_check_consult: false,
  assistant_check_invoice: false,
  assistant_check_transfer: false,
  director_memo: '',
  director_check_consult: false,
  director_check_invoice: false,
  director_check_transfer: false,
})

// ---------- チェックボックスコンポーネント ----------
function Checkbox({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
        checked ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400 bg-white'
      )}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

// ---------- 追加・編集モーダル ----------
function InvoiceModal({
  record,
  sections,
  currentMonth,
  onClose,
  onSave,
}: {
  record: InvoiceRecord | null
  sections: string[]
  currentMonth: string
  onClose: () => void
  onSave: (data: Omit<InvoiceRecord, 'id'>) => Promise<void>
}) {
  const [form, setForm] = useState<Omit<InvoiceRecord, 'id'>>(
    record ? { ...record } : emptyRecord(currentMonth, sections[0] ?? '原案件')
  )
  const [saving, setSaving] = useState(false)
  const [newSection, setNewSection] = useState('')

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const items = [...form.items]
    items[idx] = { ...items[idx], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].amount = items[idx].quantity * items[idx].unit_price
    }
    if (field === 'amount') {
      items[idx].amount = Number(value)
    }
    setForm({ ...form, items })
  }

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { id: crypto.randomUUID(), name: '', quantity: 1, unit_price: 0, amount: 0 }],
    })
  }

  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const allSections = newSection
    ? [...new Set([...sections, newSection])]
    : sections

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">案件区分</label>
              <select
                value={form.section}
                onChange={(e) => {
                  if (e.target.value === '__new__') return
                  setForm({ ...form, section: e.target.value })
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {allSections.map((s) => <option key={s} value={s}>{s}</option>)}
                <option value="__new__">＋ 新しい区分を入力...</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">新しい区分名（任意）</label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => {
                  setNewSection(e.target.value)
                  if (e.target.value) setForm({ ...form, section: e.target.value })
                }}
                placeholder="例：山田案件"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">番号</label>
              <input
                type="number"
                value={form.number ?? ''}
                onChange={(e) => setForm({ ...form, number: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">会社名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">営業担当</label>
              <input
                type="text"
                value={form.sales_person}
                onChange={(e) => setForm({ ...form, sales_person: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ラベル</label>
              <select
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{l || '—'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">連絡情報</label>
            <textarea
              value={form.contact_info}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
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
                <div className="col-span-2 text-right">単価</div>
                <div className="col-span-2 text-right">金額</div>
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
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <MinusCircle size={14} />
                  </button>
                </div>
              ))}
              <div className="text-right text-sm font-bold text-gray-800 pr-6 pt-1 border-t border-gray-100">
                合計（税抜）: ¥{form.items.reduce((s, i) => s + i.amount, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* アシスタント・ディレクター */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">アシスタント 備考</label>
              <textarea
                value={form.assistant_memo}
                onChange={(e) => setForm({ ...form, assistant_memo: e.target.value })}
                rows={2}
                placeholder="担当者名・金額など"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ディレクター 備考</label>
              <textarea
                value={form.director_memo}
                onChange={(e) => setForm({ ...form, director_memo: e.target.value })}
                rows={2}
                placeholder="担当者名・金額など"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- メインページ ----------
export default function InvoicesPage() {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [records, setRecords] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<InvoiceRecord | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/invoices?month=${currentMonth}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        setRecords(data)
        // 最初の区分を自動選択
        if (data.length > 0 && !activeSection) {
          setActiveSection(data[0].section)
        }
      }
    }
    setLoading(false)
  }, [currentMonth, activeSection])

  useEffect(() => { fetchRecords() }, [currentMonth]) // eslint-disable-line

  // 月移動
  const moveMonth = (delta: number) => {
    const [y, m] = currentMonth.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setActiveSection('')
  }

  const sections = [...new Set(records.map((r) => r.section))]
  const displaySection = activeSection || sections[0] || ''
  const filtered = records.filter((r) => r.section === displaySection)

  // チェックボックストグル（即時保存）
  const toggleCheck = async (record: InvoiceRecord, field: CheckField) => {
    const updated = { ...record, [field]: !record[field] }
    setRecords((prev) => prev.map((r) => r.id === record.id ? updated : r))
    await fetch(`/api/invoices/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !record[field] }),
    })
  }

  const handleSave = async (data: Omit<InvoiceRecord, 'id'>) => {
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
    setActiveSection(data.section)
    fetchRecords()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    fetchRecords()
  }

  const [y, m] = currentMonth.split('-')
  const monthLabel = `${y}年${Number(m)}月`
  const totalAmount = filtered.reduce((s, r) => s + r.total_amount, 0)
  const allPaid = filtered.filter((r) => r.check_payment).length

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">請求管理</h1>
          <p className="text-gray-500 mt-1 text-sm">請求書チェックリスト</p>
        </div>
        <button
          onClick={() => { setEditingRecord(null); setModalOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={16} />
          請求先を追加
        </button>
      </div>

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
        {!loading && filtered.length > 0 && (
          <div className="flex gap-4 text-sm text-gray-500">
            <span>請求合計: <strong className="text-gray-800">¥{totalAmount.toLocaleString()}</strong></span>
            <span>入金済: <strong className="text-green-600">{allPaid}</strong> / {filtered.length} 件</span>
          </div>
        )}
      </div>

      {/* 案件区分タブ */}
      {sections.length > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={clsx(
                'px-4 py-1.5 text-sm rounded-lg font-medium transition-colors',
                displaySection === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
              )}
            >
              {s}
              <span className="ml-1.5 text-xs opacity-70">{records.filter((r) => r.section === s).length}</span>
            </button>
          ))}
        </div>
      )}

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm mb-3">この月の請求先はまだありません</p>
            <button
              onClick={() => { setEditingRecord(null); setModalOpen(true) }}
              className="text-blue-600 text-sm hover:underline"
            >
              最初の請求先を追加する →
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-36">会社名</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-20">営業担当</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 w-44">請求項目</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 w-24">金額（税抜）</th>
                {/* ワークフロー */}
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 w-12">打込<br/>31日</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 w-12">作成<br/>1日</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 w-12">確認<br/>2日</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 w-12">送付<br/>2日</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-500 w-12">入金<br/>25日</th>
                {/* アシスタント */}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-blue-500 w-32 border-l border-gray-100">
                  アシスタント<br/>備考
                </th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-blue-400 w-10">相談</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-blue-400 w-10">確認</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-blue-400 w-10">振込</th>
                {/* ディレクター */}
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-purple-500 w-32 border-l border-gray-100">
                  ディレクター<br/>備考
                </th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-purple-400 w-10">相談</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-purple-400 w-10">確認</th>
                <th className="px-2 py-2.5 text-center text-[10px] font-semibold text-purple-400 w-10">振込</th>
                <th className="px-3 py-2.5 w-14" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group align-top">
                  <td className="px-3 py-3 text-xs text-gray-400">{record.number ?? '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-gray-800 leading-tight">{record.company_name}</span>
                      {record.label && (
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full font-medium w-fit', LABEL_COLOR[record.label] ?? 'bg-gray-100 text-gray-600')}>
                          {record.label}
                        </span>
                      )}
                      {record.sales_person && (
                        <span className="text-[10px] text-gray-400">{record.sales_person}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {record.contact_info && (
                      <p className="text-[10px] text-gray-500 whitespace-pre-wrap leading-relaxed max-w-[120px]">{record.contact_info}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-0.5">
                      {record.items.map((item) => (
                        <div key={item.id} className="text-[11px] text-gray-600 flex justify-between gap-2">
                          <span className="truncate max-w-[140px]">{item.name}</span>
                          <span className="text-gray-400 flex-shrink-0">{item.quantity}×{item.unit_price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-sm font-bold text-gray-800">
                      ¥{record.total_amount.toLocaleString()}
                    </span>
                  </td>
                  {/* ワークフローチェック */}
                  {(['check_entered', 'check_created', 'check_reviewed', 'check_sent', 'check_payment'] as CheckField[]).map((field) => (
                    <td key={field} className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={record[field] as boolean} onChange={() => toggleCheck(record, field)} />
                      </div>
                    </td>
                  ))}
                  {/* アシスタント */}
                  <td className="px-3 py-3 border-l border-gray-100">
                    {record.assistant_memo && (
                      <p className="text-[10px] text-gray-600 whitespace-pre-wrap leading-relaxed max-w-[120px]">{record.assistant_memo}</p>
                    )}
                  </td>
                  {(['assistant_check_consult', 'assistant_check_invoice', 'assistant_check_transfer'] as CheckField[]).map((field) => (
                    <td key={field} className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={record[field] as boolean} onChange={() => toggleCheck(record, field)} />
                      </div>
                    </td>
                  ))}
                  {/* ディレクター */}
                  <td className="px-3 py-3 border-l border-gray-100">
                    {record.director_memo && (
                      <p className="text-[10px] text-gray-600 whitespace-pre-wrap leading-relaxed max-w-[120px]">{record.director_memo}</p>
                    )}
                  </td>
                  {(['director_check_consult', 'director_check_invoice', 'director_check_transfer'] as CheckField[]).map((field) => (
                    <td key={field} className="px-2 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={record[field] as boolean} onChange={() => toggleCheck(record, field)} />
                      </div>
                    </td>
                  ))}
                  {/* 操作 */}
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
            {/* 合計行 */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-gray-600 text-right">
                  合計（{filtered.length}件）
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-bold text-gray-900">
                  ¥{totalAmount.toLocaleString()}
                </td>
                <td colSpan={14} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {modalOpen && (
        <InvoiceModal
          record={editingRecord}
          sections={sections.length > 0 ? sections : ['原案件']}
          currentMonth={currentMonth}
          onClose={() => { setModalOpen(false); setEditingRecord(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
