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
        <section className="max-w-6xl mx-6 p-6 space-y-6">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-2xl font-bold text-foreground">Patients Directory</h2>
                <div className="w-full md:w-1/2">
                    <SearchInput value={search} onChange={setSearch} />
                </div>
            </header>

            <div className="overflow-x-auto rounded-xl border border-border bg-background shadow-sm">
                {isPending ? (
                    <div className="flex justify-center items-center h-40">
                        <Spinner size="lg" />
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="text-center p-6 text-muted-foreground">No patients found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-border text-sm">
                        <PatientsTableHeader
                            sortConfig={sortConfig}
                            onSortChange={handleSortChange}
                        />
                        <PatientsTable patients={paginatedPatients} />
                    </table>
                )}
            </div>

            {filteredPatients.length > 0 && (
                <footer className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
                    <span className="text-muted-foreground text-sm">
                        Showing {paginatedPatients.length} of {filteredPatients.length} patients
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                            variant="outline"
                            className="rounded-xl"
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            className="rounded-xl"
                        >
                            Next
                        </Button>
                    </div>
                </footer>
            )}
        </section>
    );
}
