'use client';

import React, { useEffect, useState } from 'react';
import { MdLocalHospital, MdPeople, MdExitToApp, MdAssignment } from 'react-icons/md';
import StatCard from './stat-card';
import { getAllPatients } from '@/actions/front-desk/patients';

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

interface Stats {
    admitted: number;
    labReports: number;
    waiting: number;
    discharged: number;
}

export default function StatCardsSection() {
    const [stats, setStats] = useState<Stats>({
        admitted: 0,
        labReports: 0,
        waiting: 0,
        discharged: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const patients = await getAllPatients();
                // PatientStatus in Supabase uses kebab-case values
                setStats({
                    admitted: patients.filter((p) => {
                        const s = p.status as string;
                        return (
                            s === 'awaiting-consultation' ||
                            s === 'under-consultation' ||
                            s === 'sent-to-nurse' ||
                            s === 'sent-to-lab' ||
                            s === 'sent-to-pharmacy' ||
                            s === 'admitted' ||
                            s === 'under-observation'
                        );
                    }).length,
                    labReports: patients.filter((p) => (p.status as string) === 'sent-to-lab').length,
                    waiting: patients.filter((p) => (p.status as string) === 'awaiting-consultation').length,
                    discharged: patients.filter((p) => (p.status as string) === 'discharged').length,
                });
            } catch (err) {
                console.error('Failed to load patient stats:', err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    const cardStyles: StatCardStyle[] = [
        { border: 'border-primary', bg: 'bg-white dark:bg-red-900/30', ring: 'focus-visible:ring-primary', iconBg: 'bg-red-100' },
        { border: 'border-primary', bg: 'bg-white dark:bg-red-900/20', ring: 'focus-visible:ring-primary', iconBg: 'bg-red-100' },
        { border: 'border-primary', bg: 'bg-white dark:bg-primary/10', ring: 'focus-visible:ring-primary', iconBg: 'bg-red-100' },
        { border: 'border-primary', bg: 'bg-white dark:bg-primary/10', ring: 'focus-visible:ring-primary', iconBg: 'bg-red-100' },
    ];

    const statCards: StatCardData[] = [
        {
            type: 'admitted',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[0].iconBg}`}>
                    <MdLocalHospital className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Admitted Patients',
            count: stats.admitted,
            comparison: loading ? 'Loading...' : 'Currently active in care',
        },
        {
            type: 'staff',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[1].iconBg}`}>
                    <MdAssignment className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Awaiting Lab Results',
            count: stats.labReports,
            comparison: loading
                ? 'Loading...'
                : stats.labReports > 0
                    ? 'Lab results awaiting review'
                    : 'No pending lab requests',
        },
        {
            type: 'waiting',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[2].iconBg}`}>
                    <MdPeople className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Waiting for Consultation',
            count: stats.waiting,
            comparison: loading ? 'Loading...' : 'Patients in queue',
        },
        {
            type: 'discharged',
            icon: (
                <span className={`inline-flex items-center justify-center rounded-xl p-3 ${cardStyles[3].iconBg}`}>
                    <MdExitToApp className="text-2xl text-primary" aria-hidden="true" />
                </span>
            ),
            label: 'Discharged Patients',
            count: stats.discharged,
            comparison: loading ? 'Loading...' : 'Successfully treated',
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