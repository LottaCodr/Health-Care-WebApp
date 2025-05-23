import React from 'react';
import StatCardSkeleton from './skeleton';
import { MdLocalHospital, MdPeople, MdExitToApp } from 'react-icons/md';
import StatCard from './stat-card';

interface StatCardsSectionProps {
    isLoading: boolean;
}

export default function StatCardsSection({ isLoading }: StatCardsSectionProps) {
    if (isLoading) {
        return (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCardSkeleton type="admitted" />
                <StatCardSkeleton type="staff" />
                <StatCardSkeleton type="discharged" />
            </section>
        );
    }

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
                type="admitted"
                icon={<MdLocalHospital className="text-xl text-foreground" />}
                label="Admitted Patients"
                count={3500}
                comparison="↑ Compared to 2,300 last quarter"
            />
            <StatCard
                type="staff"
                icon={<MdPeople className="text-xl text-foreground" />}
                label="Staff on Duty"
                count={120}
            />
            <StatCard
                type="discharged"
                icon={<MdExitToApp className="text-xl text-foreground" />}
                label="Discharged Patients"
                count={3100}
                comparison="↑ Compared to 2,700 last quarter"
            />
        </section>
    );
}
