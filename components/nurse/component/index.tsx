'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNurseTasks } from '@/actions/nursing-action/get.nurse.task';
import { Spinner } from '@/components/ui/spinner';
import { NursingAction } from '@/actions/nursing-action/types';
import NurseTasksTable from './nurse-task-table';
import { useAuth } from '@/context/auth-provider';
import { RefreshCw, AlertTriangle, ClipboardList } from 'lucide-react';

export default function NurseDashboard() {
    const { user } = useAuth();
    const nurseId = user?.$id;

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
            <div className="flex flex-col items-center justify-center h-60 gap-4 animate-fade-in">
                <Spinner size="lg" />
                <span className="text-red-500 text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-red-500 animate-pulse" />
                    Loading your tasks...
                </span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-60 gap-3 animate-fade-in">
                <AlertTriangle className="w-10 h-10 text-red-600 mb-1 animate-shake" />
                <span className="text-center text-red-700 font-bold text-lg">
                    Failed to load tasks.
                </span>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors px-5 py-2 text-white font-semibold shadow focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                    aria-label="Retry loading tasks"
                >
                    <RefreshCw className="w-5 h-5" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-8 bg-white rounded-3xl shadow-2xl border border-red-100 animate-fade-in">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-red-100 pb-7">
                <div className="flex items-center gap-4">
                    <div className="bg-red-100 rounded-xl p-2 flex items-center justify-center">
                        <ClipboardList className="w-9 h-9 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-red-700 tracking-tight drop-shadow">
                            My Task List
                        </h2>
                        <p className="text-red-400 mt-1 text-base font-medium">
                            Overview of my assigned patient care tasks
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

            <main>
                {nurseTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <ClipboardList className="w-20 h-20 text-red-100 mb-4" />
                        <span className="text-xl text-red-400 font-semibold">No assigned tasks</span>
                        <span className="text-base text-red-200 mt-1">You’re all caught up for now.</span>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-red-100 shadow bg-white overflow-x-auto">
                        <NurseTasksTable tasks={nurseTasks} refetch={refetch} />
                    </div>
                )}
            </main>
        </section>
    );
}
