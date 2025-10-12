'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import SearchInput from './search-input';
import PatientsTableHeader from './table-header';
import PatientsTable from './table';
import { Patient, SortConfig } from '@/context/patients/types';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { RefreshCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Users, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { getAllPatients } from '@/actions/patients/patients';

interface PatientProps {
    thePatients: Patient[];
}

const ITEMS_PER_PAGE = 10;

export default function PatientsComponent({ thePatients }: PatientProps) {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { data: patients = [], isPending, isFetching, refetch } = useQuery({
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

    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ITEMS_PER_PAGE));
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
    const handleFirst = () => setCurrentPage(1);
    const handleLast = () => setCurrentPage(totalPages);

    // Improved: Reset to page 1 on search or sort change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, sortConfig]);

    return (
        <section className="relative mx-auto w-full px-2 md:px-6 py-10 space-y-8">



            {/* Animate Top Progress Bar */}
            <AnimatePresence>
                {isFetching && !isPending && (
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        exit={{ width: '100%', opacity: 0 }}
                        transition={{ duration: 1, ease: 'easeInOut' }}
                        className="h-1 bg-blue-600 fixed top-0 left-0 z-50"
                    />
                )}
            </AnimatePresence>

            {/* Animate Full Loading Overlay */}
            <AnimatePresence>
                {isPending && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-background/60 backdrop-blur-sm flex justify-center items-center z-40 rounded-xl"
                    >
                        <Spinner size="lg" />
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 p-2">
                        <Users size={22} />
                    </span>
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        List of Patients
                        {isFetching && !isPending && <Spinner size="sm" />}
                    </h2>
                    <span className="ml-2 text-muted-foreground text-sm hidden md:inline">
                        ({patients.length} total)
                    </span>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 min-w-0 md:w-64">
                        <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." />
                    </div>

                    {/* Add New Patient Button */}
                    <div className="flex flex-1 min-w-0 md:w-64 justify-center mb-2">
                        <Link href="/frontdesk/patient/new" passHref legacyBehavior>
                            <Button asChild className="gap-2 rounded-xl text-white">
                                <a>
                                    <Plus size={18} />
                                    Add New Patient
                                </a>
                            </Button>
                        </Link>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => refetch()}
                        className="rounded-xl flex items-center gap-2 px-3"
                        aria-label="Refresh patients"
                        disabled={isFetching}
                    >
                        <RefreshCcw size={18} className={isFetching ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </div>
            </header>

            <div className="overflow-x-auto rounded-2xl border border-border bg-background shadow-md relative">
                {filteredPatients.length === 0 && !isPending ? (
                    <div className="flex flex-col items-center justify-center p-10 text-muted-foreground min-h-[200px]">
                        <Users size={40} className="mb-2 text-blue-200" />
                        <span className="font-medium text-lg">No patients found.</span>
                        <span className="text-sm mt-1">Try adjusting your search or filters.</span>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-border text-sm">
                        <PatientsTableHeader
                            sortConfig={sortConfig}
                            onSortChange={handleSortChange}
                        />
                        <PatientsTable patients={paginatedPatients} isPending={isPending} currentPage={currentPage} />
                    </table>
                )}
            </div>

            {filteredPatients.length > 0 && (
                <footer className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
                    <span className="text-muted-foreground text-sm">
                        Showing <span className="font-semibold">{paginatedPatients.length}</span> of <span className="font-semibold">{filteredPatients.length}</span> patients
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            onClick={handleFirst}
                            disabled={currentPage === 1}
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            aria-label="First page"
                        >
                            <ChevronsLeft size={18} />
                        </Button>
                        <Button
                            onClick={handlePrev}
                            disabled={currentPage === 1}
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">
                            Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                        </span>
                        <Button
                            onClick={handleNext}
                            disabled={currentPage === totalPages}
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            aria-label="Next page"
                        >
                            <ChevronRight size={18} />
                        </Button>
                        <Button
                            onClick={handleLast}
                            disabled={currentPage === totalPages}
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            aria-label="Last page"
                        >
                            <ChevronsRight size={18} />
                        </Button>
                    </div>
                </footer>
            )}
        </section>
    );
}
