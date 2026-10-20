'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, X, ChevronRight, ChevronDown } from 'lucide-react'

const PERSON_NAMES = ['全体', '原', '菅野', '久保田', '太附']
const CASE_STATUSES = ['稼働中', '解約予定', '商談中', '一時停止', '完了']
const NEW_CASE_STAGES = ['', '人選中', 'スキルシート提出', '面談', '面談完了', 'トライアル待ち', '本契約']

const STATUS_COLORS: Record<string, string> = {
  '稼働中':   'bg-blue-100 text-blue-700',
  '解約予定': 'bg-red-100 text-red-600',
  '商談中':   'bg-yellow-100 text-yellow-700',
  '一時停止': 'bg-gray-100 text-gray-600',
  '完了':     'bg-green-100 text-green-700',
}
const STAGE_COLORS: Record<string, string> = {
  '人選中':         'bg-purple-100 text-purple-700',
  'スキルシート提出': 'bg-blue-100 text-blue-700',
  '面談':           'bg-yellow-100 text-yellow-700',
  '面談完了':       'bg-orange-100 text-orange-700',
  'トライアル待ち':  'bg-pink-100 text-pink-700',
  '本契約':         'bg-green-100 text-green-700',
}

type TabType = '稼働中' | '見込み' | '終了案件'
const TABS: TabType[] = ['稼働中', '見込み', '終了案件']

interface Member { id: string; name: string; email: string }

interface Case {
  id: string
  case_name: string
  client_name: string
  director_email: string
  sales_email: string
  assistant: string
  current_task: string
  case_status: string
  case_stage: string
  monthly_amount: number
  contract_term: number
  sales_estimate: number
  start_date: string
  memo: string
  updated_at: string
  is_archived: boolean
}

type FormData = Omit<Case, 'id' | 'updated_at' | 'is_archived'>

function emptyForm(): FormData {
  return {
    case_name: '', client_name: '', director_email: '', sales_email: '',
    assistant: '', current_task: '', case_status: '稼働中', case_stage: '',
    monthly_amount: 0, contract_term: 0, sales_estimate: 0, start_date: '', memo: '',
  }
}

// どのタブに属するか判定（排他）
function getTab(c: Case): TabType {
  if (c.is_archived || c.case_status === '完了') return '終了案件'
  if (c.case_stage || c.case_status === '商談中') return '見込み'
  return '稼働中'
}

function fmtYen(n: number) {
  if (!n) return '—'
  return `¥${n.toLocaleString('ja-JP')}`
}
function fmtDate(s: string) {
  if (!s) return '—'
  return s.slice(0, 10).replace(/-/g, '/')
}

