'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import SearchInput from './search-input';
import PatientsTable from './table';
import { Patient, SortConfig } from '@/context/patients/types';
import { Button } from '@/components/ui/button';
import {
    RefreshCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
    Users, Plus, Loader2, Search, UserX,
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
    const [search, setSearch]           = useState('');
    const [sortConfig, setSortConfig]   = useState<SortConfig | null>(null);
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

    React.useEffect(() => { setCurrentPage(1); }, [search, sortConfig]);

    const isFrontdesk = user?.role === 'Frontdesk';

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
                <p className="text-sm text-gray-400">Loading patients...</p>
            </div>
        }>
            <section className="relative w-full space-y-5">

                {/* ── Top progress bar on background refetch ── */}
                <AnimatePresence>
                    {isFetching && !isPending && (
                        <motion.div
                            initial={{ width: '0%', opacity: 1 }}
                            animate={{ width: '100%' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: 'easeInOut' }}
                            className="h-0.5 bg-blue-500 fixed top-0 left-0 z-50 rounded-full"
                        />
                    )}
                </AnimatePresence>

                {/* ── Full loading overlay ── */}
                <AnimatePresence>
                    {isPending && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center z-40 rounded-3xl gap-3"
                        >
                            <Loader2 size={28} className="text-blue-600 animate-spin" />
                            <p className="text-sm font-medium text-gray-500">Loading patients...</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Header ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        {/* Left — title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Users size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 leading-tight flex items-center gap-2">
                                    Patient Registry
                                    {isFetching && !isPending && (
                                        <Loader2 size={13} className="text-blue-400 animate-spin" />
                                    )}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {patients.length} total patients registered
                                </p>
                            </div>
                        </div>

                        {/* Right — actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Search */}
                            <div className="w-full sm:w-56">
                                <SearchInput
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="Search by name..."
                                />
                            </div>

                            {/* Refresh */}
                            <Button
                                variant="ghost"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="h-9 px-3 rounded-xl border border-gray-100 text-gray-500 hover:text-gray-800 gap-1.5 text-sm"
                                aria-label="Refresh patients"
                            >
                                <RefreshCcw size={15} className={isFetching ? 'animate-spin' : ''} />
                                <span className="hidden sm:inline font-medium">Refresh</span>
                            </Button>

                            {/* Add patient — Frontdesk only */}
                            {isFrontdesk && (
                                <Link href="/front-desk/patient/new">
                                    <Button className="h-9 gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 px-4">
                                        <Plus size={15} />
                                        New Patient
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Table card ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {filteredPatients.length === 0 && !isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                {search ? (
                                    <Search size={22} className="text-gray-300" />
                                ) : (
                                    <UserX size={22} className="text-gray-300" />
                                )}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">
                                    {search ? 'No matching patients' : 'No patients yet'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {search
                                        ? `No results for "${search}". Try a different name.`
                                        : 'Register your first patient to get started.'}
                                </p>
                            </div>
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <PatientsTable
                            patients={paginatedPatients}
                            isPending={isPending}
                            currentPage={currentPage}
                        />
                    )}
                </div>

                {/* ── Pagination ── */}
                {filteredPatients.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">

                        {/* Count */}
                        <p className="text-xs text-gray-400">
                            Showing{' '}
                            <span className="font-semibold text-gray-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)}</span>
                            {' '}of{' '}
                            <span className="font-semibold text-gray-600">{filteredPatients.length}</span>
                            {' '}patients
                        </p>

                        {/* Page controls */}
                        <div className="flex items-center gap-1">
                            <PaginationBtn onClick={handleFirst} disabled={currentPage === 1} label="First page">
                                <ChevronsLeft size={15} />
                            </PaginationBtn>
                            <PaginationBtn onClick={handlePrev} disabled={currentPage === 1} label="Previous page">
                                <ChevronLeft size={15} />
                            </PaginationBtn>

                            <span className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl min-w-[80px] text-center">
                                {currentPage} / {totalPages}
                            </span>

                            <PaginationBtn onClick={handleNext} disabled={currentPage === totalPages} label="Next page">
                                <ChevronRight size={15} />
                            </PaginationBtn>
                            <PaginationBtn onClick={handleLast} disabled={currentPage === totalPages} label="Last page">
                                <ChevronsRight size={15} />
                            </PaginationBtn>
                        </div>
                    </div>
                )}
            </section>
        </Suspense>
    );

    function handlePrev()  { setCurrentPage((p) => Math.max(p - 1, 1)); }
    function handleNext()  { setCurrentPage((p) => Math.min(p + 1, totalPages)); }
    function handleFirst() { setCurrentPage(1); }
    function handleLast()  { setCurrentPage(totalPages); }
}

// ─── Pagination button ────────────────────────────────────────────────────────

function PaginationBtn({
    onClick, disabled, label, children,
}: {
    onClick: () => void;
    disabled: boolean;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
            {children}
        </button>
    );
}