'use client'

// ローカルストレージを使ったシンプルな状態管理

export type Priority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  status: TaskStatus
  dueDate: string | null
  projectId: string | null
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

const TASKS_KEY = 'gyomu_tasks'

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'freee導入のヒアリング資料作成',
    description: '大学父母会向けfreee導入の事前ヒアリングシートを作成する',
    priority: 'high',
    status: 'todo',
    dueDate: new Date().toISOString().split('T')[0],
    projectId: null,
    assigneeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Trelloボード構成の整理',
    description: '長期見込み〜稼働案件のステージ管理ボードを設計する',
    priority: 'high',
    status: 'in_progress',
    dueDate: null,
    projectId: null,
    assigneeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: '薬局システム移行の比較表作成',
    description: 'JDL→freee/マネーフォワード移行の比較資料',
    priority: 'medium',
    status: 'in_progress',
    dueDate: null,
    projectId: null,
    assigneeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'kintoneアプリ設計書レビュー',
    description: '顧客向けkintoneアプリの設計書をレビューする',
    priority: 'medium',
    status: 'todo',
    dueDate: null,
    projectId: null,
    assigneeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'コミュニティ事務局 月次報告書',
    description: '2代目女性経営者コミュニティの月次活動報告',
    priority: 'low',
    status: 'done',
    dueDate: null,
    projectId: null,
    assigneeId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function getTasks(): Task[] {
  if (typeof window === 'undefined') return INITIAL_TASKS
  const stored = localStorage.getItem(TASKS_KEY)
  if (!stored) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(INITIAL_TASKS))
    return INITIAL_TASKS
  }
  return JSON.parse(stored)
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const tasks = getTasks()
  const newTask: Task = {
    ...task,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  saveTasks([...tasks, newTask])
  return newTask
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = getTasks()
  const index = tasks.findIndex((t) => t.id === id)
  if (index === -1) return null
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() }
  saveTasks(tasks)
  return tasks[index]
}

export function deleteTask(id: string): void {
  const tasks = getTasks()
  saveTasks(tasks.filter((t) => t.id !== id))
}
