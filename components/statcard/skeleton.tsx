import React from 'react'
import clsx from 'clsx'
import { Skeleton } from '../ui/skeleton'

interface StatCardSkeletonProps {
    type: 'admitted' | 'staff' | 'discharged'
}

const StatCardSkeleton = ({ type }: StatCardSkeletonProps) => {
    return (
        <div
            className={clsx(
                'stat-card p-6 rounded-lg shadow-md flex flex-col',
                {
                    'bg-blue-600': type === 'admitted',
                    'bg-green-600': type === 'staff',
                    'bg-purple-600': type === 'discharged',
                }
            )}
            aria-busy="true"
            aria-label="Loading statistics"
            role="status"
        >
            <div className="flex items-center gap-4 mb-3">
                <Skeleton className="w-8 h-8 rounded" />
                <Skeleton className="w-16 h-8 rounded" />
            </div>
            <Skeleton className="w-24 h-5 mb-1 rounded" />
            <Skeleton className="w-32 h-4 rounded" />
        </div>
    )
}

export default StatCardSkeleton
