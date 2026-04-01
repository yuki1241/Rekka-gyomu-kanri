'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus, Search, X, Pencil, Trash2, FileText, Upload,
  TrendingUp, Users, CheckCircle, DollarSign, Sparkles, Camera,
  Download
} from 'lucide-react'
import clsx from 'clsx'

interface Appointment {
  id: string
  person_name: string
  company_name: string
  met_at: string
  referred_by: string
  category: string
  keywords: string[]
  trouble_memo: string
  impression_memo: string
  action_next: string
  sale_amount: number | null
  status: AppStatus
  file_urls: string[]
  photo_url: string
  created_at: string
}

type AppStatus = 'contacted' | 'negotiating' | 'contracted' | 'lost' | 'pending'

const STATUS_LABEL: Record<AppStatus, string> = {
  contacted: '接触済み',
  negotiating: '商談中',
  contracted: '成約',
  lost: '失注',
  pending: '保留',
}
const STATUS_COLOR: Record<AppStatus, string> = {
  contacted: 'bg-gray-100 text-gray-600',
  negotiating: 'bg-blue-100 text-blue-700',
  contracted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
  pending: 'bg-yellow-100 text-yellow-700',
}

const CATEGORIES = ['士業', '不動産', '建設・建築', 'IT', '金融', '医療', '教育', '製造', 'その他']
const PERIOD_OPTIONS = [
  { label: '全期間', value: 'all' },
  { label: '今月', value: 'month' },
  { label: '今週', value: 'week' },
]

