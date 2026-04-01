'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

interface Project {
  id: string
  name: string
  description: string
  color: string
  created_at: string
  tasks: { count: number }[]
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/projects')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setProjects(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim(), color }),
    })
    if (res.ok) {
      setName('')
      setDescription('')
      setColor(COLORS[0])
      setShowForm(false)
      fetchProjects()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`「${projectName}」を削除しますか？`)) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p className="text-gray-500 mt-1 text-sm">全 {projects.length} 件</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus size={16} />
          新規プロジェクト
        </button>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">新規プロジェクト作成</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                プロジェクト名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：freee導入支援"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="プロジェクトの概要（任意）"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">カラー</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={clsx(
                      'w-7 h-7 rounded-full transition-transform',
                      color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? '作成中...' : '作成する'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* プロジェクト一覧 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <FolderOpen size={40} className="mb-3 opacity-30" />
          <p className="text-sm">プロジェクトがありません</p>
          <p className="text-xs mt-1">「新規プロジェクト」から作成してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => {
            const taskCount = project.tasks?.[0]?.count ?? 0
            return (
              <div key={project.id} className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* カラーバー */}
                <div className="h-2" style={{ backgroundColor: project.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                        {project.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{taskCount} タスク</span>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      開く →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
