'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Trash2, X, Lightbulb, CheckSquare, Users } from 'lucide-react'
import clsx from 'clsx'

interface Suggestion {
  id: string
  user_email: string
  subject: string
  body: string
  submitted_at: string
  no_opinion: boolean
  created_at: string
}

function getWeekRange(): { monday: string; sunday: string } {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { monday: fmt(monday), sunday: fmt(sunday) }
}

interface SuggestionModalProps {
  suggestion?: Suggestion | null
  onClose: () => void
  onSave: (data: { subject: string; body: string; submitted_at: string }) => void
}

function SuggestionModal({ suggestion, onClose, onSave }: SuggestionModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [subject, setSubject] = useState(suggestion?.subject ?? '')
  const [body, setBody] = useState(suggestion?.body ?? '')
  const [submittedAt, setSubmittedAt] = useState(suggestion?.submitted_at ?? today)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{suggestion ? '意見を編集' : '意見を投稿'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="件名を入力"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">詳細</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="意見の詳細を入力（任意）"
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">提出日</label>
            <input
              type="date"
              value={submittedAt}
              onChange={(e) => setSubmittedAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400/30"
            />
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              if (!subject.trim()) return
              onSave({ subject: subject.trim(), body: body.trim(), submitted_at: submittedAt })
            }}
            className="px-5 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium"
          >
            {suggestion ? '保存する' : '投稿する'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuggestionsPage() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string })?.role === 'admin'

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSuggestion, setEditingSuggestion] = useState<Suggestion | null>(null)
  const [adminViewAll, setAdminViewAll] = useState(false)
  const [submittingNoOpinion, setSubmittingNoOpinion] = useState(false)
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]
  const { monday, sunday } = getWeekRange()

  const fetchSuggestions = useCallback(async () => {
    setLoading(true)
    const url = adminViewAll ? '/api/suggestions?all=1' : '/api/suggestions'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setSuggestions(data)
    }
    setLoading(false)
  }, [adminViewAll])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {}
          for (const m of data) map[m.email] = m.name || m.email
          setMemberNames(map)
        }
      })
      .catch(() => {})
  }, [isAdmin])

  const thisWeekSuggestions = suggestions.filter(
    (s) => s.submitted_at >= monday && s.submitted_at <= sunday && !adminViewAll
  )
  const hasThisWeek = thisWeekSuggestions.length > 0
  const noOpinionThisWeek = thisWeekSuggestions.some((s) => s.no_opinion)

  const handleSave = async (data: { subject: string; body: string; submitted_at: string }) => {
    if (editingSuggestion) {
      await fetch(`/api/suggestions/${editingSuggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setShowModal(false)
    setEditingSuggestion(null)
    fetchSuggestions()
  }

  const handleNoOpinion = async (checked: boolean) => {
    if (noOpinionThisWeek && !checked) {
      const existing = thisWeekSuggestions.find((s) => s.no_opinion)
      if (existing) {
        await fetch(`/api/suggestions/${existing.id}`, { method: 'DELETE' })
        fetchSuggestions()
      }
      return
    }
    if (!checked) return
    setSubmittingNoOpinion(true)
    await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: '今週は意見なし', body: '', submitted_at: today, no_opinion: true }),
    })
    setSubmittingNoOpinion(false)
    fetchSuggestions()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('削除しますか？')) return
    await fetch(`/api/suggestions/${id}`, { method: 'DELETE' })
    fetchSuggestions()
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center">
            <Lightbulb size={18} className="text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">意見箱</h1>
            <p className="text-gray-500 mt-0.5 text-sm">毎週、チームへの意見・改善提案を投稿できます</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setAdminViewAll((v) => !v)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium transition-colors',
                adminViewAll
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <Users size={12} />
              {adminViewAll ? '全員表示中' : '自分のみ'}
            </button>
          )}
          <button
            onClick={() => { setEditingSuggestion(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-sm"
          >
            <Plus size={15} />
            意見を投稿
          </button>
        </div>
      </div>

      {/* 今週の状況（自分のみ表示） */}
      {!adminViewAll && (
        <div className={clsx(
          'mb-6 px-5 py-4 rounded-xl border flex items-start gap-4',
          hasThisWeek
            ? 'bg-green-50 border-green-200'
            : 'bg-yellow-50 border-yellow-200'
        )}>
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
            hasThisWeek ? 'bg-green-100' : 'bg-yellow-100'
          )}>
            {hasThisWeek
              ? <CheckSquare size={15} className="text-green-600" />
              : <Lightbulb size={15} className="text-yellow-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className={clsx('text-sm font-semibold', hasThisWeek ? 'text-green-800' : 'text-yellow-800')}>
              今週（{monday} 〜 {sunday}）
            </p>
            <p className={clsx('text-xs mt-0.5', hasThisWeek ? 'text-green-600' : 'text-yellow-600')}>
              {hasThisWeek
                ? noOpinionThisWeek ? '「意見なし」で登録済みです' : `${thisWeekSuggestions.length}件の意見を提出済みです`
                : 'まだ今週の意見が投稿されていません。日曜23:59までにリマインドが届きます。'
              }
            </p>
          </div>
          {/* 意見なしチェックボックス */}
          <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={noOpinionThisWeek}
              onChange={(e) => handleNoOpinion(e.target.checked)}
              disabled={submittingNoOpinion || (hasThisWeek && !noOpinionThisWeek)}
              className="w-4 h-4 accent-yellow-500"
            />
            <span className="text-xs text-gray-600 whitespace-nowrap">今週は意見なし</span>
          </label>
        </div>
      )}

      {/* 一覧 */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-16 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
            意見はまだありません
          </div>
        ) : (
          suggestions.map((s) => (
            <div
              key={s.id}
              className={clsx(
                'bg-white border rounded-xl px-5 py-4 shadow-sm transition-colors',
                s.no_opinion ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-yellow-200'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={clsx(
                      'text-sm font-semibold',
                      s.no_opinion ? 'text-gray-400 italic' : 'text-gray-900'
                    )}>
                      {s.no_opinion ? '意見なし' : s.subject}
                    </span>
                    {s.no_opinion && (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">意見なし</span>
                    )}
                    {adminViewAll && (
                      <span className="text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded">
                        {memberNames[s.user_email] || s.user_email}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{s.submitted_at}</span>
                  </div>
                  {!s.no_opinion && s.body && (
                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{s.body}</p>
                  )}
                </div>
                {(!adminViewAll || s.user_email === session?.user?.email) && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!s.no_opinion && (
                      <button
                        onClick={() => { setEditingSuggestion(s); setShowModal(true) }}
                        className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <SuggestionModal
          suggestion={editingSuggestion}
          onClose={() => { setShowModal(false); setEditingSuggestion(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
