'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay, parseISO,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  colorId?: string
}

const EVENT_COLORS: Record<string, string> = {
  '1': 'bg-blue-500',
  '2': 'bg-green-500',
  '3': 'bg-purple-500',
  '4': 'bg-red-500',
  '5': 'bg-yellow-500',
  '6': 'bg-orange-500',
  '7': 'bg-teal-500',
  '8': 'bg-gray-500',
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

export default function CalendarView() {
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
      const res = await fetch(`/api/calendar?timeMin=${timeMin}&timeMax=${timeMax}`)
      if (!res.ok) throw new Error('カレンダーの取得に失敗しました')
      const data = await res.json()
      setEvents(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

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
    <div className="flex gap-6">
      {/* カレンダー本体 */}
      <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {format(currentDate, 'yyyy年 M月', { locale: ja })}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchEvents(currentDate)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="更新"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              今日
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div className="px-6 py-2 bg-red-50 text-red-600 text-xs">{error}</div>
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
                  'min-h-[90px] p-1.5 border-b border-r border-gray-50 cursor-pointer transition-colors',
                  !isCurrentMonth && 'bg-gray-50/50',
                  isSelected && 'bg-blue-50',
                  !isSelected && isCurrentMonth && 'hover:bg-gray-50'
                )}
              >
                <div
                  className={clsx(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1',
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
                        'text-[10px] text-white px-1 py-0.5 rounded truncate',
                        EVENT_COLORS[event.colorId ?? 'default']
                      )}
                      title={event.summary}
                    >
                      {formatTime(event)} {event.summary}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">
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
      <div className="w-72 bg-white rounded-xl border border-gray-100 shadow-sm p-5 self-start sticky top-8">
        <h3 className="font-semibold text-gray-900 mb-4 text-sm">
          {selectedDay
            ? format(selectedDay, 'M月d日（EEE）', { locale: ja })
            : '日付を選択してください'}
        </h3>

        {!selectedDay && (
          <p className="text-xs text-gray-400 text-center py-8">
            カレンダーの日付をクリックすると<br />その日の予定が表示されます
          </p>
        )}

        {selectedDay && selectedDayEvents.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">
            この日の予定はありません
          </p>
        )}

        {selectedDayEvents.length > 0 && (
          <ul className="space-y-2">
            {selectedDayEvents.map((event) => (
              <li key={event.id} className="flex gap-2.5 items-start">
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    EVENT_COLORS[event.colorId ?? 'default']
                  )}
                />
                <div>
                  <p className="text-xs font-medium text-gray-800">{event.summary}</p>
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
