import clsx from 'clsx';
import React, { ReactElement } from 'react';

interface StatCardProps {
  type: 'admitted' | 'staff' | 'discharged' | 'income' | 'expenses';
  icon: ReactElement;
  label: string;
  count: number;
  comparison?: string;
}

const StatCard = ({ type, icon, label, count = 0, comparison }: StatCardProps) => {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6 shadow-xl transition-transform duration-300 hover:scale-[1.02] flex flex-col justify-between gap-4',
        {
          'bg-blue-700': type === 'admitted',
          'bg-green-700': type === 'staff',
          'bg-purple-700': type === 'discharged',
          'bg-emerald-700': type === 'income',
          'bg-rose-700': type === 'expenses',
        }
      )}
      role="region"
      aria-label={label}
    >
      {/* Top: Icon and Label */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-white/20 text-white text-3xl">
          {icon}
        </div>
        <div>
          <p className="text-white text-sm font-medium uppercase tracking-wide opacity-90">
            {label}
          </p>
        </div>
      </div>

      {/* Middle: Count */}
      <h2
        className="text-white text-5xl font-extrabold tracking-tight leading-snug"
        aria-live="polite"
      >
        {count.toLocaleString()}
      </h2>

      {/* Bottom: Comparison */}
      {comparison && (
        <p className="text-white text-sm font-light opacity-80 tracking-wide">
          {comparison}
        </p>
      )}
    </div>
  );
};

export default StatCard;
