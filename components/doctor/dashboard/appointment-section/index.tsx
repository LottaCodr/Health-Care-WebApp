"use client";

import React, { useEffect, useState } from 'react';
import { getRecentAppointmentList } from '@/lib/actions/appointment.action';
import { MdEventBusy } from 'react-icons/md';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './table/DataTable';
import { columns } from './table/columns';


export default function AppointmentSection() {
    const [appointments, setAppointments] = useState<any>(null);
    const [error, setError] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchAppointments() {
            try {
                const data = await getRecentAppointmentList();
                setAppointments(data);
            } catch (err) {
                setError(err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchAppointments();
    }, []);

    const isEmpty = appointments && appointments.documents?.length === 0;

    return (
        <section className="rounded-md border bg-background shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Recent Appointments</h2>
                <span className="text-xs text-muted-foreground">
                    Last updated: {new Date().toLocaleString()}
                </span>
            </div>

            {error && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Failed to load appointments. Please try again later.</span>
                </div>
            )}

            {isLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            )}

            {!isLoading && isEmpty && (
                <div className="flex flex-col items-center justify-center text-center py-8">
                    <MdEventBusy className="text-muted-foreground text-4xl mb-2" />
                    <p className="text-muted-foreground text-sm">No recent appointments found.</p>
                </div>
            )}

            {!isLoading && appointments && appointments.documents?.length > 0 && (
                <DataTable columns={columns} data={appointments.documents} />
            )}
        </section>
    );
}
