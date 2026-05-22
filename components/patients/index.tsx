"use client";

import React, { useState, useMemo, Suspense } from "react";
import SearchInput from "./search-input";
import PatientsTable from "./table";
import BulkUploadComponent from "@/components/BulkUpload";
import { bulkUploadRows } from "@/lib/actions/patient-workflow.actions";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    RefreshCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
    Users, Plus, Loader2, Search, UserX, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { useAllPatients, usePatientsByStatus } from "@/hooks/emr/use-emr";
import type { Patient } from "@/types/models";

// ─── Config ───────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 100;

// Which statuses each role cares about.
// null = all patients (Frontdesk + Admin).
const ROLE_STATUSES: Record<string, string[] | null> = {
    Frontdesk: null,
    Admin: null,
    Doctor: ["awaiting-consultation", "under-consultation"],
    Nurse: ["sent-to-nurse", "under-observation", "admitted"],
    LabTechnician: ["sent-to-lab"],
    Pharmacist: ["sent-to-pharmacy", "awaiting-consultation", "under-consultation"],
    Radiologist: ["sent-to-radiology", "awaiting-consultation", "under-consultation"],
};

// ─── Hook: merge multiple status queries into one result ──────────────────────
// All hooks are called unconditionally (React Rules of Hooks).
// We select only the ones relevant to the role at render time.

