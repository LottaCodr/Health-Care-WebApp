"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between space-x-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-24" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="p-4 space-y-4 border border-border rounded-md shadow-sm"
                    >
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <section className="p-4 border border-border rounded-md shadow-sm">
                <Skeleton className="h-48 w-full" />
            </section>

            {/* Table/List */}
            <section className="p-4 border border-border rounded-md shadow-sm">
                <Skeleton className="h-6 w-40 mb-4" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex justify-between space-x-4">
                            <Skeleton className="h-5 w-1/3" />
                            <Skeleton className="h-5 w-1/6" />
                            <Skeleton className="h-5 w-1/6" />
                            <Skeleton className="h-5 w-1/6" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
