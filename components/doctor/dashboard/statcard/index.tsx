'use client'

import React from 'react';
import StatCardSkeleton from './skeleton';
import { MdLocalHospital, MdPeople, MdExitToApp } from 'react-icons/md';
import StatCard from './stat-card';
import { useQuery } from '@tanstack/react-query';
import { getAllStaffs } from '@/actions/appointments/staff/get.staff';
import { getAllPatients } from '@/actions/patients/get.patients';


export default function StatCardsSection() {

    const { data: allStaffs, isPending: loadingStaff, isError: staffError } = useQuery({
        queryKey: ['staffs'],
        queryFn: () => getAllStaffs()
    })

    const { data: allPatients, isPending: loadingAdmittedPatients, isError: staffAdmittedPatients } = useQuery({
        queryKey: ['patients'],
        queryFn: () => getAllPatients()
    })

    const numberofStaff = allStaffs?.length
    const numberOfAdmittedPatients = allPatients?.data?.filter((p) => p.status === 'admitted')?.length || 0;
    const numberOfDischargedPatients = allPatients?.data?.filter((p) => p.status === "discharged")?.length || 0;

    if (loadingStaff || loadingAdmittedPatients) {
        return (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCardSkeleton type="admitted" />
                <StatCardSkeleton type="staff" />
                <StatCardSkeleton type="discharged" />
            </section>
        );
    }

    if (staffError || staffAdmittedPatients) {
        return <div className="text-red-500">Failed to load stats. Please try again.</div>;
    }

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
                type="admitted"
                icon={<MdLocalHospital className="text-xl text-foreground" />}
                label="Admitted Patients"
                count={Number(numberOfAdmittedPatients)}
                comparison="↑ Compared to 2,300 last quarter"
            />
            <StatCard
                type="staff"
                icon={<MdPeople className="text-xl text-foreground" />}
                label="Staff on Duty"
                count={Number(numberofStaff)}
            />
            <StatCard
                type="discharged"
                icon={<MdExitToApp className="text-xl text-foreground" />}
                label="Discharged Patients"
                count={Number(numberOfDischargedPatients)}
                comparison="↑ Compared to 2,700 last quarter"
            />
        </section>
    );
}
