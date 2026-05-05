'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Search, ExternalLink, Network, Eye } from 'lucide-react'
import clsx from 'clsx'

interface Contact {
  id: string
  user_email: string
  name: string
  gender: string
  job_type: string
  company: string
  website: string
  position: string
  met_date: string | null
  met_how: string
  connect_target: string
  introduction: string
  notes: string
  display_order: number
  created_at: string
}

const EMPTY: Omit<Contact, 'id' | 'user_email' | 'display_order' | 'created_at'> = {
  name: '',
  gender: '',
  job_type: '',
  company: '',
  website: '',
  position: '',
  met_date: null,
  met_how: '',
  connect_target: '',
  introduction: '',
  notes: '',
}

// --------- 追加・編集モーダル ---------
interface ContactModalProps {
  contact?: Contact | null
  onClose: () => void
  onSave: (data: typeof EMPTY) => void
}

function ContactModal({ contact, onClose, onSave }: ContactModalProps) {
  const [form, setForm] = useState<typeof EMPTY>({
    name: contact?.name ?? '',
    gender: contact?.gender ?? '',
    job_type: contact?.job_type ?? '',
    company: contact?.company ?? '',
    website: contact?.website ?? '',
    position: contact?.position ?? '',
    met_date: contact?.met_date ?? null,
    met_how: contact?.met_how ?? '',
    connect_target: contact?.connect_target ?? '',
    introduction: contact?.introduction ?? '',
    notes: contact?.notes ?? '',
  })

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((p) => ({ ...p, [key]: value }))

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{contact ? '人脈情報を編集' : '人脈を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">名前 <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="山田 太郎" autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">性別</label>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
                <option value="">未選択</option>
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">職種</label>
              <input value={form.job_type} onChange={(e) => set('job_type', e.target.value)}
                placeholder="ITコンサルタント"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">役職</label>
              <input value={form.position} onChange={(e) => set('position', e.target.value)}
                placeholder="代表取締役"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">企業名</label>
              <input value={form.company} onChange={(e) => set('company', e.target.value)}
                placeholder="株式会社〇〇"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">HP（URL）</label>
              <input value={form.website} onChange={(e) => set('website', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">会った日</label>
              <input type="date" value={form.met_date ?? ''} onChange={(e) => set('met_date', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">出会ったきっかけ</label>
              <input value={form.met_how} onChange={(e) => set('met_how', e.target.value)}
                placeholder="BNI、紹介 など"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">繋がりたい人</label>
            <textarea value={form.connect_target} onChange={(e) => set('connect_target', e.target.value)}
              rows={3} placeholder="紹介したい・してほしい人物像"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">紹介文</label>
            <textarea value={form.introduction} onChange={(e) => set('introduction', e.target.value)}
              rows={3} placeholder="この方の強み・紹介ポイント"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">内容</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              rows={3} placeholder="その他メモ・詳細"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            キャンセル
          </button>
          <button
            onClick={() => { if (form.name.trim()) onSave({ ...form, met_date: form.met_date || null }) }}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            {contact ? '保存する' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --------- 詳細モーダル ---------
function DetailModal({ contact, onClose, onEdit }: { contact: Contact; onClose: () => void; onEdit: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const Row = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null
    return (
      <div className="py-2.5 border-b border-gray-50 last:border-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{value}</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{contact.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{contact.company}{contact.position ? ` / ${contact.position}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              <Pencil size={11} /> 編集
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <Row label="名前" value={contact.name} />
          <Row label="性別" value={contact.gender} />
          <Row label="職種" value={contact.job_type} />
          <Row label="企業名" value={contact.company} />
          {contact.website && (
            <div className="py-2.5 border-b border-gray-50">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">HP</p>
              <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                {contact.website} <ExternalLink size={11} />
              </a>
            </div>
          )}
          <Row label="役職" value={contact.position} />
          <Row label="会った日" value={contact.met_date ?? undefined} />
          <Row label="出会ったきっかけ" value={contact.met_how} />
          <Row label="繋がりたい人" value={contact.connect_target} />
          <Row label="紹介文" value={contact.introduction} />
          <Row label="内容" value={contact.notes} />
        </div>
      </div>
    </div>
  )
}

// --------- メインページ ---------
export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/contacts')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setContacts(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleSave = async (form: typeof EMPTY) => {
    if (editingContact) {
      await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    setEditingContact(null)
    fetchContacts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この人脈情報を削除しますか？')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    fetchContacts()
  }

  const filtered = contacts.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.job_type.toLowerCase().includes(q) ||
      c.met_how.toLowerCase().includes(q) ||
      c.connect_target.toLowerCase().includes(q)
    )
  })

  const openEdit = (c: Contact) => {
    setViewingContact(null)
    setEditingContact(c)
    setShowModal(true)
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <Network size={18} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">人脈リスト</h1>
            <p className="text-gray-500 mt-0.5 text-sm">全 {contacts.length} 件</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・会社・職種で検索..."
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-56"
            />
          </div>
          <button
            onClick={() => { setEditingContact(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={15} /> 追加
          </button>
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse min-w-max w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { label: 'No', w: 'w-10' },
                  { label: '名前', w: 'w-28' },
                  { label: '性別', w: 'w-12' },
                  { label: '職種', w: 'w-36' },
                  { label: '企業名', w: 'w-36' },
                  { label: 'HP', w: 'w-24' },
                  { label: '役職', w: 'w-28' },
                  { label: '会った日', w: 'w-24' },
                  { label: '出会ったきっかけ', w: 'w-32' },
                  { label: '繋がりたい人', w: 'w-40' },
                  { label: '紹介文', w: 'w-48' },
                  { label: '内容', w: 'w-48' },
                  { label: '', w: 'w-16' },
                ].map((col) => (
                  <th key={col.label}
                    className={clsx(
                      'px-3 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap border-r border-gray-100 last:border-0',
                      col.w
                    )}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-5 py-16 text-center text-gray-400 text-sm">読み込み中...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-5 py-16 text-center text-gray-400 text-sm">
                    {search ? '検索条件に一致する人脈がありません' : '人脈を追加してください'}
                  </td>
                </tr>
              ) : (
                filtered.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* No */}
                    <td className="px-3 py-3 text-xs text-gray-400 border-r border-gray-50 text-center">
                      {idx + 1}
                    </td>
                    {/* 名前 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <button
                        onClick={() => setViewingContact(c)}
                        className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left flex items-center gap-1"
                      >
                        {c.name || <span className="text-gray-300">（未入力）</span>}
                        <Eye size={11} className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
                      </button>
                    </td>
                    {/* 性別 */}
                    <td className="px-3 py-3 border-r border-gray-50 text-center">
                      {c.gender && (
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded-full font-medium',
                          c.gender === '男' ? 'bg-blue-100 text-blue-700' :
                          c.gender === '女' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {c.gender}
                        </span>
                      )}
                    </td>
                    {/* 職種 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 line-clamp-2 max-w-[140px] block">{c.job_type || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 企業名 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 truncate max-w-[140px] block">{c.company || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* HP */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      {c.website ? (
                        <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 truncate max-w-[90px]">
                          <ExternalLink size={10} className="flex-shrink-0" />
                          <span className="truncate">{c.website.replace(/^https?:\/\//, '')}</span>
                        </a>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    {/* 役職 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 truncate max-w-[110px] block">{c.position || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 会った日 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-600">{c.met_date || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 出会ったきっかけ */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 truncate max-w-[120px] block">{c.met_how || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 繋がりたい人 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 line-clamp-2 max-w-[155px] block">{c.connect_target || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 紹介文 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 line-clamp-2 max-w-[185px] block">{c.introduction || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 内容 */}
                    <td className="px-3 py-3 border-r border-gray-50">
                      <span className="text-xs text-gray-700 line-clamp-2 max-w-[185px] block">{c.notes || <span className="text-gray-300">—</span>}</span>
                    </td>
                    {/* 操作 */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <ContactModal
          contact={editingContact}
          onClose={() => { setShowModal(false); setEditingContact(null) }}
          onSave={handleSave}
        />
      )}

      {viewingContact && !showModal && (
        <DetailModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onEdit={() => openEdit(viewingContact)}
        />
      )}
    </div>
  )
}