export default function CasesPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState('全体')
  const [tab, setTab] = useState<TabType>('稼働中')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Case | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const loadCases = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/director-cases')
      const d = await r.json()
      if (Array.isArray(d)) setCases(d)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/members').then(r => r.json())
      .then((d: Member[]) => Array.isArray(d) && setMembers(d)).catch(() => {})
  }, [])

  useEffect(() => {
    if (session?.user?.email) loadCases()
  }, [session, loadCases])

  const resolveName = (email: string) => members.find(m => m.email === email)?.name ?? email ?? '—'

  // 人物フィルター適用後にタブで絞り込み
  const byPerson = cases.filter(c => {
    if (person === '全体') return true
    const member = members.find(m => m.name === person || m.name.includes(person))
    if (!member) return true
    return c.director_email === member.email || c.sales_email === member.email
  })
  const filtered = byPerson.filter(c => getTab(c) === tab)

  // タブごとの件数
  const counts = {
    '稼働中':   byPerson.filter(c => getTab(c) === '稼働中').length,
    '見込み':   byPerson.filter(c => getTab(c) === '見込み').length,
    '終了案件': byPerson.filter(c => getTab(c) === '終了案件').length,
  }

  const openNew = () => { setEditing(null); setForm(emptyForm()); setShowForm(true) }
  const openEdit = (c: Case) => {
    setEditing(c)
    setForm({
      case_name: c.case_name ?? '', client_name: c.client_name ?? '',
      director_email: c.director_email ?? '', sales_email: c.sales_email ?? '',
      assistant: c.assistant ?? '', current_task: c.current_task ?? '',
      case_status: c.case_status ?? '稼働中', case_stage: c.case_stage ?? '',
      monthly_amount: c.monthly_amount ?? 0, contract_term: c.contract_term ?? 0,
      sales_estimate: c.sales_estimate ?? 0, start_date: c.start_date ?? '', memo: c.memo ?? '',
    })
    setShowForm(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      if (editing) {
        await fetch(`/api/director-cases/${editing.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/director-cases', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        })
      }
      await loadCases()
      setShowForm(false)
    } catch { /* noop */ } finally { setSaving(false) }
  }

  const archive = async (id: string) => {
    await fetch(`/api/director-cases/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true }),
    })
    await loadCases()
  }

  const restore = async (id: string) => {
    await fetch(`/api/director-cases/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: false }),
    })
    await loadCases()
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const set = (k: keyof FormData, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-800">案件一覧</h1>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
          <Plus size={15} /> 案件追加
        </button>
      </div>

      {/* メンバーフィルター */}
      <div className="flex gap-2 mb-4">
        {PERSON_NAMES.map(name => (
          <button key={name} onClick={() => setPerson(name)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              person === name
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500'
            }`}>
            {name}
          </button>
        ))}
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-4 gap-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              tab === t ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
            }`}>{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* テーブル */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="w-8 px-2 py-2"></th>{/* アコーディオン */}
                <th className="px-2 py-2 text-gray-500 font-medium text-left">No</th>
                <th className="px-2 py-2"></th>{/* 編集ボタン */}
                <th className="px-3 py-2 text-left text-gray-500 font-medium">案件名</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">クライアント</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">ディレクター</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">営業</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">案件ステータス</th>
                {tab === '見込み' && <th className="px-3 py-2 text-left text-gray-500 font-medium">案件ステージ</th>}
                <th className="px-3 py-2 text-right text-gray-500 font-medium">売上見込み</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">現在タスク</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">開始日</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">更新日</th>
                <th className="px-3 py-2"></th>{/* 削除 */}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="py-10 text-center text-gray-400">案件なし</td></tr>
              ) : (
                filtered.map((c, idx) => {
                  const expanded = expandedIds.has(c.id)
                  return (
                    <Fragment key={c.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 group">
                        {/* アコーディオン */}
                        <td className="px-2 py-1.5">
                          <button onClick={() => toggleExpand(c.id)} className="text-gray-400 hover:text-gray-600">
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="px-2 py-1.5 text-gray-400">{idx + 1}</td>
                        {/* 編集ボタン（案件名の左） */}
                        <td className="px-1 py-1.5">
                          <button onClick={() => openEdit(c)}
                            className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded hover:bg-blue-50"
                            title="編集">
                            <Pencil size={13} />
                          </button>
                        </td>
                        <td className="px-3 py-1.5 font-medium text-gray-800 max-w-[160px] truncate">{c.case_name || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-600 max-w-[120px] truncate">{c.client_name || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-600">{resolveName(c.director_email)}</td>
                        <td className="px-3 py-1.5 text-gray-600">{resolveName(c.sales_email)}</td>
                        <td className="px-3 py-1.5">
                          {c.case_status
                            ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.case_status] ?? 'bg-gray-100 text-gray-600'}`}>{c.case_status}</span>
                            : '—'}
                        </td>
                        {tab === '見込み' && (
                          <td className="px-3 py-1.5">
                            {c.case_stage
                              ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[c.case_stage] ?? 'bg-gray-100 text-gray-600'}`}>{c.case_stage}</span>
                              : '—'}
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-right text-gray-700 font-medium">{fmtYen(c.sales_estimate)}</td>
                        <td className="px-3 py-1.5 text-gray-600 max-w-[140px] truncate">{c.current_task || '—'}</td>
                        <td className="px-3 py-1.5 text-gray-500">{fmtDate(c.start_date)}</td>
                        <td className="px-3 py-1.5 text-gray-400">{fmtDate(c.updated_at)}</td>
                        <td className="px-3 py-1.5">
                          {tab === '終了案件' ? (
                            <button onClick={() => restore(c.id)}
                              className="text-xs text-gray-400 hover:text-green-500 transition-colors px-2 py-0.5 rounded border border-gray-200 hover:border-green-300">
                              復元
                            </button>
                          ) : (
                            <button onClick={() => archive(c.id)}
                              className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              title="終了案件へ移動">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-orange-50/40 border-b border-gray-100">
                          <td colSpan={tab === '見込み' ? 14 : 13} className="px-10 py-3 text-xs text-gray-600">
                            <span className="font-medium text-gray-500 mr-2">メモ:</span>
                            {c.memo || '（なし）'}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">{editing ? '案件を編集' : '案件を追加'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">案件名</label>
                  <input value={form.case_name} onChange={e => set('case_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">クライアント</label>
                  <input value={form.client_name} onChange={e => set('client_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ディレクター</label>
                  <select value={form.director_email} onChange={e => set('director_email', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">未設定</option>
                    {members.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">営業</label>
                  <select value={form.sales_email} onChange={e => set('sales_email', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                    <option value="">未設定</option>
                    {members.map(m => <option key={m.id} value={m.email}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ダッシュボード連携フィールド */}
              <div className="border border-orange-100 bg-orange-50/50 rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-orange-600">数値管理 / 可視化指標 連携項目</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">案件ステータス</label>
                    <select value={form.case_status} onChange={e => set('case_status', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
                      {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">案件ステージ（新規）</label>
                    <select value={form.case_stage} onChange={e => set('case_stage', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
                      {NEW_CASE_STAGES.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">月額料金（円）</label>
                    <input
                      type="number"
                      value={form.monthly_amount || ''}
                      onChange={e => {
                        const amt = parseInt(e.target.value) || 0
                        const auto = amt * (form.contract_term || 0)
                        setForm(f => ({ ...f, monthly_amount: amt, sales_estimate: auto || f.sales_estimate }))
                      }}
                      placeholder="例: 300000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">契約月数（ヶ月）</label>
                    <input
                      type="number"
                      value={form.contract_term || ''}
                      onChange={e => {
                        const term = parseInt(e.target.value) || 0
                        const auto = (form.monthly_amount || 0) * term
                        setForm(f => ({ ...f, contract_term: term, sales_estimate: auto || f.sales_estimate }))
                      }}
                      placeholder="例: 6"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    売上見込み（円）
                    {form.monthly_amount > 0 && form.contract_term > 0 && (
                      <span className="ml-2 text-orange-400 font-normal">※ 月額 × 月数 で自動計算</span>
                    )}
                  </label>
                  <input type="number" value={form.sales_estimate || ''} onChange={e => set('sales_estimate', parseInt(e.target.value) || 0)}
                    placeholder="例: 1800000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">開始日</label>
                  <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">アシスタント</label>
                  <input value={form.assistant} onChange={e => set('assistant', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">現在タスク</label>
                <input value={form.current_task} onChange={e => set('current_task', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">メモ</label>
                <textarea rows={3} value={form.memo} onChange={e => set('memo', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg disabled:opacity-60 transition-colors">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
