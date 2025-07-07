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
            <div className="flex flex-col items-center justify-center h-60 gap-4">
                <Spinner size="lg" />
                <span className="text-gray-500 text-lg font-medium flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-blue-500 animate-pulse" />
                    Loading your tasks...
                </span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center h-60 gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-1" />
                <span className="text-center text-red-600 font-semibold text-lg">
                    Failed to load tasks.
                </span>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors px-4 py-2 text-red-700 font-medium shadow focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                    aria-label="Retry loading tasks"
                >
                    <RefreshCw className="w-5 h-5" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <section className="max-w-auto mx-6 px-6 py-8 space-y-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-8 h-8 text-blue-600" aria-hidden="true" />
                    <div>
                        <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">
                            My Task List
                        </h2>
                        <p className="text-gray-500 mt-1 text-base">
                            Overview of my assigned patient care tasks
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-5 py-2 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Refresh task list"
                >
                    <RefreshCw className="w-5 h-5" />
                    Refresh
                </button>
            </header>

            <main>
                {nurseTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <ClipboardList className="w-16 h-16 text-gray-200 mb-4" />
                        <span className="text-lg text-gray-400 font-medium">No assigned tasks</span>
                        <span className="text-sm text-gray-300 mt-1">I’m all caught up for now.</span>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 shadow-sm bg-white">
                        <NurseTasksTable tasks={nurseTasks} refetch={refetch} />
                    </div>
                )}
            </main>
        </section>
    );
}
