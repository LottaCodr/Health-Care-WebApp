"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { useAuth } from "@/context/auth-provider";

const TONES = {
    blue: { icon: "bg-blue-50 text-blue-700 ring-blue-100", glow: "bg-blue-100/70" },
    red: { icon: "bg-red-50 text-red-700 ring-red-100", glow: "bg-red-100/70" },
    teal: { icon: "bg-teal-50 text-teal-700 ring-teal-100", glow: "bg-teal-100/70" },
    indigo: { icon: "bg-indigo-50 text-indigo-700 ring-indigo-100", glow: "bg-indigo-100/70" },
    violet: { icon: "bg-violet-50 text-violet-700 ring-violet-100", glow: "bg-violet-100/70" },
    cyan: { icon: "bg-cyan-50 text-cyan-700 ring-cyan-100", glow: "bg-cyan-100/70" },
    amber: { icon: "bg-amber-50 text-amber-700 ring-amber-100", glow: "bg-amber-100/70" },
} as const;

type DashboardHeaderProps = {
    title: string;
    description: string;
    icon: React.ElementType;
    tone?: keyof typeof TONES;
    actions?: React.ReactNode;
};

function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export function DashboardHeader({
    title,
    description,
    icon: Icon,
    tone = "blue",
    actions,
}: DashboardHeaderProps) {
    const { user } = useAuth();
    const colors = TONES[tone];
    const firstName = String(user?.name ?? user?.full_name ?? "Staff").trim().split(/\s+/)[0];
    const today = new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (
        <header className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:rounded-3xl sm:px-6 sm:py-5">
            <div aria-hidden="true" className={`absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl ${colors.glow}`} />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${colors.icon}`}>
                        <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                        <p suppressHydrationWarning className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                            {greeting()}, {firstName}
                        </p>
                        <h1 className="mt-0.5 text-lg font-black tracking-tight text-gray-950 sm:text-xl">{title}</h1>
                        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 sm:text-sm">{description}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                    <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3 text-xs font-semibold text-gray-500">
                        <CalendarDays size={14} className="text-gray-400" />
                        <time suppressHydrationWarning>{today}</time>
                    </div>
                    {actions}
                </div>
            </div>
        </header>
    );
}
