import { Sun } from 'lucide-react'

export default function KemmochiDiaryPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center">
          <Sun size={18} className="text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">剱持の日常</h1>
          <p className="text-gray-500 mt-0.5 text-sm">準備中です</p>
        </div>
      </div>

      <div className="text-center py-16 text-gray-300 text-sm border border-dashed border-gray-200 rounded-xl">
        このページは現在準備中です
      </div>
    </div>
  )
}
