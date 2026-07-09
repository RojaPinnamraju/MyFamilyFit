import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  color?: string
  progress?: number
}

export function StatCard({ title, value, subtitle, icon, color = 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400', progress }: StatCardProps) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
