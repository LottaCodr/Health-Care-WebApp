import clsx from 'clsx'
import React, { ReactElement } from 'react'

interface StatCardProps {
  type: 'admitted' | 'staff' | 'discharged'
  icon: ReactElement
  label: string
  count: number
  comparison?: string
}

const StatCard = ({ type, icon, label, count = 0, comparison }: StatCardProps) => {
  return (
    <div
      className={clsx(
        'stat-card rounded-lg shadow-lg p-6 flex flex-col justify-between',
        {
          'bg-blue-700': type === 'admitted',
          'bg-green-700': type === 'staff',
          'bg-purple-700': type === 'discharged',
        }
      )}
      role="region"
      aria-label={label}
    >
      {/* Top: Icon and Label */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="icon-wrapper flex items-center justify-center rounded-full bg-white bg-opacity-20 p-3 text-white text-4xl"
          aria-hidden="true"
        >
          {icon}
        </div>
        <p className="text-white text-lg font-semibold tracking-wide">{label}</p>
      </div>

      {/* Middle: Count (Primary Focus) */}
      <h2
        className="text-white text-5xl font-extrabold tracking-tight mb-3"
        aria-live="polite"
      >
        {count.toLocaleString()}
      </h2>

      {/* Bottom: Comparison Text */}
      {comparison && (
        <p className="text-white text-sm opacity-70 font-medium tracking-wide">
          {comparison}
        </p>
      )}
    </div>
  )
}

export default StatCard
