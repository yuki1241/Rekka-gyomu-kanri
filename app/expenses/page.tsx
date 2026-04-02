'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, X, Pencil, Trash2, Upload, FileText,
  Receipt, TrendingDown, CheckCircle, Clock
} from 'lucide-react'
import clsx from 'clsx'

interface Expense {
  id: string
  title: string
  amount: number
  category: string
  spent_at: string
  location: string
  memo: string
  receipt_urls: string[]
  payment_method: string
  status: ExpenseStatus
  created_at: string
}

type ExpenseStatus = 'pending' | 'approved' | 'rejected'

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: '申請中',
  approved: '承認済',
  rejected: '却下',
}
const STATUS_COLOR: Record<ExpenseStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

const CATEGORIES = [
  '交通費', '宿泊費', '飲食費', '接待費', '通信費',
  '消耗品', '書籍・資料', '研修・セミナー', 'その他',
]
const PAYMENT_METHODS = [
  { value: 'cash', label: '現金' },
  { value: 'card', label: 'クレジットカード' },
  { value: 'ic', label: 'ICカード' },
  { value: 'transfer', label: '振込' },
]
const PERIOD_OPTIONS = [
  { label: '今月', value: 'month' },
  { label: '先月', value: 'last_month' },
  { label: '全期間', value: 'all' },
]

function getRange(period: string) {
  const now = new Date()
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    return { from, to: '' }
  }
  if (period === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
    return { from, to }
  }
  return { from: '', to: '' }
}

const EMPTY_FORM = {
  title: '',
  amount: '',
  category: '',
  spent_at: new Date().toISOString().slice(0, 10),
  location: '',
  memo: '',
  payment_method: 'cash',
  status: 'pending' as ExpenseStatus,
}

interface FormModalProps {
  initial?: Expense | null
  onClose: () => void
  onSaved: () => void
}

