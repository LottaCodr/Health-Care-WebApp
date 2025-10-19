'use client';

import React, { useEffect, useState, useRef } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Patient, PatientStatus } from '@/context/patients/types';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { FaUserMd, FaPills, FaHeartbeat, FaNotesMedical, FaExclamationCircle } from 'react-icons/fa';
import { MdOutlineMedication, MdWarning } from 'react-icons/md';

interface PatientsTableProps {
    patients: Patient[];
    isPending: boolean;
    currentPage: number;
}

const statusColorMap: Record<PatientStatus, string> = {
    'registered': 'bg-gray-400',
    'awaiting-consultation': 'bg-yellow-300',
    'under-consultation': 'bg-purple-500',
    'sent-to-nurse': 'bg-teal-500',
    'sent-to-lab': 'bg-indigo-500',
    'sent-to-pharmacy': 'bg-pink-500',
    'awaiting-payment': 'bg-orange-500',
    'admitted': 'bg-blue-600',
    'under-observation': 'bg-yellow-500',
    'discharged': 'bg-green-700',
    'no-status': 'bg-red-500',
};

const genderColorMap: Record<string, string> = {
    'male': 'text-blue-600',
    'female': 'text-pink-500',
    'other': 'text-purple-500',
};

function StatusBadge({ status }: { status: PatientStatus | string }) {
    const color = statusColorMap[status as PatientStatus] || 'bg-gray-500';
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm transition',
                color
            )}
        >
            <FaExclamationCircle className="text-white/80 text-xs" />
            {typeof status === 'string'
                ? status.replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
                : 'No Status'}
        </span>
    );
}

function TableCell({ children, icon, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { icon?: React.ReactNode }) {
    return (
        <td
            className={clsx(
                'whitespace-nowrap px-4 py-3 text-sm align-middle',
                className
            )}
            {...props}
        >
            <span className="flex items-center gap-2">
                {icon && <span className="text-lg">{icon}</span>}
                {children}
            </span>
        </td>
    );
}

const PatientsTable: React.FC<PatientsTableProps> = ({ patients, isPending, currentPage }) => {
    const [mounted, setMounted] = useState(false);
    const [focusedRow, setFocusedRow] = useState<number | null>(null);
    const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Keyboard navigation for accessibility and UX
    useEffect(() => {
        if (focusedRow !== null && rowRefs.current[focusedRow]) {
            rowRefs.current[focusedRow]?.focus();
        }
    }, [focusedRow, currentPage]);

    const handleRowKeyDown = (e: React.KeyboardEvent, idx: number, userId: string | undefined) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push(`/doctor/patients/${userId}`);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedRow((prev) => prev === null ? 0 : Math.min(patients.length - 1, prev + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedRow((prev) => prev === null ? 0 : Math.max(0, prev - 1));
        }
    };

    // Loading State
    if (patients.length === 0 && isPending) {
        return (
            <tbody>
                <tr>
                    <td colSpan={7} className="py-16 text-center justify-center items-center flex flex-col gap-4 bg-white/80 dark:bg-muted/40 rounded-xl shadow-inner">
                        <Spinner size="lg" />
                        <span className="text-lg text-blue-700 font-semibold">Getting your patients...</span>
                    </td>
                </tr>
            </tbody>
        );
    }

    // Empty State
    if (patients.length === 0 && !isPending) {
        return (
            <tbody>
                <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-500 bg-white/80 dark:bg-muted/40 rounded-xl shadow-inner">
                        <MdWarning className="mx-auto text-3xl text-red-400 mb-2" />
                        <span className="block text-lg font-medium">No patients found.</span>
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <motion.tbody
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="divide-y divide-gray-200 dark:divide-muted/40 capitalize"
        >
            {patients.map((patient, idx) => (
                <tr
                    key={`${currentPage}-${patient?.email}`}
                    ref={el => { rowRefs.current[idx] = el; }}
                    onClick={() => router.push(`/doctor/patients/${patient?.$id}`)}
                    className={clsx(
                        "hover:bg-blue-50 dark:hover:bg-muted/30 cursor-pointer transition group outline-none",
                        idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-gray-50 dark:bg-muted/20",
                        focusedRow === idx && "ring-2 ring-blue-400 z-10"
                    )}
                    tabIndex={0}
                    aria-label={`View details for patient ${patient.name}`}
                    onFocus={() => setFocusedRow(idx)}
                    onBlur={() => setFocusedRow(null)}
                    onKeyDown={e => handleRowKeyDown(e, idx, patient?.userId)}
                    role="button"
                    aria-pressed="false"
                >
                    <TableCell
                        icon={<FaUserMd className="text-blue-700" />}
                        className="font-semibold text-gray-900 dark:text-white"
                    >
                        <span className="truncate max-w-[160px] block" title={patient?.name ?? 'N/A'}>
                            {patient?.name ?? <span className="italic text-gray-400">N/A</span>}
                        </span>
                    </TableCell>
                    <TableCell
                        icon={
                            <span className={clsx(
                                genderColorMap[(patient.gender || '').toLowerCase()] || 'text-gray-400'
                            )}>
                                <FaHeartbeat />
                            </span>
                        }
                        className="text-gray-700 dark:text-gray-200"
                    >
                        {patient.gender ?? <span className="italic text-gray-400">N/A</span>}
                    </TableCell>
                    <TableCell
                        icon={<FaNotesMedical className="text-green-600" />}
                        className="text-gray-700 dark:text-gray-200"
                    >
                        {patient?.$createdAt ? formatDate(patient.$createdAt) : <span className="italic text-gray-400">N/A</span>}
                    </TableCell>
                    <TableCell
                        icon={<MdOutlineMedication className="text-purple-600" />}
                        className="text-gray-700 dark:text-gray-200"
                    >
                        <span className="truncate max-w-[120px] block" title={patient.phone ?? 'N/A'}>
                            {patient.phone ?? <span className="italic text-gray-400">N/A</span>}
                        </span>
                    </TableCell>
                    <TableCell
                        icon={<FaPills className="text-pink-500" />}
                        className="text-gray-700 dark:text-gray-200"
                    >
                        <span className="truncate max-w-[120px] block" title={patient.allergies ?? 'N/A'}>
                            {patient.allergies ?? <span className="italic text-gray-400">N/A</span>}
                        </span>
                    </TableCell>
                    <TableCell className="text-sm">
                        <StatusBadge status={patient.status} />
                    </TableCell>
                </tr>
            ))}
        </motion.tbody>
    );
};

export default PatientsTable;
