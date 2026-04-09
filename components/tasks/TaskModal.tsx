'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Task, Priority, TaskStatus } from '@/app/tasks/page'
import DriveFiles from '@/components/DriveFiles'

interface Member {
  id: string
  email: string
  name: string
}

interface TaskModalProps {
  task?: Task | null
  currentUserEmail?: string
  onClose: () => void
  onSave: (data: Omit<Task, 'id' | 'created_at'>) => void
}

export default function TaskModal({ task, currentUserEmail, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [driveFolderId, setDriveFolderId] = useState((task as Task & { drive_folder_id?: string })?.drive_folder_id ?? '')
  const [driveInput, setDriveInput] = useState(driveFolderId)
  const [assignedTo, setAssignedTo] = useState((task as Task & { assigned_to_email?: string })?.assigned_to_email ?? '')
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data) })
      .catch(() => {})
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      due_date: dueDate || null,
      drive_folder_id: driveFolderId.trim(),
      assigned_to_email: assignedTo || null,
    } as Omit<Task, 'id' | 'created_at'>)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{task ? 'タスクを編集' : '新規タスク'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細を入力（任意）"
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>

          {/* 担当者 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">担当者</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
            >
              <option value="">自分（担当者なし）</option>
              {members
                .filter((m) => m.email !== currentUserEmail)
                .map((m) => (
                  <option key={m.id} value={m.email}>
                    {m.name || m.email}
                  </option>
                ))}
            </select>
            {assignedTo && (
              <p className="text-[10px] text-blue-500 mt-1">
                このタスクは {members.find((m) => m.email === assignedTo)?.name || assignedTo} に依頼されます
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">優先度</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="todo">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">期限</label>
              <input
                type="date"
                value={dueDate ?? ''}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Google Drive フォルダ
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                onBlur={() => setDriveFolderId(driveInput)}
                placeholder="フォルダURLまたはID"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <DriveFiles folderId={driveFolderId} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {task ? '保存する' : '作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
