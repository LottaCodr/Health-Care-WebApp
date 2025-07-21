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

const personalizedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
};

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

    const router = useRouter();

    const upcomingAppointments = (appointments ?? []).slice(0, 3);

    return (
        <div className="p-4 md:p-10 space-y-10 bg-gradient-to-br from-white via-red-50 to-red-100 min-h-screen rounded-3xl shadow-2xl">
            <HeaderComponent />

            {/* Personalized Greeting */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-red-800 flex items-center gap-2">
                        {personalizedGreeting()}, Front Desk!
                        <span className="ml-2 text-lg font-normal text-red-500">👋</span>
                    </h2>
                    <p className="text-gray-600 mt-1 text-base">
                        Here’s a quick overview of today’s activity. Let’s make every patient feel welcome!
                    </p>
                </div>
                <div className="flex gap-2 mt-2 md:mt-0">
                    <Button
                        className="bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500 transition flex items-center px-5 py-2"
                        onClick={() => router.push('/front-desk/register')}
                    >
                        <MdPersonAddAlt1 className="mr-2" /> Register Patient
                    </Button>
                    <Button
                        className="bg-gradient-to-r from-red-500 to-red-300 text-white font-semibold rounded-xl shadow hover:from-red-600 hover:to-red-400 transition flex items-center px-5 py-2"
                        onClick={() => router.push('/front-desk/appointment-booking')}
                    >
                        <MdCalendarToday className="mr-2" /> Book Appointment
                    </Button>
                </div>
            </div>

            {/* Dashboard Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    title="Today's Appointments"
                    value={loadingAppointments ? undefined : String(appointments?.length || 0)}
                    loading={loadingAppointments}
                    icon={MdCalendarToday}
                    color="red"
                    description="Total appointments scheduled for today"
                />
                <DashboardCard
                    title="New Patients"
                    value={loadingPatients ? undefined : String(allPatients?.length || 0)}
                    loading={loadingPatients}
                    icon={MdPersonAddAlt1}
                    color="red"
                    description="Patients registered today"
                />
                <DashboardCard
                    title="Total Visits"
                    value={appointments ? String(appointments.length) : "0"}
                    icon={MdPeople}
                    color="red"
                    description="All visits (appointments) today"
                />
                <DashboardCard
                    title="Support Tickets"
                    value="0"
                    icon={MdSupportAgent}
                    color="red"
                    description="Open support requests"
                />
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
                            <div className="flex flex-col items-center justify-center py-8">
                                <span className="text-2xl text-red-600 font-semibold mb-2">Error</span>
                                <p className="text-sm text-red-600">Failed to load appointments.</p>
                                <Button
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => window.location.reload()}
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : upcomingAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <MdCalendarToday className="text-4xl text-red-200 mb-2" />
                                <p className="text-base text-gray-500">No upcoming appointments.</p>
                                <Button
                                    variant="ghost"
                                    className="mt-4 text-red-700 hover:bg-red-100"
                                    onClick={() => router.push('/front-desk/appointment-booking')}
                                >
                                    Book Appointment
                                </Button>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingAppointments.map((appt: Appointment) => (
                                    <li
                                        key={appt?.patient?.$id}
                                        className="flex items-center justify-between border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-200 to-red-400 flex items-center justify-center text-red-700 font-bold text-xl uppercase shadow-inner border-2 border-white">
                                                {appt?.patient?.name?.[0] || "?"}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-base font-semibold text-red-900">{appt?.patient?.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatTime(appt?.patient?.$createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="bg-gradient-to-r from-red-700 to-red-500 text-white px-6 py-2 rounded-xl font-semibold shadow hover:from-red-800 hover:to-red-600 transition group-hover:scale-105"
                                            onClick={() => router.push(`/front-desk/queue?checkin=${appt?.patient?.$id}`)}
                                        >
                                            Check In
                                        </Button>
                                    </li>
                                ))}
                                {appointments && appointments.length > 3 && (
                                    <li className="flex justify-end mt-2">
                                        <Button
                                            variant="ghost"
                                            className="text-red-700 hover:bg-red-100"
                                            onClick={() => router.push('/front-desk/appointment-booking')}
                                        >
                                            View All Appointments <FiArrowRight className="ml-2" />
                                        </Button>
                                    </li>
                                )}
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
                        <Button
                            className="justify-between bg-gradient-to-r from-red-600 to-red-400 text-white font-semibold rounded-xl shadow hover:from-red-700 hover:to-red-500 transition flex items-center px-5 py-3 text-lg"
                            variant="default"
                            onClick={() => router.push('/front-desk/register')}
                        >
                            <span>Register New Patient</span>
                            <FiArrowRight className="ml-2" />
                        </Button>
                        <Button
                            className="justify-between bg-gradient-to-r from-red-500 to-red-300 text-white font-semibold rounded-xl shadow hover:from-red-600 hover:to-red-400 transition flex items-center px-5 py-3 text-lg"
                            variant="default"
                            onClick={() => router.push('/front-desk/appointment-booking')}
                        >
                            <span>View All Appointments</span>
                            <FiArrowRight className="ml-2" />
                        </Button>
                        <Button
                            className="justify-between bg-gradient-to-r from-red-400 to-red-200 text-red-900 font-semibold rounded-xl shadow hover:from-red-500 hover:to-red-300 transition flex items-center px-5 py-3 text-lg"
                            variant="secondary"
                            onClick={() => router.push('/front-desk/support')}
                        >
                            <span>Open Ticket</span>
                            <FiArrowRight className="ml-2" />
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
    loading = false,
    description,
}: {
    title: string;
    value?: string;
    icon: React.ElementType;
    color?: "red" | "blue";
    loading?: boolean;
    description?: string;
}) {
    const colorClasses = color === "red"
        ? "bg-gradient-to-tr from-red-100 to-red-300 text-red-700"
        : "bg-gradient-to-tr from-blue-100 to-blue-300 text-blue-700";
    return (
        <Card className="shadow-xl border-0 rounded-2xl bg-white hover:scale-[1.03] transition-transform duration-200">
            <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-4 rounded-xl shadow ${colorClasses} flex items-center justify-center`}>
                    <Icon className="w-8 h-8" />
                </div>
                <div>
                    <div className="text-base text-gray-700 font-semibold">{title}</div>
                    {loading ? (
                        <Skeleton className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
                    ) : (
                        <div className="text-3xl font-extrabold text-red-900">{value ?? '—'}</div>
                    )}
                    {description && (
                        <div className="text-xs text-gray-400 mt-1">{description}</div>
                    )}
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
