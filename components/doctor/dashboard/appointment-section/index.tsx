"use client";

import React, { useEffect, useState } from 'react';
import { getRecentAppointmentList } from '@/actions/appointments/appointment.action';
import { MdEventBusy } from 'react-icons/md';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './table/DataTable';
import { columns } from './table/columns';

export default function AppointmentSection() {
    const [appointments, setAppointments] = useState<any>(null);
    const [error, setError] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>("");

    useEffect(() => {
        async function fetchAppointments() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getRecentAppointmentList();
                setAppointments(data);
                setLastUpdated(new Date().toLocaleString());
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
        <section className="rounded-xl border border-red-200 bg-white shadow-lg p-8 transition-all duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                    <span className="inline-block w-2 h-6 bg-red-500 rounded-full mr-2" />
                    Recent Appointments
                </h2>
                <span className="text-xs text-gray-400">
                    Last updated: {lastUpdated || <span className="italic text-gray-300">Loading...</span>}
                </span>
            </div>

            {error && (
                <div className="flex items-center space-x-3 text-base bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-4 animate-shake">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 font-medium">Failed to load appointments. Please try again later.</span>
                </div>
            )}

            {isLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-full rounded-lg bg-red-100" />
                    <Skeleton className="h-12 w-full rounded-lg bg-red-100" />
                    <Skeleton className="h-12 w-full rounded-lg bg-red-100" />
                </div>
            )}

            {!isLoading && isEmpty && (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <MdEventBusy className="text-red-300 text-6xl mb-3" />
                    <p className="text-gray-500 text-base font-medium">No recent appointments found.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-5 px-5 py-2 rounded-full bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition"
                    >
                        Refresh
                    </button>
                </div>
            )}

            {!isLoading && appointments && appointments.documents?.length > 0 && (
                <div className="rounded-lg border border-red-100 bg-red-50/30 p-2">
                    <DataTable columns={columns} data={appointments.documents} />
                </div>
            )}
        </section>
    );
}
