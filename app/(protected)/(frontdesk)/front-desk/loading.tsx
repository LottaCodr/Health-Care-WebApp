"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="p-6 space-y-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-8 w-40 rounded" />
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="p-5 space-y-4 border border-border rounded-xl shadow-md bg-white/80 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center space-x-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded" />
                        </div>
                        <Skeleton className="h-10 w-3/4 rounded" />
                        <Skeleton className="h-4 w-1/2 rounded" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <section className="p-6 border border-border rounded-xl shadow-md bg-white/80">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-7 w-32 rounded" />
                    <Skeleton className="h-7 w-20 rounded" />
                </div>
                <Skeleton className="h-56 w-full rounded-lg" />
            </section>

            {/* Table/List */}
            <section className="p-6 border border-border rounded-xl shadow-md bg-white/80">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-7 w-40 rounded" />
                    <Skeleton className="h-7 w-24 rounded" />
                </div>
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-4 gap-4 mb-3">
                        <Skeleton className="h-5 w-full rounded" />
                        <Skeleton className="h-5 w-full rounded" />
                        <Skeleton className="h-5 w-full rounded" />
                        <Skeleton className="h-5 w-full rounded" />
                    </div>
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="grid grid-cols-4 gap-4 items-center">
                                <Skeleton className="h-5 w-full rounded" />
                                <Skeleton className="h-5 w-full rounded" />
                                <Skeleton className="h-5 w-full rounded" />
                                <Skeleton className="h-5 w-full rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
