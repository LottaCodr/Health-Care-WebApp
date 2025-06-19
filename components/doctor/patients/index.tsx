'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllPatients } from '@/actions/patients/get.patients';

import SearchInput from './search-input';
import PatientsTableHeader from './table-header';
import PatientsTable from './table';
import { Patient, SortConfig } from '@/context/patients/types';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';

interface PatientProps {
    thePatients: Patient[];
}

const ITEMS_PER_PAGE = 10;

export default function PatientsComponent({ thePatients }: PatientProps) {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { data: patients = [], isPending } = useQuery({
        queryKey: ['patients'],
        queryFn: getAllPatients,
        initialData: thePatients,
    });

    const filteredPatients = useMemo(() => {
        let filtered = [...patients];

        if (search.trim()) {
            filtered = filtered.filter((p) =>
                p.name?.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (sortConfig) {
            const { key, direction } = sortConfig;
            const isAsc = direction === 'asc';

            filtered.sort((a, b) => {
                const aVal = a[key] ?? '';
                const bVal = b[key] ?? '';

                return typeof aVal === 'number' && typeof bVal === 'number'
                    ? isAsc ? aVal - bVal : bVal - aVal
                    : isAsc
                        ? String(aVal).localeCompare(String(bVal))
                        : String(bVal).localeCompare(String(aVal));
            });
        }

        return filtered;
    }, [patients, search, sortConfig]);

    const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
    const paginatedPatients = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPatients.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredPatients, currentPage]);

    const handleSortChange = (key: keyof Patient) => {
        setSortConfig((prev) =>
            !prev || prev.key !== key
                ? { key, direction: 'asc' }
                : { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        );
    };

    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

    return (
        <section className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Patients</h2>
                <div className="w-full max-w-md">
                    <SearchInput value={search} onChange={setSearch} />
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg min-h-[300px]">
                {isPending ? (
                    <div className="flex justify-center items-center h-40">
                        <Spinner size="lg" /> {/* replace with your spinner component */}
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">No patients found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <PatientsTableHeader
                            sortConfig={sortConfig}
                            onSortChange={handleSortChange}
                        />
                        <PatientsTable patients={paginatedPatients} />
                    </table>
                )}
            </div>

            {filteredPatients.length > 0 && (
                <div className="mt-4 flex justify-end gap-2">
                    <Button onClick={handlePrev} disabled={currentPage === 1}>
                        Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button onClick={handleNext} disabled={currentPage === totalPages}>
                        Next
                    </Button>
                </div>
            )}
        </section>
    );
}