function FormModal({ initial, onClose, onSaved }: FormModalProps) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(initial ? { ...initial, amount: String(initial.amount) } : {}),
  })
  const [receipts, setReceipts] = useState<{ url: string; name: string }[]>(
    initial?.receipt_urls?.map((u) => ({ url: u, name: u.split('/').pop() ?? u })) ?? []
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const json = await res.json()
        setReceipts((prev) => [...prev, { url: json.url, name: json.name }])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.amount) return
    setSaving(true)
    const payload = {
      ...form,
      amount: parseInt(form.amount, 10),
      receipt_urls: receipts.map((r) => r.url),
    }
    const url = initial ? `/api/expenses/${initial.id}` : '/api/expenses'
    const method = initial ? 'PATCH' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{initial ? '経費を編集' : '経費を登録'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* 件名・金額 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">件名 <span className="text-red-500">*</span></label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="例：取引先との打ち合わせ食事代"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">金額（円） <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">利用日</label>
              <input
                type="date"
                value={form.spent_at}
                onChange={(e) => set('spent_at', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
              >
                <option value="">選択してください</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">支払方法</label>
              <select
                value={form.payment_method}
                onChange={(e) => set('payment_method', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
              >
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">利用場所・店名</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="例：渋谷 〇〇レストラン"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ・備考</label>
            <textarea
              value={form.memo}
              onChange={(e) => set('memo', e.target.value)}
              rows={2}
              placeholder="参加者や目的など"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as ExpenseStatus)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
            >
              {(Object.keys(STATUS_LABEL) as ExpenseStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* 領収書アップロード */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">領収書・レシート</label>
            <label className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-orange-300 transition-colors w-fit">
              <Upload size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">{uploading ? 'アップロード中...' : '領収書を追加（画像・PDF）'}</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleReceiptUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {receipts.length > 0 && (
              <div className="mt-2 space-y-1">
                {receipts.map((r) => (
                  <div key={r.url} className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText size={12} className="text-gray-400 flex-shrink-0" />
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs text-blue-600">
                      {r.name}
                    </a>
                    <button
                      onClick={() => setReceipts((prev) => prev.filter((x) => x.url !== r.url))}
                      className="text-gray-300 hover:text-red-400 flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.amount}
            className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [filterCategory, setFilterCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRange(period)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (filterCategory) params.set('category', filterCategory)
    const res = await fetch(`/api/expenses?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setExpenses(data)
    }
    setLoading(false)
  }, [period, filterCategory])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = async (id: string) => {
    if (!confirm('この経費を削除しますか？')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingAmount = expenses.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0)
  const approvedAmount = expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
  const pendingCount = expenses.filter((e) => e.status === 'pending').length

  // カテゴリ別集計
  const byCategory = CATEGORIES.map((cat) => {
    const items = expenses.filter((e) => e.category === cat)
    return { cat, total: items.reduce((s, e) => s + e.amount, 0), count: items.length }
  }).filter((x) => x.count > 0).sort((a, b) => b.total - a.total)

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
            <Receipt size={18} className="text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">経費精算</h1>
            <p className="text-gray-500 mt-0.5 text-sm">経費の記録・管理</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors font-medium shadow-sm"
        >
          <Plus size={16} />
          経費を登録
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: TrendingDown, label: '合計金額', value: `¥${totalAmount.toLocaleString()}`, color: 'text-orange-500', bg: 'bg-orange-50' },
          { icon: Clock, label: '申請中', value: `¥${pendingAmount.toLocaleString()}`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { icon: CheckCircle, label: '承認済', value: `¥${approvedAmount.toLocaleString()}`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Receipt, label: '件数', value: `${expenses.length}件（申請中${pendingCount}件）`, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.bg)}>
                <Icon size={18} className={card.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 truncate">{card.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-5">
        {/* メインテーブル */}
        <div className="flex-1 min-w-0">
          {/* フィルター */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    period === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none bg-white text-gray-600"
            >
              <option value="">カテゴリ: すべて</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Receipt size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">経費の記録がありません</p>
              <p className="text-xs mt-1">「経費を登録」から追加してください</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">件名</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カテゴリ</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">金額</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ステータス</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">領収書</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, i) => (
                    <tr
                      key={expense.id}
                      className={clsx(
                        'hover:bg-gray-50/50 transition-colors group',
                        i < expenses.length - 1 && 'border-b border-gray-50'
                      )}
                    >
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {expense.spent_at}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">{expense.title}</p>
                        {expense.location && <p className="text-xs text-gray-400 truncate max-w-[160px]">{expense.location}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {expense.category && (
                          <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full">
                            {expense.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ¥{expense.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[expense.status])}>
                          {STATUS_LABEL[expense.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {expense.receipt_urls?.length > 0 && (
                          <div className="flex gap-1">
                            {expense.receipt_urls.slice(0, 2).map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                className="p-1 text-gray-400 hover:text-orange-500 transition-colors">
                                <FileText size={14} />
                              </a>
                            ))}
                            {expense.receipt_urls.length > 2 && (
                              <span className="text-xs text-gray-400 self-center">+{expense.receipt_urls.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingExpense(expense); setShowForm(true) }}
                            className="p-1 text-gray-400 hover:text-orange-500 rounded"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* カテゴリ別集計サイドバー */}
        {byCategory.length > 0 && (
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3">カテゴリ別集計</h3>
              <div className="space-y-3">
                {byCategory.map(({ cat, total, count }) => {
                  const pct = totalAmount > 0 ? Math.round((total / totalAmount) * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 truncate">{cat}</span>
                        <span className="text-xs font-medium text-gray-900 ml-1">¥{total.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-orange-400 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{count}件 ({pct}%)</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <FormModal
          initial={editingExpense}
          onClose={() => { setShowForm(false); setEditingExpense(null) }}
          onSaved={() => { setShowForm(false); setEditingExpense(null); fetchData() }}
        />
      )}
    </div>
  )
}
