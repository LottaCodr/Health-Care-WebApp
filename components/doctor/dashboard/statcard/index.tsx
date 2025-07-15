'use client'

import React from 'react';
import StatCardSkeleton from './skeleton';
import { MdLocalHospital, MdPeople, MdExitToApp } from 'react-icons/md';
import StatCard from './stat-card';
import { useQuery } from '@tanstack/react-query';
import { getAllStaffs } from '@/actions/staff/get.staff';
import { getAllPatients } from '@/actions/patients/get.patients';

export default function StatCardsSection() {
    const {
        data: allStaffs,
        isPending: loadingStaff,
        isError: staffError,
        refetch: refetchStaffs,
    } = useQuery({
        queryKey: ['staffs'],
        queryFn: () => getAllStaffs(),
        staleTime: 1000 * 60 * 5,
    });

    const {
        data: allPatients,
        isPending: loadingPatients,
        isError: patientsError,
        refetch: refetchPatients,
    } = useQuery({
        queryKey: ['patients'],
        queryFn: () => getAllPatients(),
        staleTime: 1000 * 60 * 5,
    });

    const numberOfStaff = allStaffs?.length ?? 0;
    const numberOfAdmittedPatients = allPatients?.filter((p) => p.status === 'admitted')?.length ?? 0;
    const numberOfDischargedPatients = allPatients?.filter((p) => p.status === "discharged")?.length ?? 0;

    // Improved error handling with retry
    if (staffError || patientsError) {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <div className="text-red-600 font-semibold text-lg mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                    </svg>
                    Failed to load stats. Please try again.
                </div>
                <button
                    onClick={() => {
                        refetchStaffs();
                        refetchPatients();
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (loadingStaff || loadingPatients) {
        return (
            <section
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                aria-label="Loading statistics"
            >
                <StatCardSkeleton type="admitted" />
                <StatCardSkeleton type="staff" />
                <StatCardSkeleton type="discharged" />
            </section>
        );
    }

    // Card color accents
    const cardStyles = [
        {
            border: "border-red-500",
            bg: "bg-white dark:bg-red-900/30",
            ring: "focus-visible:ring-red-500",
            iconBg: "bg-red-100 text-red-600",
        },
        {
            border: "border-red-400",
            bg: "bg-white dark:bg-red-900/20",
            ring: "focus-visible:ring-red-400",
            iconBg: "bg-red-50 text-red-500",
        },
        {
            border: "border-red-300",
            bg: "bg-white dark:bg-red-900/10",
            ring: "focus-visible:ring-red-300",
            iconBg: "bg-red-50 text-red-400",
        },
    ];

    return (
        <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            aria-label="Statistics overview"
        >
            <StatCard
                type="admitted"
                icon={
                    <span className={`inline-flex items-center justify-center rounded-full p-3 shadow ${cardStyles[0].iconBg}`}>
                        <MdLocalHospital className="text-2xl" />
                    </span>
                }
                label="Admitted Patients"
                count={numberOfAdmittedPatients}
                comparison={"↑ Compared to 2,300 last quarter"}
            // Removed className prop as it is not accepted by StatCardProps
            />
            <StatCard
                type="staff"
                icon={
                    <span className={`inline-flex items-center justify-center rounded-full p-3 shadow ${cardStyles[1].iconBg}`}>
                        <MdPeople className="text-2xl" />
                    </span>
                }
                label="Staff on Duty"
                count={numberOfStaff}
                // Removed countClassName and comparisonClassName as they are not accepted by StatCardProps
                comparison={
                    numberOfStaff > 0
                        ? "All staff currently on shift"
                        : "No staff on duty"
                }
            // Removed className prop as it is not accepted by StatCardProps
            />
            <StatCard
                type="discharged"
                icon={
                    <span className={`inline-flex items-center justify-center rounded-full p-3 shadow ${cardStyles[2].iconBg}`}>
                        <MdExitToApp className="text-2xl" />
                    </span>
                }
                label="Discharged Patients"
                count={numberOfDischargedPatients}
                comparison={"↑ Compared to 2,700 last quarter"}
            // Removed className prop as it is not accepted by StatCardProps
            />
        </section>
    );
}
