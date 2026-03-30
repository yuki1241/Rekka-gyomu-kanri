import CalendarView from '@/components/schedule/CalendarView'

export default function SchedulePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">スケジュール</h1>
        <p className="text-gray-500 mt-1 text-sm">Googleカレンダーと連携しています</p>
      </div>
      <CalendarView />
    </div>
  )
}
