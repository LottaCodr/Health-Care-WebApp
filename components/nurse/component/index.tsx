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
        <section className="max-w-6xl mx-auto p-6 space-y-6">
            <header className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Nurse Task List</h2>
                <button onClick={() => refetch()} className="text-sm underline">
                    Refresh
                </button>
            </header>

            {nurseTasks.length === 0 ? (
                <div className="text-center text-muted-foreground">No assigned tasks.</div>
            ) : (
                <NurseTasksTable tasks={nurseTasks} refetch={() => refetch()} />
            )}
        </section>
    );
}