function useRolePatients(role: string) {
    // ── Always call every status hook ─────────────────────────────────────────
    const all = useAllPatients();

    const awaitingConsult = usePatientsByStatus("awaiting-consultation" as any);
    const underConsult = usePatientsByStatus("under-consultation" as any);

    const sentToNurse = usePatientsByStatus("sent-to-nurse" as any);
    const underObservation = usePatientsByStatus("under-observation" as any);
    const admitted = usePatientsByStatus("admitted" as any);

    const sentToLab = usePatientsByStatus("sent-to-lab" as any);
    const sentToPharmacy = usePatientsByStatus("sent-to-pharmacy" as any);
    const sentToRadiology = usePatientsByStatus("sent-to-radiology" as any);

    // ── Select the right data for this role ───────────────────────────────────
    switch (role) {
        case "Doctor":
            return {
                data: [...(awaitingConsult.data ?? []), ...(underConsult.data ?? [])] as Patient[],
                isPending: awaitingConsult.isPending || underConsult.isPending,
                isFetching: awaitingConsult.isFetching || underConsult.isFetching,
                refetch: () => { awaitingConsult.refetch(); underConsult.refetch(); },
            };

        case "Nurse":
            return {
                data: [...(sentToNurse.data ?? []), ...(underObservation.data ?? []), ...(admitted.data ?? [])] as Patient[],
                isPending: sentToNurse.isPending || underObservation.isPending || admitted.isPending,
                isFetching: sentToNurse.isFetching || underObservation.isFetching || admitted.isFetching,
                refetch: () => { sentToNurse.refetch(); underObservation.refetch(); admitted.refetch(); },
            };

        case "LabTechnician":
            return {
                data: (sentToLab.data ?? []) as Patient[],
                isPending: sentToLab.isPending,
                isFetching: sentToLab.isFetching,
                refetch: sentToLab.refetch,
            };

        case "Pharmacist":
            return {
                data: (sentToPharmacy.data ?? []) as Patient[],
                isPending: sentToPharmacy.isPending,
                isFetching: sentToPharmacy.isFetching,
                refetch: sentToPharmacy.refetch,
            };

        case "Radiologist":
            return {
                data: (sentToRadiology.data ?? []) as Patient[],
                isPending: sentToRadiology.isPending,
                isFetching: sentToRadiology.isFetching,
                refetch: sentToRadiology.refetch,
            };

        // Frontdesk, Admin, and any unknown role — all patients
        default:
            return {
                data: (all.data ?? []) as Patient[],
                isPending: all.isPending,
                isFetching: all.isFetching,
                refetch: all.refetch,
            };
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientsComponent() {
    const { user } = useAuth();
    const role = user?.role ?? "Frontdesk";

    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [bulkOpen, setBulkOpen] = useState(false);

    const { data: patients, isPending, isFetching, refetch } = useRolePatients(role);

    // ── Local filter + pagination ──────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!search.trim()) return patients;
        const q = search.toLowerCase();
        return patients.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.phone?.toLowerCase().includes(q)
        );
    }, [patients, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    React.useEffect(() => { setCurrentPage(1); }, [search]);

    const isFrontdesk = role === "Frontdesk" || role === "FrontDesk";
    const isAdmin = role === "Admin";

    // ── Queue label per role ───────────────────────────────────────────────────
    const queueLabel: Record<string, string> = {
        Doctor: "Consultation Queue",
        Nurse: "Nursing Queue",
        Labtech: "Lab Queue",
        Pharmacist: "Pharmacy Queue",
        Radiologist: "Radiology Queue",
    };
    const pageTitle = queueLabel[role] ?? "Patient Registry";

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
                <p className="text-sm text-gray-400">Loading patients...</p>
            </div>
        }>
            <section className="relative w-full space-y-5">

                {/* Top progress bar on background refetch */}
                <AnimatePresence>
                    {isFetching && !isPending && (
                        <motion.div
                            initial={{ width: "0%", opacity: 1 }}
                            animate={{ width: "100%" }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            className="h-0.5 bg-blue-500 fixed top-0 left-0 z-50 rounded-full"
                        />
                    )}
                </AnimatePresence>

                {/* Full loading overlay */}
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

                {/* Header */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Users size={18} className="text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 leading-tight flex items-center gap-2">
                                    {pageTitle}
                                    {isFetching && !isPending && (
                                        <Loader2 size={13} className="text-blue-400 animate-spin" />
                                    )}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {patients.length} patient{patients.length !== 1 ? "s" : ""}
                                    {role !== "Frontdesk" && role !== "Admin" && " in your queue"}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-full sm:w-56">
                                <SearchInput
                                    value={search}
                                    onChange={setSearch}
                                    placeholder="Search by name or phone..."
                                />
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="h-9 px-3 rounded-xl border border-gray-100 text-gray-500 hover:text-gray-800 gap-1.5 text-sm"
                                aria-label="Refresh"
                            >
                                <RefreshCcw size={15} className={isFetching ? "animate-spin" : ""} />
                                <span className="hidden sm:inline font-medium">Refresh</span>
                            </Button>
                            {(isFrontdesk || isAdmin) && (
                                <Button
                                    variant="outline"
                                    onClick={() => setBulkOpen(true)}
                                    className="h-9 gap-1.5 rounded-xl border-gray-200 text-sm font-semibold"
                                >
                                    <Upload size={15} /> Bulk Import
                                </Button>
                            )}
                            {isFrontdesk && (
                                <Link href="/front-desk/patient/new">
                                    <Button className="h-9 gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-200 px-4">
                                        <Plus size={15} /> New Patient
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Bulk patient import</DialogTitle>
                        </DialogHeader>
                        <BulkUploadComponent
                            onUpload={async (type, rows) => {
                                const result = await bulkUploadRows(type, rows);
                                if (result.success > 0) refetch();
                                return result;
                            }}
                        />
                    </DialogContent>
                </Dialog>

                {/* Table card */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {filtered.length === 0 && !isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                {search ? <Search size={22} className="text-gray-300" /> : <UserX size={22} className="text-gray-300" />}
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">
                                    {search ? "No matching patients" : "Your queue is empty"}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {search
                                        ? `No results for "${search}".`
                                        : "Patients will appear here once they reach your stage."}
                                </p>
                            </div>
                            {search && (
                                <button onClick={() => setSearch("")} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        // Pass patients directly — role filtering is already done above
                        <PatientsTable
                            patients={paginated}
                            isPending={isPending}
                            currentPage={currentPage}
                        />
                    )}
                </div>

                {/* Pagination */}
                {filtered.length > ITEMS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                        <p className="text-xs text-gray-400">
                            Showing{" "}
                            <span className="font-semibold text-gray-600">
                                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
                            </span>
                            {" "}of{" "}
                            <span className="font-semibold text-gray-600">{filtered.length}</span>
                            {" "}patients
                        </p>
                        <div className="flex items-center gap-1">
                            <PaginationBtn onClick={() => setCurrentPage(1)} disabled={currentPage === 1} label="First page"><ChevronsLeft size={15} /></PaginationBtn>
                            <PaginationBtn onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} label="Previous"><ChevronLeft size={15} /></PaginationBtn>
                            <span className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl min-w-[80px] text-center">
                                {currentPage} / {totalPages}
                            </span>
                            <PaginationBtn onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} label="Next"><ChevronRight size={15} /></PaginationBtn>
                            <PaginationBtn onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} label="Last page"><ChevronsRight size={15} /></PaginationBtn>
                        </div>
                    </div>
                )}
            </section>
        </Suspense>
    );
}

// ─── Pagination button ────────────────────────────────────────────────────────

function PaginationBtn({ onClick, disabled, label, children }: {
    onClick: () => void; disabled: boolean; label: string; children: React.ReactNode;
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