'use client'

import { useState, useEffect } from 'react'
import { X, Bell, ChevronDown } from 'lucide-react'
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

  // リマインダー
  const t = task as Task & {
    reminder_enabled?: boolean
    reminder_interval?: number
    reminder_unit?: string
    reminder_start?: string
    reminder_end_type?: string
    reminder_end_date?: string
    reminder_end_count?: number
  }
  const [reminderEnabled, setReminderEnabled] = useState(t?.reminder_enabled ?? false)
  const [reminderInterval, setReminderInterval] = useState(t?.reminder_interval ?? 1)
  const [reminderUnit, setReminderUnit] = useState(t?.reminder_unit ?? 'week')
  const [reminderStart, setReminderStart] = useState(t?.reminder_start ?? new Date().toISOString().split('T')[0])
  const [reminderEndType, setReminderEndType] = useState(t?.reminder_end_type ?? 'none')
  const [reminderEndDate, setReminderEndDate] = useState(t?.reminder_end_date ?? '')
  const [reminderEndCount, setReminderEndCount] = useState(t?.reminder_end_count ?? 30)
  const [showReminder, setShowReminder] = useState(t?.reminder_enabled ?? false)

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
      reminder_enabled: reminderEnabled,
      reminder_interval: reminderEnabled ? reminderInterval : null,
      reminder_unit: reminderEnabled ? reminderUnit : null,
      reminder_start: reminderEnabled ? reminderStart : null,
      reminder_end_type: reminderEnabled ? reminderEndType : null,
      reminder_end_date: reminderEnabled && reminderEndType === 'date' ? reminderEndDate : null,
      reminder_end_count: reminderEnabled && reminderEndType === 'count' ? reminderEndCount : null,
    } as Omit<Task, 'id' | 'created_at'>)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{task ? 'タスクを編集' : '新規タスク'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
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

          {/* リマインダー設定 */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowReminder((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Bell size={14} className={reminderEnabled ? 'text-blue-500' : 'text-gray-400'} />
                <span className="font-medium">リマインダー</span>
                {reminderEnabled && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">ON</span>
                )}
              </span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showReminder ? 'rotate-180' : ''}`} />
            </button>

            {showReminder && (
              <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 space-y-3">
                {/* ON/OFF */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setReminderEnabled((v) => !v)}
                      className={`w-9 h-5 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${reminderEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${reminderEnabled ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-xs text-gray-600">{reminderEnabled ? 'リマインド有効' : 'リマインドなし'}</span>
                  </label>
                </div>

                {reminderEnabled && (
                  <>
                    {/* 繰り返し間隔 */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">繰り返す間隔</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={reminderInterval}
                          onChange={(e) => setReminderInterval(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-center"
                        />
                        <select
                          value={reminderUnit}
                          onChange={(e) => setReminderUnit(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                        >
                          <option value="day">日ごと</option>
                          <option value="week">週間ごと</option>
                          <option value="month">か月ごと</option>
                          <option value="year">年ごと</option>
                        </select>
                      </div>
                    </div>

                    {/* 開始日 */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">開始</label>
                      <input
                        type="date"
                        value={reminderStart}
                        onChange={(e) => setReminderStart(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>

                    {/* 終了条件 */}
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">終了</label>
                      <div className="space-y-1.5">
                        {[
                          { value: 'none', label: 'なし' },
                          { value: 'date', label: '終了日' },
                          { value: 'count', label: '繰り返し回数' },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="reminder_end"
                              value={opt.value}
                              checked={reminderEndType === opt.value}
                              onChange={() => setReminderEndType(opt.value)}
                              className="text-blue-500"
                            />
                            <span className="text-xs text-gray-600">{opt.label}</span>
                            {opt.value === 'date' && reminderEndType === 'date' && (
                              <input
                                type="date"
                                value={reminderEndDate}
                                onChange={(e) => setReminderEndDate(e.target.value)}
                                className="ml-1 px-2 py-0.5 text-xs border border-gray-200 rounded focus:outline-none"
                              />
                            )}
                            {opt.value === 'count' && reminderEndType === 'count' && (
                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={reminderEndCount}
                                  onChange={(e) => setReminderEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-14 px-2 py-0.5 text-xs border border-gray-200 rounded text-center focus:outline-none"
                                />
                                <span className="text-xs text-gray-500">回</span>
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex justify-end gap-3">
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
