'use client';

import { SortConfig, Patient } from '@/types/patients';

interface Props {
    sortConfig: SortConfig | null;
    onSortChange: (key: keyof Patient) => void;
}

const headers: { key: keyof Patient; label: string }[] = [
    { key: 'fullName', label: 'Full Name' },
    { key: 'gender', label: 'Gender' },
    { key: '$updatedAt', label: 'Admission Date' },
    { key: 'currentMedication', label: 'Current Medication' },
    { key: 'allergies', label: 'Allergies' },
    { key: 'status', label: 'Status' },
];

export default function PatientsTableHeader({ sortConfig, onSortChange }: Props) {
    return (
        <thead className="bg-gray-100">
            <tr>
                {headers.map(({ key, label }) => {
                    const isActive = sortConfig?.key === key;
                    const direction = isActive ? sortConfig?.direction : null;
                    return (
                        <th
                            key={key}
                            className="px-4 py-2 text-left cursor-pointer"
                            onClick={() => onSortChange(key)}
                        >
                            {label}
                            {isActive && (
                                <span className="ml-1">
                                    {direction === 'asc' ? '▲' : '▼'}
                                </span>
                            )}
                        </th>
                    );
                })}
            </tr>
        </thead>
    );
}