const CSV_HEADERS = [
  'お名前', '会社名', '日時', '紹介者', '職業カテゴリ',
  'キーワード', '困っていること', '印象・気づき', '次のアクション',
  '売上金額', 'ステータス',
]

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function exportCsv(appointments: Appointment[]) {
  const rows = appointments.map((a) => [
    a.person_name,
    a.company_name,
    a.met_at ? new Date(a.met_at).toLocaleString('ja-JP') : '',
    a.referred_by,
    a.category,
    a.keywords?.join('・') ?? '',
    a.trouble_memo,
    a.impression_memo,
    a.action_next,
    a.sale_amount ?? '',
    STATUS_LABEL[a.status] ?? a.status,
  ].map(escapeCsv).join(','))

  const bom = '\uFEFF'
  const csv = bom + [CSV_HEADERS.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `アポ管理_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_FROM_LABEL: Record<string, AppStatus> = {
  '接触済み': 'contacted', '商談中': 'negotiating',
  '成約': 'contracted', '失注': 'lost', '保留': 'pending',
}

function downloadTemplate() {
  const sample = [
    '山田 太郎', '株式会社〇〇', '2026/04/01 10:00', '鈴木 一郎', '不動産',
    '節税・相続', '経費管理が煩雑で困っている', '前向きで話しやすい', '来週提案書を送付', '100000', '商談中',
  ]
  const bom = '\uFEFF'
  const csv = bom + [CSV_HEADERS.join(','), sample.map(escapeCsv).join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'アポ管理_インポートテンプレート.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function toLocalDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function getRange(period: string): { from?: string; to?: string } {
  const now = new Date()
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return { from }
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { from: d.toISOString() }
  }
  return {}
}

const EMPTY_FORM = {
  person_name: '',
  company_name: '',
  met_at: new Date().toISOString().slice(0, 16),
  referred_by: '',
  category: '',
  keywords: '',
  trouble_memo: '',
  impression_memo: '',
  action_next: '',
  sale_amount: '',
  status: 'contacted' as AppStatus,
  photo_url: '',
}

interface FormModalProps {
  initial?: Appointment | null
  onClose: () => void
  onSaved: () => void
}

function FormModal({ initial, onClose, onSaved }: FormModalProps) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...(initial
      ? {
          ...initial,
          met_at: initial.met_at.slice(0, 16),
          keywords: initial.keywords?.join(', ') ?? '',
          sale_amount: initial.sale_amount?.toString() ?? '',
          photo_url: initial.photo_url ?? '',
        }
      : {}),
  })
  const [files, setFiles] = useState<{ url: string; name: string }[]>(
    initial?.file_urls?.map((u) => ({ url: u, name: u.split('/').pop() ?? u })) ?? []
  )
  const [uploading, setUploading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const json = await res.json()
      set('photo_url', json.url)
    }
    setPhotoUploading(false)
    e.target.value = ''
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files
    if (!picked) return
    setUploading(true)
    for (const file of Array.from(picked)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (res.ok) {
        const json = await res.json()
        setFiles((prev) => [...prev, { url: json.url, name: json.name }])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  const removeFile = (url: string) => setFiles((prev) => prev.filter((f) => f.url !== url))

  const handleAiParse = async () => {
    if (!aiText.trim()) return
    setAiLoading(true)
    const res = await fetch('/api/ai/parse-appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiText }),
    })
    if (res.ok) {
      const data = await res.json()
      setForm((f) => ({
        ...f,
        person_name: data.person_name || f.person_name,
        company_name: data.company_name || f.company_name,
        referred_by: data.referred_by || f.referred_by,
        category: data.category || f.category,
        keywords: Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || f.keywords),
        trouble_memo: data.trouble_memo || f.trouble_memo,
        impression_memo: data.impression_memo || f.impression_memo,
        action_next: data.action_next || f.action_next,
        sale_amount: data.sale_amount != null ? String(data.sale_amount) : f.sale_amount,
        status: data.status || f.status,
      }))
      setShowAiPanel(false)
      setAiText('')
    }
    setAiLoading(false)
  }

  const handleSave = async () => {
    if (!form.person_name.trim()) return
    setSaving(true)
    const payload = {
      ...form,
      keywords: form.keywords ? form.keywords.split(/[,、]/).map((k) => k.trim()).filter(Boolean) : [],
      sale_amount: form.sale_amount ? parseInt(form.sale_amount, 10) : null,
      file_urls: files.map((f) => f.url),
    }
    const url = initial ? `/api/appointments/${initial.id}` : '/api/appointments'
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{initial ? 'アポを編集' : '新規アポ記録'}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                showAiPanel
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
              )}
            >
              <Sparkles size={13} />
              AI自動入力
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        {/* AI貼り付けパネル */}
        {showAiPanel && (
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
            <p className="text-xs font-medium text-purple-700 mb-2">
              議事録・メモを貼り付けてください。AIが自動でフォームに入力します。
            </p>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              rows={5}
              placeholder="例：本日、山田太郎さん（株式会社〇〇）と1to1を実施。佐藤さんからの紹介。IT業界でシステム刷新に困っているとのこと..."
              className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none bg-white"
            />
            <button
              onClick={handleAiParse}
              disabled={aiLoading || !aiText.trim()}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Sparkles size={13} />
              {aiLoading ? '解析中...' : '自動入力する'}
            </button>
          </div>
        )}

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* 顔写真 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200">
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="photo" className="w-full h-full object-cover" />
              ) : (
                <Camera size={22} className="text-gray-300" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">顔写真</p>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload size={12} />
                {photoUploading ? 'アップロード中...' : '写真を選択'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={photoUploading}
                />
              </label>
              {form.photo_url && (
                <button onClick={() => set('photo_url', '')} className="mt-1 text-xs text-red-400 hover:text-red-600">
                  削除
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">お名前 <span className="text-red-500">*</span></label>
              <input
                value={form.person_name}
                onChange={(e) => set('person_name', e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">会社名</label>
              <input
                value={form.company_name}
                onChange={(e) => set('company_name', e.target.value)}
                placeholder="株式会社〇〇"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">1to1日時</label>
              <input
                type="datetime-local"
                value={form.met_at}
                onChange={(e) => set('met_at', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">紹介者</label>
              <input
                value={form.referred_by}
                onChange={(e) => set('referred_by', e.target.value)}
                placeholder="紹介者名"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">職業カテゴリ</label>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as AppStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white"
              >
                {(Object.keys(STATUS_LABEL) as AppStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">キーワード（カンマ区切り）</label>
            <input
              value={form.keywords}
              onChange={(e) => set('keywords', e.target.value)}
              placeholder="相続, 節税, IT導入"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">困っていること・課題</label>
            <textarea
              value={form.trouble_memo}
              onChange={(e) => set('trouble_memo', e.target.value)}
              rows={3}
              placeholder="相手の悩みや課題をメモ"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">印象・気づき</label>
            <textarea
              value={form.impression_memo}
              onChange={(e) => set('impression_memo', e.target.value)}
              rows={2}
              placeholder="相手の印象や会話での気づき"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">次のアクション</label>
            <input
              value={form.action_next}
              onChange={(e) => set('action_next', e.target.value)}
              placeholder="来週提案書を送付"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">売上金額（円）</label>
            <input
              type="number"
              value={form.sale_amount}
              onChange={(e) => set('sale_amount', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">ファイル添付（PDF・画像）</label>
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors w-fit">
              <Upload size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">{uploading ? 'アップロード中...' : 'ファイルを選択'}</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                onChange={handleFile}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f) => (
                  <div key={f.url} className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText size={12} className="text-gray-400 flex-shrink-0" />
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-xs">
                      {f.name}
                    </a>
                    <button onClick={() => removeFile(f.url)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
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
            disabled={saving || !form.person_name.trim()}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ appo, onClose, onEdit, onDelete }: {
  appo: Appointment
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {appo.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appo.photo_url} alt={appo.person_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-sm font-medium">{appo.person_name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900">{appo.person_name}</h2>
              {appo.company_name && <p className="text-xs text-gray-400">{appo.company_name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Pencil size={14} />
            </button>
            <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[appo.status])}>
              {STATUS_LABEL[appo.status]}
            </span>
            {appo.category && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                {appo.category}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">日時</p>
              <p className="text-gray-700">{toLocalDate(appo.met_at)}</p>
            </div>
            {appo.referred_by && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">紹介者</p>
                <p className="text-gray-700">{appo.referred_by}</p>
              </div>
            )}
            {appo.sale_amount != null && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">売上</p>
                <p className="text-gray-700 font-medium">¥{appo.sale_amount.toLocaleString()}</p>
              </div>
            )}
          </div>

          {appo.keywords?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">キーワード</p>
              <div className="flex flex-wrap gap-1">
                {appo.keywords.map((k) => (
                  <span key={k} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{k}</span>
                ))}
              </div>
            </div>
          )}

          {appo.trouble_memo && (
            <div>
              <p className="text-xs text-gray-400 mb-1">困っていること</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">{appo.trouble_memo}</p>
            </div>
          )}

          {appo.impression_memo && (
            <div>
              <p className="text-xs text-gray-400 mb-1">印象・気づき</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2">{appo.impression_memo}</p>
            </div>
          )}

          {appo.action_next && (
            <div>
              <p className="text-xs text-gray-400 mb-1">次のアクション</p>
              <p className="text-sm text-gray-700 bg-blue-50 rounded-lg px-3 py-2">{appo.action_next}</p>
            </div>
          )}

          {appo.file_urls?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">添付ファイル</p>
              <div className="space-y-1">
                {appo.file_urls.map((url) => {
                  const name = url.split('/').pop() ?? url
                  return (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
                      <FileText size={12} />
                      {name}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAppo, setEditingAppo] = useState<Appointment | null>(null)
  const [viewingAppo, setViewingAppo] = useState<Appointment | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { from, to } = getRange(period)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (search) params.set('search', search)

    const res = await fetch(`/api/appointments?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setAppointments(data)
    }
    setLoading(false)
  }, [period, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const text = await file.text()
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean)
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1)
    let count = 0
    for (const line of dataLines) {
      // カンマ区切り（ダブルクォート対応）
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? []
      const get = (i: number) => (cols[i] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()
      const person_name = get(0)
      if (!person_name) continue
      const met_raw = get(2)
      const met_at = met_raw ? new Date(met_raw).toISOString() : new Date().toISOString()
      const statusLabel = get(10)
      const status: AppStatus = STATUS_FROM_LABEL[statusLabel] ?? 'contacted'
      const sale_raw = get(9)
      const sale_amount = sale_raw ? parseInt(sale_raw.replace(/[^0-9]/g, ''), 10) || null : null
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_name,
          company_name: get(1),
          met_at,
          referred_by: get(3),
          category: get(4),
          keywords: get(5) ? get(5).split('・').filter(Boolean) : [],
          trouble_memo: get(6),
          impression_memo: get(7),
          action_next: get(8),
          sale_amount,
          status,
        }),
      })
      count++
    }
    setImporting(false)
    e.target.value = ''
    fetchData()
    alert(`${count}件のデータをインポートしました`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このアポ記録を削除しますか？')) return
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    setViewingAppo(null)
    fetchData()
  }

  const total = appointments.length
  const contracted = appointments.filter((a) => a.status === 'contracted')
  const contractedCount = contracted.length
  const contractRate = total > 0 ? Math.round((contractedCount / total) * 100) : 0
  const totalSales = contracted.reduce((sum, a) => sum + (a.sale_amount ?? 0), 0)
  const referred = appointments.filter((a) => a.referred_by).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">アポ管理</h1>
          <p className="text-gray-500 mt-1 text-sm">1to1 ミーティング記録</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(appointments)}
            disabled={appointments.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <Download size={14} />
            CSV出力
          </button>
          <label className={clsx(
            'flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors cursor-pointer',
            importing && 'opacity-50 pointer-events-none'
          )}>
            <Upload size={14} />
            {importing ? 'インポート中...' : 'CSV取込'}
            <input
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            title="インポート用テンプレートをダウンロード"
          >
            <FileText size={14} />
            テンプレート
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={16} />
            新規記録
          </button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: '総1to1回数', value: `${total}回`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: TrendingUp, label: '紹介件数', value: `${referred}件`, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: CheckCircle, label: '成約率', value: `${contractRate}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: DollarSign, label: '総売上', value: `¥${totalSales.toLocaleString()}`, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.bg)}>
                <Icon size={18} className={card.color} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          )
        })}
      </div>

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

        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・会社名で検索"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* 一覧テーブル */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">アポ記録がありません</p>
          <p className="text-xs mt-1">「新規記録」から追加してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">日付</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">名前 / 会社</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カテゴリ</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">ステータス</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">売上</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">次のアクション</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appo, i) => (
                <tr
                  key={appo.id}
                  className={clsx(
                    'border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group',
                    i === appointments.length - 1 && 'border-b-0'
                  )}
                  onClick={() => setViewingAppo(appo)}
                >
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {toLocalDate(appo.met_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {appo.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={appo.photo_url} alt={appo.person_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-gray-400 text-xs">{appo.person_name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{appo.person_name}</p>
                        {appo.company_name && <p className="text-xs text-gray-400">{appo.company_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {appo.category && (
                      <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{appo.category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[appo.status])}>
                      {STATUS_LABEL[appo.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {appo.sale_amount != null ? `¥${appo.sale_amount.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                    {appo.action_next || '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingAppo(appo)}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(appo.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
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

      {showForm && (
        <FormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchData() }}
        />
      )}

      {editingAppo && (
        <FormModal
          initial={editingAppo}
          onClose={() => setEditingAppo(null)}
          onSaved={() => { setEditingAppo(null); fetchData() }}
        />
      )}

      {viewingAppo && !editingAppo && (
        <DetailModal
          appo={viewingAppo}
          onClose={() => setViewingAppo(null)}
          onEdit={() => { setEditingAppo(viewingAppo); setViewingAppo(null) }}
          onDelete={() => handleDelete(viewingAppo.id)}
        />
      )}
    </div>
  )
}
