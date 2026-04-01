'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, CheckSquare, FolderOpen, Calendar, Receipt,
  Phone, Wallet, BarChart2, Bookmark, Users, TrendingUp,
  PieChart, Activity, UserCog, LogOut, HardDrive,
} from 'lucide-react'
import clsx from 'clsx'

const menuItems = [
  { href: '/', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/tasks', label: 'タスク', icon: CheckSquare },
  { href: '/projects', label: 'プロジェクト', icon: FolderOpen },
  { href: '/schedule', label: 'スケジュール', icon: Calendar },
  { href: '/expenses', label: '経費精算', icon: Receipt },
  { href: '/appointments', label: 'アポ管理', icon: Phone },
  { href: '/finance', label: '個人財務管理', icon: Wallet },
  { href: '/report', label: '個人レポート', icon: BarChart2 },
  { href: '/bookmarks', label: 'ブックマーク', icon: Bookmark },
  { href: '/members', label: 'メンバー', icon: Users },
  { href: '/drive', label: 'Google Drive', icon: HardDrive },
]

const adminItems = [
  { href: '/admin/finance', label: '財務管理（全体）', icon: TrendingUp },
  { href: '/admin/pl', label: '全体PL管理', icon: PieChart },
  { href: '/admin/diagnosis', label: '従業員診断', icon: Activity },
  { href: '/admin/users', label: 'ユーザー管理', icon: UserCog },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // ログインページでは非表示
  if (pathname === '/login') return null

  const name = session?.user?.name ?? '...'
  const email = session?.user?.email ?? ''
  const initial = name.charAt(0)

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col bg-[#1a1f2e] text-white z-50">
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-base font-bold text-white">業務管理</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <p className="px-5 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
          メニュー
        </p>
        <ul className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="px-5 mt-5 mb-2 text-[10px] font-semibold text-white/30 uppercase tracking-widest">
          管理者メニュー
        </p>
        <ul className="space-y-0.5 px-2">
          {adminItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={name}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{name}</p>
            <p className="text-[10px] text-white/40 truncate">{email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
          title="サインアウト"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
