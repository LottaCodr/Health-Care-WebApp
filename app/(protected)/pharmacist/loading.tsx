"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <main className="p-6 space-y-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between space-x-4 mb-2">
                <div className="flex items-center space-x-3">
                    <div className="rounded-full bg-red-500/20 p-2">
                        <Skeleton className="h-10 w-10 rounded-full bg-red-500/40" />
                    </div>
                    <Skeleton className="h-8 w-48 bg-red-500/30" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg bg-red-500/30" />
            </header>

            {/* Stats cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="p-5 space-y-4 border-2 border-red-200 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
                    >
                        <Skeleton className="h-6 w-24 bg-red-500/20" />
                        <Skeleton className="h-10 w-full bg-red-500/10" />
                        <div className="flex justify-end">
                            <Skeleton className="h-4 w-8 rounded bg-red-500/30" />
                        </div>
                    </div>
                ))}
            </section>

            {/* Chart */}
            <section className="p-6 border-2 border-red-200 bg-white rounded-xl shadow-md">
                <div className="flex items-center mb-4">
                    <Skeleton className="h-6 w-32 bg-red-500/20 mr-4" />
                    <Skeleton className="h-4 w-16 bg-red-500/10" />
                </div>
                <Skeleton className="h-56 w-full rounded-lg bg-red-500/10" />
            </section>

            {/* Table/List */}
            <section className="p-6 border-2 border-red-200 bg-white rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <Skeleton className="h-6 w-40 bg-red-500/20" />
                    <Skeleton className="h-8 w-24 rounded bg-red-500/20" />
                </div>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between space-x-4 px-2 py-3 rounded-lg bg-red-50/60 hover:bg-red-100/60 transition-colors"
                        >
                            <Skeleton className="h-5 w-1/3 bg-red-500/10" />
                            <Skeleton className="h-5 w-1/6 bg-red-500/10" />
                            <Skeleton className="h-5 w-1/6 bg-red-500/10" />
                            <Skeleton className="h-5 w-1/6 bg-red-500/10" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
