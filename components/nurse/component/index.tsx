'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNurseTasks } from '@/actions/nursing-action/get.nurse.task';
import { Spinner } from '@/components/ui/spinner';
import { NursingAction } from '@/actions/nursing-action/types';
import NurseTasksTable from './nurse-task-table';
import { useAuth } from '@/context/auth-provider';
import { RefreshCw, AlertTriangle, ClipboardList, Smile, Sparkles } from 'lucide-react';

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

export default function NurseDashboard() {
    const { user } = useAuth();
    const nurseId = user?.$id;
    const nurseName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || "Nurse";

    const {
        data: nurseTasks = [],
        isPending,
        isError,
        refetch,
    } = useQuery<NursingAction[]>({
        queryKey: ['nurseTasks', nurseId],
        queryFn: () => getNurseTasks(nurseId!),
        enabled: !!nurseId,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    if (isPending) {
        return (
            <div className="flex flex-col items-center justify-center h-60 gap-4 animate-fade-in w-full">
                <Spinner size="lg" />
                <span className="text-red-500 text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-red-500 animate-pulse" />
                    Loading your tasks, {nurseName}...
                </span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-60 gap-3 animate-fade-in w-full">
                <AlertTriangle className="w-10 h-10 text-red-600 mb-1 animate-shake" />
                <span className="text-center text-red-700 font-bold text-lg">
                    Oops! Failed to load your tasks, {nurseName}.
                </span>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors px-5 py-2 text-white font-semibold shadow focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                    aria-label="Retry loading tasks"
                >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                </button>
                <span className="text-xs text-red-400 mt-1">If the problem persists, please contact support.</span>
            </div>
        );
    }

    return (
        <section className="w-full px-0 sm:px-0 py-10 space-y-8 bg-white rounded-3xl shadow-2xl border border-red-100 animate-fade-in relative overflow-hidden">
            {/* Subtle background accent */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 bg-pink-100/40 rounded-full blur-2xl opacity-40 z-0" />
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-red-100 pb-7 relative z-10 w-full px-4 sm:px-8">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-red-100 via-white to-red-50 rounded-xl p-3 flex items-center justify-center shadow-inner">
                        <ClipboardList className="w-10 h-10 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-red-700 tracking-tight drop-shadow flex items-center gap-2">
                            {getGreeting()}, <span className="capitalize">{nurseName}</span>!
                            <Sparkles className="w-6 h-6 text-pink-400 animate-fade-in-up" />
                        </h2>
                        <p className="text-red-400 mt-1 text-base font-medium flex items-center gap-2">
                            Here’s your personalized patient care task list.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors px-6 py-2.5 text-white font-semibold shadow focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                    aria-label="Refresh task list"
                >
                    <RefreshCw className="w-5 h-5" />
                    Refresh
                </button>
            </header>

            <main className="relative z-10 w-full px-4 sm:px-8">
                {nurseTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 w-full">
                        <Smile className="w-20 h-20 text-red-100 mb-4 animate-bounce" />
                        <span className="text-2xl text-red-400 font-bold">No assigned tasks</span>
                        <span className="text-base text-red-300 mt-1">You’re all caught up, {nurseName}! Enjoy a well-deserved break.</span>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-100 shadow bg-white overflow-x-auto w-full">
                        <NurseTasksTable tasks={nurseTasks} refetch={refetch} />
                    </div>
                )}
            </main>
            {/* Motivational footer */}
            <footer className="pt-6 border-t border-red-100 text-center text-red-400 text-sm font-medium relative z-10 w-full px-4 sm:px-8">
                Thank you for your dedication and compassionate care, <span className="text-red-600 font-semibold">{nurseName}</span>!
            </footer>
        </section>
    );
}
