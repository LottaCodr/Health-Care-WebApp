"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import DashBoardComponent from "@/components/doctor";
import { useAuth } from "@/context/auth-provider";
import { Loader2, Stethoscope, CalendarDays, Bell } from "lucide-react";

const DashboardPage: React.FC = () => {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !user) router.push("/login");
    }, [user, isLoading, router]);

    // ── Loading ──
    if (isLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">Loading your dashboard</p>
                        <p className="text-xs text-gray-400 mt-1">Please wait a moment...</p>
                    </div>
                </div>
            </main>
        );
    }

    if (!user) return null;

    const formattedRole = user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Staff";

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    })();

    const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
    });

    return (
        <main className="min-h-screen w-full bg-gray-50/60">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Header ── */}
                <header className="bg-white rounded-3xl border border-gray-100 shadow-sm px-7 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                    {/* Left — greeting */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                            <Stethoscope size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">
                                {greeting}
                            </p>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">
                                {formattedRole} {user.name || ""}
                            </h1>
                            <p className="text-sm text-gray-400 mt-0.5">
                                Here&apos;s what&apos;s happening with your patients today.
                            </p>
                        </div>
                    </div>

                    {/* Right — date + notifications */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-500 font-medium">
                            <CalendarDays size={15} className="text-gray-400" />
                            {today}
                        </div>
                        <button className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-colors">
                            <Bell size={16} className="text-gray-500" />
                            {/* notification dot */}
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                        </button>
                    </div>
                </header>

                {/* ── Dashboard content ── */}
                <section className="w-full">
                    <DashBoardComponent />
                </section>
            </div>
        </main>
    );
};

export default DashboardPage;