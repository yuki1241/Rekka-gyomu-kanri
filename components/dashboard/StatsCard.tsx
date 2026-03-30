import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatsCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5 flex items-center gap-4 shadow-sm">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', iconBgColor)}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
