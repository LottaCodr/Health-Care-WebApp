"use client";

import React from "react";
import { SearchX } from "lucide-react";

export function EmptyState({
    title,
    description,
    icon,
}: {
    title: string;
    description: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="mb-6 p-6 bg-white rounded-full shadow-sm text-blue-600">
                {icon || <SearchX size={48} strokeWidth={1.5} />}
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">{title}</h3>
            <p className="text-gray-500 font-medium max-w-xs mx-auto">{description}</p>
        </div>
    );
}
