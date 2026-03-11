"use client";

import React from "react";

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-6">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm animate-pulse">
                    <div className="flex gap-4 items-center mb-6">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-50 rounded w-1/4"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="h-10 bg-gray-50 rounded-2xl w-full"></div>
                        <div className="h-10 bg-gray-50 rounded-2xl w-full"></div>
                        <div className="h-10 bg-gray-50 rounded-2xl w-full col-span-2"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
