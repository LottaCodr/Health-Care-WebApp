'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getNurseTasks } from '@/actions/nursing-action/get.nurse.task';
// import { Spinner } from '@/components/ui/spinner';
import { NursingAction } from '@/actions/nursing-action/types';
import NurseTasksTable from './nurse-task-table';
import { useAuth } from '@/context/auth-provider';


export default function NurseDashboard() {

    const { user } = useAuth()
    const nurseId = user?.$id
    const nurseName = user?.name
    console.log('the nurse Id', nurseId)
    console.log('the nurse NAME:', nurseName)

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

    // if (isPending) {
    //     return (
    //         <div className="flex justify-center items-center h-60 gap-4">
    //             <Spinner size="lg" /> Loading...
    //         </div>
    //     );
    // }

    // if (isError) {
    //     return (
    //         <div className="text-center text-red-500">
    //             Failed to load tasks.{' '}
    //             <button onClick={() => refetch()} className="underline">
    //                 Retry
    //             </button>
    //         </div>
    //     );
    // }

    return (
        <section className="max-w-5xl mx-6 px-6 py-8 space-y-8 bg-white rounded-2xl shadow-lg border border-gray-100">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">Nurse Task List</h2>
                    <p className="text-gray-500 mt-1 text-base">Overview of your assigned patient care tasks</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors px-5 py-2 text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Refresh task list"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5.07 19.07A9 9 0 1 1 19.07 5.07M23 4v6h-6" />
                    </svg>
                    Refresh
                </button>
            </header>

            <main>
                {nurseTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg text-gray-400 font-medium">No assigned tasks</span>
                        <span className="text-sm text-gray-300 mt-1">You’re all caught up for now.</span>
                    </div>
                ) : (
                    <div className="rounded-xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                        <NurseTasksTable tasks={nurseTasks} refetch={() => refetch()} />
                    </div>
                )}
            </main>
        </section>
    );
}
