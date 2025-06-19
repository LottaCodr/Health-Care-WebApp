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
        <div className="p-6 space-y-6">
            <HeaderComponent />

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Today's Appointments"
                    value={loadingAppointments ? '—' : String(appointments?.length || 0)}
                    icon={MdCalendarToday}
                />
                <DashboardCard
                    title="New Patients"
                    value={loadingPatients ? '—' : String(allPatients?.length || 0)}
                    icon={MdPersonAddAlt1}
                />
                <DashboardCard title="Total Visits" value="0" icon={MdPeople} />
                <DashboardCard title="Support Tickets" value="0" icon={MdSupportAgent} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Upcoming Appointments</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {loadingAppointments ? (
                            <ul className="space-y-3">
                                {[...Array(3)].map((_, index) => (
                                    <li
                                        key={`skeleton-${index}`}
                                        className="flex items-center justify-between border rounded-lg p-3 animate-pulse bg-muted/50"
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
                            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingAppointments.map((appt: Appointment) => (
                                    <li
                                        key={appt?.patient?.$id}
                                        className="flex items-center justify-between border rounded-lg p-3 hover:shadow-sm transition"
                                    >
                                        <span className="text-sm font-medium text-gray-700">
                                            {appt?.patient?.name} - {formatTime(appt?.patient?.$createdAt)}
                                        </span>
                                        <Button variant="outline" size="sm">
                                            Check In
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3">
                            <Button className="justify-between" variant="secondary" onClick={() => router.push('/front-desk/register')}>
                                Register New Patient <FiArrowRight className="ml-2" />
                            </Button>
                            <Button className="justify-between" variant="secondary" onClick={() => router.push('/front-desk/appointment-booking')}>
                                View All Appointments <FiArrowRight className="ml-2" />
                            </Button>
                            <Button className="justify-between" variant="secondary">
                                Open Ticket <FiArrowRight className="ml-2" />
                            </Button>
                        </div>
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
}: {
    title: string;
    value: string;
    icon: React.ElementType;
}) {
    return (
        <Card className="shadow-md border rounded-xl">
            <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-sm text-muted-foreground">{title}</div>
                    <div className="text-xl font-bold text-blue-900">{value}</div>
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
