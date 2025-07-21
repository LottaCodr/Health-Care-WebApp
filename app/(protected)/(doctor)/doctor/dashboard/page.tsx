
"use client";

import React from "react";
import DashBoardComponent from "@/components/doctor";
import { Separator } from "@/components/ui/separator";
import { MdDashboard } from "react-icons/md";

const DashboardPage = () => {
    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex flex-col items-center py-6 md:py-10">
            <header className="w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between mb-8 md:mb-10 px-2 sm:px-6 md:px-10 gap-4 sm:gap-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <span className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-tr from-red-200 via-red-100 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 p-4 md:p-5 shadow-xl border-2 border-red-200 dark:border-gray-700">
                        <MdDashboard className="text-3xl md:text-4xl text-red-600 drop-shadow-lg" />
                    </span>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-red-700 dark:text-red-200 tracking-tight drop-shadow">
                            Doctor Dashboard
                        </h1>
                        <p className="text-sm md:text-base text-red-500 dark:text-red-300 font-medium mt-2 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                            {getGreeting()}, <span className="font-semibold text-red-700 dark:text-red-200">Doctor</span>!
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span className="inline-block bg-gradient-to-r from-red-100 via-white to-red-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 text-red-700 dark:text-red-200 px-4 md:px-5 py-2 rounded-xl font-semibold shadow border border-red-200 dark:border-gray-700 text-sm md:text-base">
                        Welcome, Doctor
                    </span>
                    <span className="text-xs text-red-400 dark:text-red-300 font-medium">
                        Last login: {new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                </div>
            </header>
            <section className="w-full max-w-7xl">
                <Separator className="bg-red-200 dark:bg-gray-700 mb-6 md:mb-8" />
                <div className="rounded-3xl bg-white/95 dark:bg-gray-900 shadow-2xl border-2 border-red-100 dark:border-gray-700 p-4 sm:p-8 md:p-12 min-h-[60vh] transition-all hover:shadow-red-200/60 hover:scale-[1.01] duration-200">
                    <DashBoardComponent />
                </div>
            </section>
        </main>
    );
};

export default DashboardPage;