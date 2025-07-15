"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="p-6 sm:p-8 space-y-8 bg-gradient-to-br from-red-50 via-white to-red-100 min-h-screen animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-red-100 p-2">
                        <Skeleton className="h-8 w-8 rounded-full bg-red-200" />
                    </div>
                    <Skeleton className="h-8 w-48 rounded-md bg-red-200" />
                </div>
                <Skeleton className="h-8 w-28 rounded-md bg-red-200" />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="p-5 space-y-4 border-l-4 border-red-200 bg-white/90 rounded-2xl shadow-md hover:shadow-lg transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-red-100 p-3">
                                <Skeleton className="h-8 w-8 rounded-full bg-red-200" />
                            </div>
                            <Skeleton className="h-5 w-20 rounded bg-red-100" />
                        </div>
                        <Skeleton className="h-10 w-2/3 rounded bg-red-200" />
                        <Skeleton className="h-4 w-1/3 rounded bg-red-100" />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <section className="p-6 border border-red-100 bg-white/90 rounded-2xl shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-32 rounded bg-red-100" />
                    <Skeleton className="h-6 w-16 rounded bg-red-100" />
                </div>
                <Skeleton className="h-52 w-full rounded-lg bg-red-200" />
            </section>

            {/* Table/List */}
            <section className="p-6 border border-red-100 bg-white/90 rounded-2xl shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-40 rounded bg-red-100" />
                    <Skeleton className="h-6 w-20 rounded bg-red-100" />
                </div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-1/3 rounded bg-red-100" />
                            <Skeleton className="h-5 w-1/6 rounded bg-red-100" />
                            <Skeleton className="h-5 w-1/6 rounded bg-red-100" />
                            <Skeleton className="h-5 w-1/6 rounded bg-red-100" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
