'use client';

import React from 'react';
import {
    MdCalendarToday,
    MdPeople,
    MdPersonAddAlt1,
    MdSupportAgent,
} from 'react-icons/md';
import { FiArrowRight } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { getAllPatients } from '@/actions/patients/get.patients';
import { fetchAppointments } from '@/actions/appointments/appointment.action';
import { Appointment } from '@/actions/appointments/types';
import { useRouter } from 'next/navigation';
import HeaderComponent from './header';

export default function FrontDeskDashboardComponent() {
    const {
        data: allPatients,
        isPending: loadingPatients,
        isError: errorPatients,
    } = useQuery({
        queryKey: ['patients'],
        queryFn: async () => {
            const res = await getAllPatients();
            return res;
        },
    });

    const {
        data: appointments,
        isPending: loadingAppointments,
        isError: errorAppointments,
    } = useQuery({
        queryKey: ['appointments'],
        queryFn: fetchAppointments,
    });

    const router = useRouter()

    const upcomingAppointments = (appointments ?? []).slice(0, 3);

    return (
        <div className="p-6 md:p-10 space-y-8 bg-gradient-to-br from-white via-red-50 to-red-100 min-h-screen rounded-3xl shadow-2xl">
            <HeaderComponent />

            {/* Dashboard Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Today's Appointments"
                    value={loadingAppointments ? '—' : String(appointments?.length || 0)}
                    icon={MdCalendarToday}
                    color="red"
                />
                <DashboardCard
                    title="New Patients"
                    value={loadingPatients ? '—' : String(allPatients?.length || 0)}
                    icon={MdPersonAddAlt1}
                    color="red"
                />
                <DashboardCard title="Total Visits" value="0" icon={MdPeople} color="red" />
                <DashboardCard title="Support Tickets" value="0" icon={MdSupportAgent} color="red" />
            </section>

            {/* Appointments & Quick Actions */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 shadow-lg border-0 bg-gradient-to-br from-white to-red-50 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-red-800 flex items-center gap-2">
                            <MdCalendarToday className="text-red-500" /> Upcoming Appointments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {loadingAppointments ? (
                            <ul className="space-y-3">
                                {[...Array(3)].map((_, index) => (
                                    <li
                                        key={`skeleton-${index}`}
                                        className="flex items-center justify-between border rounded-lg p-3 animate-pulse bg-red-100/40"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                                            <Skeleton className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                                        </div>
                                        <Skeleton className="h-8 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
                                    </li>
                                ))}
                                <span className="sr-only">Loading appointments...</span>
                            </ul>
                        ) : errorAppointments ? (
                            <p className="text-sm text-red-600">Failed to load appointments.</p>
                        ) : upcomingAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <MdCalendarToday className="text-4xl text-red-200 mb-2" />
                                <p className="text-base text-gray-500">No upcoming appointments.</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingAppointments.map((appt: Appointment) => (
                                    <li
                                        key={appt?.patient?.$id}
                                        className="flex items-center justify-between border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className="text-base font-semibold text-red-900">{appt?.patient?.name}</span>
                                            <span className="text-xs text-gray-500">{formatTime(appt?.patient?.$createdAt)}</span>
                                        </div>
                                        <Button variant="default" size="sm" className="bg-gradient-to-r from-red-700 to-red-500 text-white px-6 py-2 rounded-xl font-semibold shadow hover:from-red-800 hover:to-red-600">
                                            Check In
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-white rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-red-800 flex items-center gap-2">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col gap-4">
                        <Button className="justify-between bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500 transition" variant="default" onClick={() => router.push('/front-desk/register')}>
                            Register New Patient <FiArrowRight className="ml-2" />
                        </Button>
                        <Button className="justify-between bg-gradient-to-r from-red-500 to-red-300 text-white font-semibold rounded-xl shadow hover:from-red-600 hover:to-red-400 transition" variant="default" onClick={() => router.push('/front-desk/appointment-booking')}>
                            View All Appointments <FiArrowRight className="ml-2" />
                        </Button>
                        <Button className="justify-between bg-gradient-to-r from-red-400 to-red-200 text-red-900 font-semibold rounded-xl shadow hover:from-red-500 hover:to-red-300 transition" variant="secondary">
                            Open Ticket <FiArrowRight className="ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function DashboardCard({
    title,
    value,
    icon: Icon,
    color = "red",
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    color?: "red" | "blue";
}) {
    const colorClasses = color === "red"
        ? "bg-gradient-to-tr from-red-100 to-red-300 text-red-700"
        : "bg-gradient-to-tr from-blue-100 to-blue-300 text-blue-700";
    return (
        <Card className="shadow-xl border-0 rounded-2xl bg-white">
            <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-4 rounded-xl shadow ${colorClasses}`}>
                    <Icon className="w-7 h-7" />
                </div>
                <div>
                    <div className="text-sm text-gray-500 font-medium">{title}</div>
                    <div className="text-2xl font-extrabold text-red-900">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}

// Optional utility
function formatTime(dateTime: string): string {
    try {
        const d = new Date(dateTime);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
}
