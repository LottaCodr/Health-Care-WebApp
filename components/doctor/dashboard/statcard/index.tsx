'use client';

import React from 'react';
import { MdLocalHospital, MdPeople, MdExitToApp, MdAssignment } from 'react-icons/md';
import StatCard from './stat-card';

/**
 * Statistics Cards Section Component
 * 
 * Displays key hospital metrics in a grid layout with static data.
 * Shows admitted patients, lab reports, waiting patients, and discharged patients.
 */

interface StatCardStyle {
    border: string;
    bg: string;
    ring: string;
    iconBg: string;
}

interface StatCardData {
    type: 'admitted' | 'staff' | 'discharged' | 'waiting';
    icon: React.ReactNode;
    label: string;
    count: number;
    comparison: string;
}

export default function StatCardsSection() {
    // Static data for hospital statistics
    const statistics = {
        admittedPatients: 20,
        labReports: 8,
        waitingPatients: 12,
        dischargedPatients: 35,
    };

    // Card styling configuration
    const cardStyles: StatCardStyle[] = [
        {
            border: "border-primary",
            bg: "bg-white dark:bg-red-900/30",
            ring: "focus-visible:ring-primary",
            iconBg: "bg-red-100",
        },
        {
            border: "border-primary",
            bg: "bg-white dark:bg-red-900/20",
            ring: "focus-visible:ring-primary",
            iconBg: "bg-red-100",
        },
        {
            border: "border-primary",
            bg: "bg-white dark:bg-primary/10",
            ring: "focus-visible:ring-primary",
            iconBg: "bg-red-100",
        },
        {
            border: "border-primary",
            bg: "bg-white dark:bg-primary/10",
            ring: "focus-visible:ring-primary",
            iconBg: "bg-red-100",
        },
    ];

    // Statistics cards data
    const statCards: StatCardData[] = [
        {
            type: 'admitted',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[0].iconBg}`}>
                    <MdLocalHospital className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Admitted Patients',
            count: statistics.admittedPatients,
            comparison: 'Currently receiving care',
        },
        {
            type: 'staff',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[1].iconBg}`}>
                    <MdAssignment className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Lab Reports',
            count: statistics.labReports,
            comparison: statistics.labReports > 0
                ? 'Lab results awaiting review'
                : 'No lab results available',
        },
        {
            type: 'waiting',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[2].iconBg}`}>
                    <MdPeople className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Waiting Patients',
            count: statistics.waitingPatients,
            comparison: 'Patients requiring attention',
        },
        {
            type: 'discharged',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[3].iconBg}`}>
                    <MdExitToApp className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Discharged Patients',
            count: statistics.dischargedPatients,
            comparison: 'Successfully treated this week',
        },
    ];

    return (
        <section
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            aria-label="Hospital statistics overview"
        >
            {statCards.map((card, index) => (
                <StatCard
                    key={`stat-card-${card.type}-${index}`}
                    type={card.type}
                    icon={card.icon}
                    label={card.label}
                    count={card.count}
                    comparison={card.comparison}
                />
            ))}
        </section>
    );
}