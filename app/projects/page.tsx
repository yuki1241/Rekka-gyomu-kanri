'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, FolderOpen, X } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'

interface Member {
  id: string
  email: string
  name: string
}

interface Project {
  id: string
  name: string
  description: string
  color: string
  user_email: string
  sales_email: string | null
  director_email: string | null
  created_at: string
  tasks: { count: number }[]
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

interface ProjectFormProps {
  initial?: Project | null
  members: Member[]
  currentEmail: string
  onSave: (data: { name: string; description: string; color: string; sales_email: string | null; director_email: string | null }) => void
  onCancel: () => void
  saving: boolean
  isEdit?: boolean
}

function ProjectForm({ initial, members, currentEmail, onSave, onCancel, saving, isEdit }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [salesEmail, setSalesEmail] = useState(initial?.sales_email ?? '')
  const [directorEmail, setDirectorEmail] = useState(initial?.director_email ?? '')

  return (
    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-sm">{isEdit ? 'プロジェクトを編集' : '新規プロジェクト作成'}</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            プロジェクト名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：freee導入支援"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="プロジェクトの概要（任意）"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">営業担当</label>
            <select
              value={salesEmail}
              onChange={(e) => setSalesEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="">未設定</option>
              {members.map((m) => (
                <option key={m.id} value={m.email}>
                  {m.name || m.email}{m.email === currentEmail ? '（自分）' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ディレクター担当</label>
            <select
              value={directorEmail}
              onChange={(e) => setDirectorEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="">未設定</option>
              {members.map((m) => (
                <option key={m.id} value={m.email}>
                  {m.name || m.email}{m.email === currentEmail ? '（自分）' : ''}
                </option>
              ))}
            </select>
          </div>
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
            onClick={() => {
              if (!name.trim()) return
              onSave({
                name: name.trim(),
                description: description.trim(),
                color,
                sales_email: salesEmail || null,
                director_email: directorEmail || null,
              })
            }}
            disabled={saving || !name.trim()}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : isEdit ? '保存する' : '作成する'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const currentEmail = session?.user?.email ?? ''

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [saving, setSaving] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [memberNames, setMemberNames] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)

  const fetchProjects = useCallback(async (all: boolean) => {
    setLoading(true)
    const res = await fetch(all ? '/api/projects?all=1' : '/api/projects')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setProjects(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects(showAll) }, [fetchProjects, showAll])

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data)
          const map: Record<string, string> = {}
          for (const m of data) map[m.email] = m.name || m.email
          setMemberNames(map)
        }
      })
      .catch(() => {})
  }, [])

  const getName = (email?: string | null) => {
    if (!email) return null
    if (email === currentEmail) return '自分'
    return memberNames[email] || email
  }

  const handleCreate = async (data: { name: string; description: string; color: string; sales_email: string | null; director_email: string | null }) => {
    setSaving(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setShowForm(false)
      fetchProjects(showAll)
    }
    setSaving(false)
  }

  const handleEdit = async (data: { name: string; description: string; color: string; sales_email: string | null; director_email: string | null }) => {
    if (!editingProject) return
    setSaving(true)
    await fetch(`/api/projects/${editingProject.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEditingProject(null)
    fetchProjects(showAll)
    setSaving(false)
  }

  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`「${projectName}」を削除しますか？`)) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects(showAll)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p className="text-gray-500 mt-1 text-sm">全 {projects.length} 件</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setShowAll(false)}
              className={clsx(
                'px-3 py-1.5 rounded-md transition-colors',
                !showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              自分のみ
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={clsx(
                'px-3 py-1.5 rounded-md transition-colors',
                showAll ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              全員
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingProject(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus size={16} />
            新規プロジェクト
          </button>
        </div>
      </div>

      {/* 作成フォーム */}
      {showForm && (
        <ProjectForm
          members={members}
          currentEmail={currentEmail}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* 編集フォーム */}
      {editingProject && (
        <ProjectForm
          initial={editingProject}
          members={members}
          currentEmail={currentEmail}
          onSave={handleEdit}
          onCancel={() => setEditingProject(null)}
          saving={saving}
          isEdit
        />
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
            const isOwner = project.user_email === currentEmail
            return (
              <div key={project.id} className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-2" style={{ backgroundColor: project.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                        {project.name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      {isOwner && (
                        <button
                          onClick={() => { setEditingProject(project); setShowForm(false) }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                        >
                          編集
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(project.id, project.name)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {project.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                  )}

                  {/* 担当者バッジ */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.sales_email && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">
                        <span className="text-orange-400">営</span>
                        {getName(project.sales_email)}
                      </span>
                    )}
                    {project.director_email && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                        <span className="text-purple-400">D</span>
                        {getName(project.director_email)}
                      </span>
                    )}
                    {project.user_email && !isOwner && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                        作成: {getName(project.user_email)}
                      </span>
                    )}
                  </div>

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
