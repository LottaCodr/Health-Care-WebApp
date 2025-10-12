'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { FaUserDoctor, FaUserNurse, FaWallet, FaHospitalUser } from 'react-icons/fa6';

import { getAllPatients } from '@/actions/patients/get.patients';
import { fetchAppointments } from '@/actions/appointments/appointment.action';
import { NurseDashboardCard } from './card';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent } from '@/components/ui/card';

const personalizedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
};

export default function FrontDeskDashboardComponent() {
    const router = useRouter();
    const { user } = useAuth();

    /**
     * Fetch all patients via Supabase
     */
    const {
        data: allPatients = [],
        isPending: loadingPatients,
        isError: errorPatients,
    } = useQuery({
        queryKey: ['patients'],
        queryFn: getAllPatients,
        staleTime: 1000 * 60 * 2,
        select: (data) => Array.isArray(data) ? data : [],
    });

    /**
     * Fetch appointments (same logic as before)
     */
    const {
        data: appointments = [],
        isPending: loadingAppointments,
        isError: errorAppointments,
    } = useQuery({
        queryKey: ['appointments'],
        queryFn: fetchAppointments,
        staleTime: 1000 * 60 * 2,
        select: (data) => Array.isArray(data) ? data : [],
    });

    const upcomingAppointments = (appointments ?? []).slice(0, 3);

    const summaryData = [
        {
            waitingForRole: 'nurse',
            waitingForNumber: allPatients?.length || 0, // dynamic
            icon: <FaUserNurse className="w-10 h-10 text-primary" />,
        },
        {
            waitingForRole: 'doctor',
            waitingForNumber: upcomingAppointments.length,
            icon: <FaUserDoctor className="w-10 h-10 text-primary" />,
        },
        {
            waitingForRole: 'lab',
            waitingForNumber: 50,
            icon: <FaHospitalUser className="w-10 h-10 text-primary" />,
        },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 min-h-screen rounded-3xl">
            {/* Greeting */}
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-2">
                    {personalizedGreeting()}, {user?.name?.toUpperCase()}!
                </h2>
            </div>

            {/* Dashboard Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Add new patient */}
                <Card className="w-full max-w-sm bg-white">
                    <CardContent className="flex flex-col items-center justify-center gap-4 py-8 px-6 bg-white">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 mb-3 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <h1 className="text-center font-semibold text-xl md:text-2xl mb-1">
                            New Patient Registration
                        </h1>
                        <p className="text-center text-gray-500 font-semibold text-sm mb-4">
                            Quickly register a new patient into the system
                        </p>

                        <button
                            type="button"
                            className="p-3 text-white bg-primary transition rounded-lg w-full max-w-[220px] font-semibold shadow hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-red-400"
                            aria-label="Add patient"
                            onClick={() => router.push('/frontdesk/patient/new')}
                        >
                            Register Patient
                        </button>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                {summaryData.map((content, idx) => (
                    <NurseDashboardCard
                        key={idx}
                        icon={content.icon}
                        waitingForRole={content.waitingForRole}
                        waitingForNumber={content.waitingForNumber}
                    />
                ))}

                {/* Payments */}
                <Card className="w-full max-w-sm bg-white">
                    <CardContent className="flex flex-col gap-4 py-8 px-6 bg-white">
                        <div className="items-center justify-center">
                            <FaWallet className="w-10 h-10 text-primary mb-2" />
                            <p className="text-gray-500 font-semibold text-lg mb-4">Today's Payments</p>
                        </div>
                        <h1 className="font-semibold text-3xl md:text-6xl mb-1">$20,000</h1>
                        <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-green-600 text-white text-sm font-semibold w-fit">
                            <svg
                                className="w-4 h-4 mr-1.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l4 4 6-8" />
                            </svg>
                            Collected
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Patient Activity */}
            <h2 className="text-2xl md:text-3xl font-bold text-black flex items-center gap-2">
                Recent Patient Activity
            </h2>

            <div className="overflow-x-auto mt-6">
                {loadingPatients ? (
                    <p className="text-gray-500">Loading patients...</p>
                ) : errorPatients ? (
                    <p className="text-red-500">Error loading patients.</p>
                ) : (
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                                    Patient Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                                    Birth Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                                    Gender
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {allPatients.map((patient: any) => (
                                <tr key={patient.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {patient.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {patient.birth_date || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {patient.gender || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
