'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import SearchInput from './search-input';
import PatientsTable from './table';
import { Patient, SortConfig } from '@/context/patients/types';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
    RefreshCcw, ChevronsLeft, ChevronLeft, ChevronRight,
    ChevronsRight, Users, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/auth-provider';
import { getAllPatients } from '@/actions/front-desk/get.patients';

interface PatientProps {
    thePatients: Patient[];
}

const ITEMS_PER_PAGE = 10;

export default function PatientsComponent({ thePatients }: PatientProps) {
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const { user } = useAuth();

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

            {/* --- Improved Visual Hierarchy Starts Here --- */}
            <header className="flex flex-col mb-4 gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center rounded-full bg-blue-100 text-blue-700 p-3">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight flex items-center gap-2">
                            Patients
                            {isFetching && !isPending && <Spinner size="sm" />}
                        </h1>
                        <div className="ml-1 text-muted-foreground text-base md:text-lg">
                            <span>
                                {patients.length} total patients
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                {/* Left/Top: Search & Add */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Search by name..."
                    />
                    {user?.role === "frontdesk" && (
                        <Link href="/frontdesk/patient/new" className="min-w-max">
                            <Button asChild className="gap-2 rounded-xl font-medium text-white shadow-md bg-blue-600 hover:bg-blue-700">
                                <a>
                                    <Plus size={18} />
                                    Add New Patient
                                </a>
                            </Button>
                        </Link>
                    )}
                </div>
                <div className="flex flex-row justify-end w-full md:w-auto">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        className="rounded-xl flex items-center gap-2 px-4 font-medium"
                        aria-label="Refresh patients"
                        disabled={isFetching}
                    >
                        <RefreshCcw size={18} className={isFetching ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>
            {/* --- End Visual Hierarchy Head --- */}

            {filteredPatients.length === 0 && !isPending ? (
                <div className="overflow-x-auto rounded-2xl border-2 border-dashed border-border bg-background shadow-lg relative">
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground min-h-[210px]">
                        <Users size={44} className="mb-2 text-blue-200" />
                        <span className="font-semibold text-xl">No patients found.</span>
                        <span className="text-base mt-2">Try adjusting your search or filters.</span>
                    </div>
                </div>
            ) : (
                <PatientsTable
                    patients={paginatedPatients}
                    isPending={isPending}
                    currentPage={currentPage}
                />
            )}

            {filteredPatients.length > 0 && (
                <footer className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 mt-4 border-t border-border">
                    <span className="text-muted-foreground text-base">
                        Showing <span className="font-bold text-blue-700">{paginatedPatients.length}</span> of <span className="font-bold">{filteredPatients.length}</span> patients
                    </span>
                    <div className="flex items-center gap-1 bg-accent/40 rounded-xl px-3 py-1">
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
                        <span className="text-base text-muted-foreground px-3 font-medium">
                            Page <span className="font-bold text-foreground">{currentPage}</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="font-bold text-foreground">{totalPages}</span>
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
