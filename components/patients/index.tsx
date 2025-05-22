'use client';

import React, { useState, useMemo, useEffect } from 'react';
import clsx from 'clsx';

// Dummy patient type
interface Patient {
    id: string;
    fullName: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
    admissionDate: string; // ISO string
    status: 'admitted' | 'discharged' | 'under observation';
    roomNumber: string;
    diagnosis: string;
}

// Search input component
const SearchInput = ({
    value,
    onChange,
    placeholder = 'Search patients...',
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}) => (
    <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search patients"
        className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
);

// Table header with sorting support
interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}

const PatientsTableHeader = ({
    sortConfig,
    onSortChange,
}: {
    sortConfig: SortConfig | null;
    onSortChange: (key: keyof Patient) => void;
}) => {
    const headers: { label: string; key: keyof Patient }[] = [
        { label: 'Full Name', key: 'fullName' },
        { label: 'Age', key: 'age' },
        { label: 'Gender', key: 'gender' },
        { label: 'Admission Date', key: 'admissionDate' },
        { label: 'Status', key: 'status' },
        { label: 'Room', key: 'roomNumber' },
        { label: 'Diagnosis', key: 'diagnosis' },
    ];

    const getSortIcon = (key: keyof Patient) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    };

    return (
        <thead className="bg-gray-100">
            <tr>
                {headers.map(({ label, key }) => (
                    <th
                        key={key}
                        scope="col"
                        className="cursor-pointer select-none px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:text-blue-600"
                        onClick={() => onSortChange(key)}
                        aria-sort={
                            sortConfig?.key === key
                                ? sortConfig.direction === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                : 'none'
                        }
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                onSortChange(key);
                            }
                        }}
                    >
                        <span className="inline-flex items-center gap-1">
                            {label}
                            <span aria-hidden="true" className="text-xs text-gray-500">
                                {getSortIcon(key)}
                            </span>
                        </span>
                    </th>
                ))}
            </tr>
        </thead>
    );
};

const PatientsTable = ({
    patients,
    sortConfig,
    onSortChange,
}: {
    patients: Patient[];
    sortConfig: SortConfig | null;
    onSortChange: (key: keyof Patient) => void;
}) => {
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
        <tbody className="divide-y divide-gray-200">
            {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 font-medium">{patient.fullName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.age}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.gender}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {new Date(patient.admissionDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                            className={clsx(
                                'inline-block rounded-full px-3 py-1 text-xs font-semibold text-white',
                                {
                                    'bg-blue-600': patient.status === 'admitted',
                                    'bg-green-600': patient.status === 'discharged',
                                    'bg-yellow-500': patient.status === 'under observation',
                                }
                            )}
                        >
                            {patient.status.replace(/^\w/, (c) => c.toUpperCase())}
                        </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.roomNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{patient.diagnosis}</td>
                </tr>
            ))}
        </tbody>
    );
};

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) => {
    if (totalPages <= 1) return null;

    const canPrev = currentPage > 1;
    const canNext = currentPage < totalPages;

    return (
        <nav
            aria-label="Patients pagination"
            className="flex justify-center items-center gap-3 mt-6"
        >
            <button
                onClick={() => canPrev && onPageChange(currentPage - 1)}
                disabled={!canPrev}
                className={clsx(
                    'rounded px-3 py-1 text-sm font-medium',
                    canPrev ? 'bg-blue-600 text-white hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'
                )}
            >
                Prev
            </button>

            <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
            </span>

            <button
                onClick={() => canNext && onPageChange(currentPage + 1)}
                disabled={!canNext}
                className={clsx(
                    'rounded px-3 py-1 text-sm font-medium',
                    canNext ? 'bg-blue-600 text-white hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'
                )}
            >
                Next
            </button>
        </nav>
    );
};

const PatientsComponent = () => {
    // Simulated patient data, replace with fetch call
    const [patients, setPatients] = useState<Patient[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    // Load dummy data on mount (simulate API fetch)
    useEffect(() => {
        const dummyData: Patient[] = [
            {
                id: '1',
                fullName: 'John Doe',
                age: 42,
                gender: 'Male',
                admissionDate: '2025-05-20T08:00:00Z',
                status: 'admitted',
                roomNumber: '101A',
                diagnosis: 'Pneumonia',
            },
            {
                id: '2',
                fullName: 'Jane Smith',
                age: 36,
                gender: 'Female',
                admissionDate: '2025-04-12T10:30:00Z',
                status: 'discharged',
                roomNumber: '203B',
                diagnosis: 'Fracture',
            },
            {
                id: '3',
                fullName: 'Alice Johnson',
                age: 29,
                gender: 'Female',
                admissionDate: '2025-05-15T12:45:00Z',
                status: 'under observation',
                roomNumber: '305C',
                diagnosis: 'Migraine',
            },
            // add more dummy patients for testing
        ];
        setPatients(dummyData);
    }, []);

    // Filtering by search term
    const filteredPatients = useMemo(() => {
        if (!searchTerm.trim()) return patients;
        return patients.filter((p) =>
            p.fullName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [patients, searchTerm]);

    // Sorting patients
    const sortedPatients = useMemo(() => {
        if (!sortConfig) return filteredPatients;

        return [...filteredPatients].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Date sorting (admissionDate)
            if (sortConfig.key === 'admissionDate') {
                const dateA = new Date(aValue as string);
                const dateB = new Date(bValue as string);
                return sortConfig.direction === 'asc'
                    ? dateA.getTime() - dateB.getTime()
                    : dateB.getTime() - dateA.getTime();
            }

            return 0;
        });
    }, [filteredPatients, sortConfig]);

    // Pagination slice
    const totalPages = Math.ceil(sortedPatients.length / PAGE_SIZE);
    const pagedPatients = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return sortedPatients.slice(start, start + PAGE_SIZE);
    }, [sortedPatients, currentPage]);

    // Handle sorting column toggling asc/desc
    const handleSortChange = (key: keyof Patient) => {
        setSortConfig((current) => {
            if (current?.key === key) {
                return {
                    key,
                    direction: current.direction === 'asc' ? 'desc' : 'asc',
                };
            }
            return { key, direction: 'asc' };
        });
    };

    return (
        <main className="max-w-7xl mx-6 px-4 sm:px-6 lg:px-8 py-8">
            <header className="mb-6">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Patients</h1>
                <p className="mt-2 text-gray-600">
                    Overview of all patients currently admitted or discharged.
                </p>
            </header>

            <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <SearchInput value={searchTerm} onChange={setSearchTerm} />
            </section>

            <section className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <PatientsTableHeader sortConfig={sortConfig} onSortChange={handleSortChange} />
                    <PatientsTable patients={pagedPatients} sortConfig={sortConfig} onSortChange={handleSortChange} />
                </table>
            </section>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </main>
    );
};

export default PatientsComponent;
