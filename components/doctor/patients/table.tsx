'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Patient, PatientStatus } from '@/context/patients/types';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientsTableProps {
    patients: Patient[];
    isPending: boolean;
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

const PatientsTable: React.FC<PatientsTableProps> = ({ patients, isPending }) => {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Show loading state instead of "No patients found" if isPending is true
    if (patients.length === 0 && isPending) {
        return (
            <tbody>
                <tr>
                    <td colSpan={7} className="py-12 text-center flex gap-4">
                        <Spinner size="lg" /> Getting your patients...
                    </td>
                </tr>
            </tbody>
        );
    }

    // Show "No patients found" if loading is done and still no patients
    if (patients.length === 0 && !isPending) {
        return (
            <tbody>
                <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                        No patients found.
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <tbody className="divide-y capitalize divide-gray-200">
            <AnimatePresence>
                {patients.map((patient) => (
                    <motion.tr
                        key={patient?.userId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        onClick={() => router.push(`/doctor/patients/${patient?.userId}`)}
                        className="hover:bg-gray-50 cursor-pointer"
                    >
                        <td
                            tabIndex={0}
                            aria-label={`Patient ${patient.name}`}
                            className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium"
                        >
                            {patient?.name ?? 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.gender ?? 'N/A'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.currentMedication ?? 'N/A'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.allergies ?? 'N/A'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <span
                                className={clsx(
                                    'inline-block rounded-full px-3 py-1 text-xs font-semibold text-white',
                                    statusColorMap[patient.status as PatientStatus] || 'bg-gray-500'
                                )}
                            >
                                {typeof patient.status === 'string'
                                    ? patient.status.replace(/-/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase())
                                    : 'No Status'}
                            </span>
                        </td>
                    </motion.tr>
                ))}
            </AnimatePresence>
        </tbody>
    );
};

export default PatientsTable;
