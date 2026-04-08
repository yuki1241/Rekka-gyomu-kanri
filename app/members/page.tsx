'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay, parseISO,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RefreshCw, Users, Calendar } from 'lucide-react'
import clsx from 'clsx'

interface Member {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  created_at: string
}

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  colorId?: string
}

const roleLabel = { admin: '管理者', editor: '編集者', viewer: '閲覧者' }
const roleColor = {
  admin: 'bg-purple-100 text-purple-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
}

const EVENT_COLORS: Record<string, string> = {
  '1': 'bg-blue-500',
  '2': 'bg-green-500',
  '3': 'bg-purple-500',
  '4': 'bg-red-500',
  '5': 'bg-yellow-500',
  '6': 'bg-orange-500',
  '7': 'bg-teal-500',
  '8': 'bg-gray-400',
  '9': 'bg-blue-700',
  '10': 'bg-green-700',
  '11': 'bg-red-700',
  default: 'bg-blue-500',
}

function getEventDate(event: CalendarEvent): Date {
  const raw = event.start.dateTime || event.start.date || ''
  return parseISO(raw)
}

function formatTime(event: CalendarEvent): string {
  if (!event.start.dateTime) return '終日'
  return format(parseISO(event.start.dateTime), 'HH:mm')
}

function MemberCalendar({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const timeMin = startOfMonth(date).toISOString()
      const timeMax = endOfMonth(date).toISOString()
      const res = await fetch(`/api/calendar/member?userId=${member.id}&timeMin=${timeMin}&timeMax=${timeMax}`)
      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'no_token') {
          setError('このメンバーはまだシステムにログインしていません')
        } else {
          setError('カレンダーの取得に失敗しました')
        }
        setEvents([])
        return
      }
      const data = await res.json()
      setEvents(data)
    } catch {
      setError('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [member.id])

  useEffect(() => {
    fetchEvents(currentDate)
  }, [currentDate, fetchEvents])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(getEventDate(e), day))

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="flex gap-5">
      {/* カレンダー本体 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchEvents(currentDate)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="更新"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              今日
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* 凡例（自分以外） */}
        {!isSelf && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-400 flex-shrink-0" />
            <p className="text-xs text-amber-700">プライバシー保護のため、予定の内容は非表示です（時間帯のみ表示）</p>
          </div>
        )}

        {error && (
          <div className="px-5 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
        )}

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['日', '月', '火', '水', '木', '金', '土'].map((w, i) => (
            <div
              key={w}
              className={clsx(
                'py-2 text-center text-xs font-medium',
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              )}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const dayOfWeek = day.getDay()

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                className={clsx(
                  'min-h-[80px] p-1 border-b border-r border-gray-50 cursor-pointer transition-colors',
                  !isCurrentMonth && 'bg-gray-50/50',
                  isSelected && 'bg-blue-50',
                  !isSelected && isCurrentMonth && 'hover:bg-gray-50'
                )}
              >
                <div
                  className={clsx(
                    'w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-medium mb-0.5',
                    isToday(day) ? 'bg-blue-600 text-white' : '',
                    !isToday(day) && dayOfWeek === 0 ? 'text-red-400' : '',
                    !isToday(day) && dayOfWeek === 6 ? 'text-blue-400' : '',
                    !isToday(day) && dayOfWeek !== 0 && dayOfWeek !== 6
                      ? isCurrentMonth ? 'text-gray-700' : 'text-gray-300'
                      : ''
                  )}
                >
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={clsx(
                        'text-[9px] text-white px-1 py-0.5 rounded truncate',
                        EVENT_COLORS[event.colorId ?? 'default']
                      )}
                      title={isSelf ? event.summary : '予定あり'}
                    >
                      {formatTime(event)} {isSelf ? event.summary : '予定あり'}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-gray-400 px-1">
                      +{dayEvents.length - 3}件
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 選択日の詳細 */}
      <div className="w-60 bg-white rounded-xl border border-gray-100 shadow-sm p-4 self-start sticky top-8">
        <h4 className="font-semibold text-gray-900 mb-3 text-sm">
          {selectedDay
            ? format(selectedDay, 'M月d日（EEE）', { locale: ja })
            : '日付を選択'}
        </h4>

        {!selectedDay && (
          <p className="text-xs text-gray-400 text-center py-6">
            日付をクリックすると<br />その日の予定が表示されます
          </p>
        )}

        {selectedDay && selectedDayEvents.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">
            この日の予定はありません
          </p>
        )}

        {selectedDayEvents.length > 0 && (
          <ul className="space-y-2">
            {selectedDayEvents.map((event) => (
              <li key={event.id} className="flex gap-2 items-start">
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    EVENT_COLORS[event.colorId ?? 'default']
                  )}
                />
                <div>
                  <p className="text-xs font-medium text-gray-800">
                    {isSelf ? event.summary : '予定あり'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {event.start.dateTime
                      ? `${format(parseISO(event.start.dateTime), 'HH:mm')} 〜 ${format(parseISO(event.end.dateTime!), 'HH:mm')}`
                      : '終日'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function MembersPage() {
  const { data: session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data)
          // デフォルトで自分を選択
          const me = data.find((m: Member) => m.email === session?.user?.email)
          if (me) setSelectedMember(me)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session?.user?.email])

  const isSelf = selectedMember?.email === session?.user?.email

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メンバー</h1>
          <p className="text-gray-500 mt-1 text-sm">メンバーのスケジュールを確認できます</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Users size={14} />
          <span>{members.length} 名</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* メンバーリスト */}
        <div className="w-52 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">メンバー一覧</p>
          {loading ? (
            <div className="text-sm text-gray-400 px-1">読み込み中...</div>
          ) : (
            <ul className="space-y-1">
              {members.map((member) => {
                const isMe = member.email === session?.user?.email
                const isSelected = selectedMember?.id === member.id
                const initial = (member.name || member.email).charAt(0).toUpperCase()
                return (
                  <li key={member.id}>
                    <button
                      onClick={() => setSelectedMember(member)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <div className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      )}>
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className={clsx('text-xs font-medium truncate', isSelected ? 'text-white' : 'text-gray-800')}>
                          {member.name || member.email.split('@')[0]}
                          {isMe && <span className="ml-1 opacity-60 text-[10px]">（自分）</span>}
                        </p>
                        <span className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                          isSelected ? 'bg-white/20 text-white' : roleColor[member.role]
                        )}>
                          {roleLabel[member.role]}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* カレンダーエリア */}
        <div className="flex-1 min-w-0">
          {selectedMember ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-800">
                  {selectedMember.name || selectedMember.email.split('@')[0]}
                  {isSelf ? ' のスケジュール（自分）' : ' のスケジュール'}
                </h2>
              </div>
              <MemberCalendar key={selectedMember.id} member={selectedMember} isSelf={isSelf} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Users size={32} className="mb-3 opacity-30" />
              <p className="text-sm">左のリストからメンバーを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
