'use client'; // Ensure client-only rendering since we use browser-dependent formatting

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Patient, SortConfig } from '@/app/context/patients/types';
import { useRouter } from 'next/navigation';

interface PatientsTableProps {
    patients: Patient[];
    sortConfig: SortConfig | null;
    onSortChange: (key: keyof Patient) => void;
}

const PatientsTable: React.FC<PatientsTableProps> = ({ patients, sortConfig, onSortChange }) => {
    const [mounted, setMounted] = useState(false);
    const router = useRouter()

    // Prevent hydration mismatch by ensuring client-only rendering for dynamic values
    useEffect(() => {
        setMounted(true);
    }, []);

    if (patients.length === 0) {
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
            {patients.map((patient) => (
                <tr key={patient?.userId} onClick={() => router.push(`/doctor/patients/${patient?.userId}`)} className="hover:bg-gray-50 cursor-pointer">
                    <td tabIndex={0} aria-label={`Patient ${patient.name}`} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium">
                        {patient?.name ?? ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.gender ?? ''}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {mounted && patient.$createdAt
                            ? new Date(patient.$createdAt).toLocaleDateString()
                            : 'Testing'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.currentMedication ?? ''}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.allergies ?? ''}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                            className={clsx(
                                'inline-block rounded-full px-3 py-1 text-xs font-semibold text-white',
                                {
                                    'bg-blue-600': patient.status === 'admitted',
                                    'bg-green-700': patient.status === 'discharged',
                                    'bg-yellow-500': patient.status === 'under observation',
                                }
                            )}
                        >
                            {typeof patient.status === 'string'
                                ? patient.status.replace(/^\w/, (c: string) => c.toUpperCase())
                                : ' Unknown'}
                        </span>
                    </td>
                    {/* <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.diagnosis ?? ''}</td> */}
                </tr>
            ))}
        </tbody>
    );
};

export default PatientsTable;
