'use client';

import React from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import {  PatientStatus } from '@/context/patients/types';
import { calculateAge, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Droplets, AlertTriangle, Pill,
    Calendar, ChevronRight, HeartPulse,
} from 'lucide-react';
import { Patient } from '@/types/models';

interface PatientsTableProps {
    patients: Patient[];
    isPending: boolean;
    currentPage: number;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
    'registered': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
    'awaiting-consultation': { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
    'under-consultation': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
    'sent-to-nurse': { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
    'sent-to-lab': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'sent-to-pharmacy': { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
    'awaiting-payment': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
    'admitted': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'under-observation': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
    'discharged': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    'no-status': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['no-status'];
    const label = status.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
    return (
        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', cfg.bg, cfg.text)}>
            <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {label}
        </span>
    );
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

// ─── Role → route map ─────────────────────────────────────────────────────────

const ROLE_ROUTES: Record<string, (id: string) => string> = {
    Doctor: (id) => `/doctor/patients/${id}`,
    Nurse: (id) => `/nurse/queue/patient/${id}`,
    LabTechnician: (id) => `/lab-tech/requests/patient/${id}`,
    Pharmacist: (id) => `/pharmacist/queue/patient/${id}`,
};

// ─── Component ────────────────────────────────────────────────────────────────

const PatientsTable: React.FC<PatientsTableProps> = ({ patients, isPending }) => {
    const router = useRouter();
    const { user } = useAuth();
    const queryClient = useQueryClient();


    const handleClick = (id: string) => {
        const route = user?.role ? ROLE_ROUTES[user.role]?.(id) : null;
        if (route) router.push(route);
    };

    // ── Loading ──
    if (isPending && patients.length === 0) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-200" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                                <div className="h-2.5 bg-gray-200 rounded-full w-1/2" />
                            </div>
                        </div>
                        <div className="space-y-2 pt-1">
                            <div className="h-2.5 bg-gray-200 rounded-full w-full" />
                            <div className="h-2.5 bg-gray-200 rounded-full w-5/6" />
                            <div className="h-2.5 bg-gray-200 rounded-full w-4/6" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ── Grid ──
    return (
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <AnimatePresence>
                {patients.map((patient) => {
                    const patientId = patient.id!;
                    const gender = (patient.gender ?? '').toLowerCase();
                    const isFemale = gender === 'female';
                    
    const prefetch = () => {
        queryClient.prefetchQuery({
            queryKey: ["patient", patient.id],
            queryFn: () => getPatientId(patient.id),
            staleTime: 30_000,
        })
    }

                    return (
                        <motion.div
                        onMouseEnter={prefetch}
                            key={patientId}
                            variants={cardVariants as any}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            tabIndex={0}
                            role="button"
                            aria-label={`View details for ${patient.name}`}
                            onClick={() => handleClick(patientId)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(patientId)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 cursor-pointer outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-150 overflow-hidden"
                        >
                            {/* Coloured top strip based on gender */}
                            <div className={clsx(
                                'h-1 w-full',
                                isFemale ? 'bg-pink-400' : 'bg-blue-500'
                            )} />

                            <div className="p-5 flex flex-col gap-4 flex-1">

                                {/* ── Top row: avatar + name + status ── */}
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={clsx(
                                        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                                        isFemale ? 'bg-pink-50' : 'bg-blue-50'
                                    )}>
                                        <User size={18} className={isFemale ? 'text-pink-500' : 'text-blue-600'} />
                                    </div>

                                    {/* Name + meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate leading-tight" title={patient.name ?? ''}>
                                            {patient.name ?? <span className="italic text-gray-400">Unknown</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {patient.gender && (
                                                <span className={clsx(
                                                    'text-xs font-semibold',
                                                    isFemale ? 'text-pink-500' : 'text-blue-500'
                                                )}>
                                                    {patient.gender}
                                                </span>
                                            )}
                                            {patient.date_of_birth && (
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {calculateAge(patient.date_of_birth)} yrs
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chevron */}
                                    <ChevronRight
                                        size={15}
                                        className="text-gray-200 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5"
                                    />
                                </div>

                                {/* ── Divider ── */}
                                <div className="border-t border-gray-50" />

                                {/* ── Info rows ── */}
                                <div className="space-y-2.5">
                                    <InfoRow icon={<Calendar size={13} className="text-gray-400" />}>
                                        {patient.created_at
                                            ? formatDate(patient.created_at)
                                            : <span className="italic text-gray-300">No date</span>}
                                    </InfoRow>
                                    <InfoRow icon={<Droplets size={13} className="text-red-400" />} label="Blood">
                                        {patient.blood_group
                                            ?? <span className="italic text-gray-300">N/A</span>}
                                    </InfoRow>
                                    <InfoRow icon={<Pill size={13} className="text-pink-400" />} label="Allergies">
                                        <span className="truncate max-w-[140px] block" title={patient.allergies ?? ''}>
                                            {patient.allergies
                                                ?? <span className="italic text-gray-300">None listed</span>}
                                        </span>
                                    </InfoRow>
                                </div>

                                {/* ── Status badge ── */}
                                <div className="mt-auto pt-1">
                                    <StatusBadge status={patient.status ?? 'no-status'} />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
    icon, label, children,
}: {
    icon: React.ReactNode;
    label?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="shrink-0">{icon}</span>
            {label && <span className="text-gray-400 font-medium shrink-0">{label}:</span>}
            <span className="font-medium">{children}</span>
        </div>
    );
}

export default PatientsTable;