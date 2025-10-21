"use client";

import React from "react";

export default function Loading({
    className = "w-6 h-6",
    label = "Loading...",
    overlay = false,
}: {
    className?: string;
    label?: string;
    overlay?: boolean;
}) {
    const spinner = (
        <span className="inline-flex flex-col items-center gap-2">
            <svg
                className={`animate-spin text-red-600 drop-shadow ${className}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 40 40"
                aria-hidden="true"
            >
                <circle
                    className="opacity-20"
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="currentColor"
                    strokeWidth="6"
                />
                <path
                    className="opacity-80"
                    fill="currentColor"
                    d="M36 20c0-8.837-7.163-16-16-16v6c5.523 0 10 4.477 10 10h6z"
                />
            </svg>
            <span className="text-xs text-gray-500 font-medium animate-pulse select-none">{label}</span>
        </span>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/60 transition-colors">
                {spinner}
            </div>
        );
    }

    return spinner;
}
