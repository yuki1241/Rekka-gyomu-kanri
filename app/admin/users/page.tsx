'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import AdminGuard from '@/components/AdminGuard'

interface AppUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  invited_by: string
  created_at: string
}

const roleLabel = { admin: '管理者', editor: '編集者', viewer: '閲覧者' }
const roleColor = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
}

function UsersPageContent() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name.trim(), role }),
    })
    if (res.ok) {
      setEmail('')
      setName('')
      setRole('viewer')
      setShowForm(false)
      fetchUsers()
    } else {
      const data = await res.json()
      setError(data.error?.includes('duplicate') ? 'このメールアドレスは既に登録されています' : '追加に失敗しました')
    }
    setSaving(false)
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    fetchUsers()
  }

  const handleDelete = async (id: string, userEmail: string) => {
    if (!confirm(`${userEmail} を削除しますか？`)) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    fetchUsers()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="text-gray-500 mt-1 text-sm">メンバーの招待と権限管理</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={16} />
          ユーザーを招待
        </button>
      </div>

      {/* 権限の説明 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { role: 'admin', label: '管理者', desc: 'すべての操作・ユーザー管理が可能' },
          { role: 'editor', label: '編集者', desc: 'タスク・データの作成・編集が可能' },
          { role: 'viewer', label: '閲覧者', desc: 'データの閲覧のみ可能' },
        ].map((r) => (
          <div key={r.role} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', roleColor[r.role as keyof typeof roleColor])}>
              {r.label}
            </span>
            <p className="text-xs text-gray-500 mt-2">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* 招待フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">新しいユーザーを追加</h2>
          <form onSubmit={handleInvite} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Googleメールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                autoFocus
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-gray-700 mb-1">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="山田太郎"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-700 mb-1">権限</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}
                  className="w-full appearance-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  <option value="viewer">閲覧者</option>
                  <option value="editor">編集者</option>
                  <option value="admin">管理者</option>
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? '追加中...' : '追加'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
          </form>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          <p className="text-xs text-gray-400 mt-3">
            ※ 追加したメールアドレスでGoogleログインするとシステムにアクセスできます
          </p>
        </div>
      )}

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">名前</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">メールアドレス</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-36">権限</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 w-32">追加日</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 w-16">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">読み込み中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">ユーザーがいません</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/70 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(user.name || user.email).charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {user.name || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <div className="relative">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className={clsx(
                          'appearance-none text-xs font-medium px-2 py-1 pr-6 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                          roleColor[user.role]
                        )}
                      >
                        <option value="viewer">閲覧者</option>
                        <option value="editor">編集者</option>
                        <option value="admin">管理者</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-current pointer-events-none opacity-60" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={13} />
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
  )
}

export default function UsersPage() {
  return <AdminGuard><UsersPageContent /></AdminGuard>
}
