'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, FolderOpen, X, Users, UserPlus, Crown, Archive, ArchiveRestore } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'

interface Member {
  id: string
  email: string
  name: string
}

interface ProjectMember {
  user_email: string
  role: string
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
  archived: boolean
  tasks: { count: number }[]
  project_members: ProjectMember[]
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

// ---------- メンバー管理モーダル ----------
function MemberManageModal({
  project,
  members,
  memberNames,
  currentEmail,
  onClose,
}: {
  project: Project
  members: Member[]
  memberNames: Record<string, string>
  currentEmail: string
  onClose: () => void
}) {
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [adding, setAdding] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}/members`)
    if (res.ok) setProjectMembers(await res.json())
  }, [project.id])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const handleAdd = async () => {
    if (!selectedEmail) return
    setAdding(true)
    await fetch(`/api/projects/${project.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: selectedEmail }),
    })
    setSelectedEmail('')
    fetchMembers()
    setAdding(false)
  }

  const handleRemove = async (email: string) => {
    if (!confirm(`${memberNames[email] || email} を外しますか？`)) return
    await fetch(`/api/projects/${project.id}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: email }),
    })
    fetchMembers()
  }

  const alreadyAdded = projectMembers.map((m) => m.user_email)
  const addableMembers = members.filter((m) => !alreadyAdded.includes(m.email))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">メンバー管理</h2>
            <p className="text-xs text-gray-400 mt-0.5">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 現在のメンバー一覧 */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">現在のメンバー</p>
            <div className="space-y-2">
              {projectMembers.map((m) => (
                <div key={m.user_email} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                      {(memberNames[m.user_email] || m.user_email).charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {memberNames[m.user_email] || m.user_email}
                        {m.user_email === currentEmail && <span className="text-gray-400">（自分）</span>}
                      </p>
                      <p className="text-xs text-gray-400">{m.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === 'owner' ? (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full font-medium">
                        <Crown size={10} />作成者
                      </span>
                    ) : (
                      <>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">メンバー</span>
                        {m.user_email !== currentEmail && (
                          <button
                            onClick={() => handleRemove(m.user_email)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* メンバー追加 */}
          {addableMembers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">メンバーを追加</p>
              <div className="flex gap-2">
                <select
                  value={selectedEmail}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  <option value="">メンバーを選択</option>
                  {addableMembers.map((m) => (
                    <option key={m.email} value={m.email}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAdd}
                  disabled={!selectedEmail || adding}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  <UserPlus size={14} />
                  追加
                </button>
              </div>
            </div>
          )}
          {addableMembers.length === 0 && projectMembers.length > 0 && (
            <p className="text-xs text-gray-400 text-center py-2">全メンバーが追加済みです</p>
          )}
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
  const [showArchived, setShowArchived] = useState(false)
  const [managingMembersProject, setManagingMembersProject] = useState<Project | null>(null)

  const fetchProjects = useCallback(async (all: boolean, archived: boolean) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (all) params.set('all', '1')
    if (archived) params.set('archived', '1')
    const res = await fetch(`/api/projects?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setProjects(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects(showAll, showArchived) }, [fetchProjects, showAll, showArchived])

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
      fetchProjects(showAll, showArchived)
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
    fetchProjects(showAll, showArchived)
    setSaving(false)
  }

  const handleDelete = async (id: string, projectName: string) => {
    if (!confirm(`「${projectName}」を削除しますか？`)) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    fetchProjects(showAll, showArchived)
  }

  const handleArchive = async (id: string, archive: boolean) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: archive }),
    })
    fetchProjects(showAll, showArchived)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p className="text-gray-500 mt-1 text-sm">全 {projects.length} 件</p>
        </div>
        <div className="flex items-center gap-3">
          {/* アーカイブ切り替え */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setShowArchived(false)}
              className={clsx(
                'px-3 py-1.5 rounded-md transition-colors',
                !showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              アクティブ
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors',
                showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Archive size={11} />
              アーカイブ
            </button>
          </div>
          {!showArchived && (
            <button
              onClick={() => { setShowForm(true); setEditingProject(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus size={16} />
              新規プロジェクト
            </button>
          )}
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

      {managingMembersProject && (
        <MemberManageModal
          project={managingMembersProject}
          members={members}
          memberNames={memberNames}
          currentEmail={currentEmail}
          onClose={() => { setManagingMembersProject(null); fetchProjects(showAll, showArchived) }}
        />
      )}

      {/* プロジェクト一覧 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">読み込み中...</div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <FolderOpen size={40} className="mb-3 opacity-30" />
          {showArchived ? (
            <>
              <p className="text-sm">アーカイブ済みのプロジェクトはありません</p>
            </>
          ) : (
            <>
              <p className="text-sm">プロジェクトがありません</p>
              <p className="text-xs mt-1">「新規プロジェクト」から作成してください</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((project) => {
            const taskCount = project.tasks?.[0]?.count ?? 0
            const isOwner = project.user_email === currentEmail
            const projectMembers = project.project_members ?? []
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
                        <>
                          {!showArchived && (
                            <>
                              <button
                                onClick={() => { setEditingProject(project); setShowForm(false) }}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                              >
                                編集
                              </button>
                              <button
                                onClick={() => setManagingMembersProject(project)}
                                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="メンバー管理"
                              >
                                <Users size={12} />
                              </button>
                              <button
                                onClick={() => handleArchive(project.id, true)}
                                className="p-1 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                                title="アーカイブ"
                              >
                                <Archive size={12} />
                              </button>
                            </>
                          )}
                          {showArchived && (
                            <button
                              onClick={() => handleArchive(project.id, false)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="アーカイブ解除"
                            >
                              <ArchiveRestore size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(project.id, project.name)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
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
                    {!isOwner && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                        作成: {getName(project.user_email)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{taskCount} タスク</span>
                      {/* メンバーアバター */}
                      {projectMembers.length > 0 && (
                        <div className="flex items-center -space-x-1.5">
                          {projectMembers.slice(0, 4).map((m) => (
                            <div
                              key={m.user_email}
                              title={memberNames[m.user_email] || m.user_email}
                              className="w-5 h-5 rounded-full bg-blue-200 border border-white flex items-center justify-center text-[9px] font-bold text-blue-700"
                            >
                              {(memberNames[m.user_email] || m.user_email).charAt(0)}
                            </div>
                          ))}
                          {projectMembers.length > 4 && (
                            <div className="w-5 h-5 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[9px] text-gray-500">
                              +{projectMembers.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
