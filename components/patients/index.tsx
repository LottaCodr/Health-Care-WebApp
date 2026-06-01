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
import { useAllPatients } from "@/hooks/emr/use-emr";
import type { Patient } from "@/types/models";

// ─── Config ───────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 100;

// ─── Status tab definitions ───────────────────────────────────────────────────

type PatientStatus =
    | "all"
    | "awaiting-consultation"
    | "under-consultation"
    | "sent-to-nurse"
    | "under-observation"
    | "discharged"
    | "sent-to-lab"
    | "sent-to-pharmacy"
    | "sent-to-radiology";

interface StatusTab {
    value:    PatientStatus;
    label:    string;
    short:    string;   // for narrow screens
    color:    string;   // active pill colour
    dot:      string;   // indicator dot
}

const ALL_TABS: StatusTab[] = [
    { value: "all",                  label: "All Patients",         short: "All",       color: "bg-slate-800 text-white",           dot: "bg-slate-400" },
    { value: "sent-to-nurse",        label: "Sent to Nurse",        short: "Nursing",   color: "bg-teal-600 text-white",            dot: "bg-teal-500"  },
    { value: "awaiting-consultation",label: "Awaiting Consultation",short: "Awaiting",  color: "bg-blue-600 text-white",            dot: "bg-blue-500"  },
    { value: "under-consultation",   label: "In Consultation",      short: "Consulting",color: "bg-violet-600 text-white",          dot: "bg-violet-500"},
    { value: "under-observation",    label: "Under Observation",    short: "Obs",       color: "bg-cyan-600 text-white",            dot: "bg-cyan-500"  },
    { value: "sent-to-pharmacy",     label: "Pharmacy",             short: "Pharmacy",  color: "bg-pink-600 text-white",            dot: "bg-pink-500"  },
    { value: "sent-to-lab",          label: "Lab",                  short: "Lab",       color: "bg-orange-500 text-white",          dot: "bg-orange-400"},
    { value: "sent-to-radiology",    label: "Radiology",            short: "Radiology", color: "bg-indigo-600 text-white",          dot: "bg-indigo-500"},
    { value: "discharged",            label: "Discharged",            short: "Discharged", color: "bg-emerald-600 text-white",         dot: "bg-emerald-500"},
];

// All roles see every status tab.
const ALL_STATUS_VALUES: PatientStatus[] = [
    "all",
    "sent-to-nurse",
    "awaiting-consultation",
    "under-consultation",
    "under-observation",
    "sent-to-pharmacy",
    "sent-to-lab",
    "sent-to-radiology",
    "discharged",
];

// ─── Queue page title per role ─────────────────────────────────────────────────

const PAGE_TITLE: Record<string, string> = {
    Doctor:        "Consultation Queue",
    Nurse:         "Nursing Queue",
    LabTechnician: "Lab Queue",
    Pharmacist:    "Pharmacy Queue",
    Radiologist:   "Radiology Queue",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TabPillProps {
    tab:       StatusTab;
    active:    boolean;
    count:     number;
    onClick:   () => void;
}

function TabPill({ tab, active, count, onClick }: TabPillProps) {
    return (
        <button
            onClick={onClick}
            className={`
                relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap
                transition-all duration-150 shrink-0
                ${active
                    ? `${tab.color} shadow-sm`
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }
            `}
        >
            {/* Live dot — only show when not active so it's not hidden by pill bg */}
            {!active && (
                <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} shrink-0`} />
            )}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
            {count > 0 && (
                <span className={`
                    ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none
                    ${active ? "bg-white/20 text-white" : "bg-white text-gray-600 border border-gray-200"}
                `}>
                    {count > 999 ? "999+" : count}
                </span>
            )}
        </button>
    );
}

// ─── Pagination button ─────────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientsComponent() {
    const { user } = useAuth();
    const role = user?.role ?? "Frontdesk";

    const [search,       setSearch]       = useState("");
    const [activeTab,    setActiveTab]    = useState<PatientStatus>("all");
    const [currentPage,  setCurrentPage]  = useState(1);
    const [bulkOpen,     setBulkOpen]     = useState(false);

    // Always fetch all patients — tab filtering is done client-side.
    const { data: allPatients = [], isPending, isFetching, refetch } = useAllPatients();

    const roleFilteredPatients = allPatients;

    // Count per status for badge numbers
    const countByStatus = useMemo(() => {
        const map: Record<string, number> = {};
        for (const p of roleFilteredPatients) {
            map[p.status] = (map[p.status] ?? 0) + 1;
        }
        return map;
    }, [roleFilteredPatients]);

    // Active tab filter
    const tabFiltered = useMemo(() => {
        if (activeTab === "all") return roleFilteredPatients;
        return roleFilteredPatients.filter((p) => p.status === activeTab);
    }, [roleFilteredPatients, activeTab]);

    // Search filter
    const searched = useMemo(() => {
        if (!search.trim()) return tabFiltered;
        const q = search.toLowerCase();
        return tabFiltered.filter((p) =>
            p.name?.toLowerCase().includes(q) ||
            p.phone?.toLowerCase().includes(q)
        );
    }, [tabFiltered, search]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(searched.length / ITEMS_PER_PAGE));
    const paginated  = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return searched.slice(start, start + ITEMS_PER_PAGE);
    }, [searched, currentPage]);

    // Reset page when filters change
    React.useEffect(() => { setCurrentPage(1); }, [search, activeTab]);

    const visibleTabs = ALL_TABS.filter((t) => ALL_STATUS_VALUES.includes(t.value));

    const isFrontdesk = role === "Frontdesk" || role === "FrontDesk";
    const isAdmin     = role === "Admin";
    const pageTitle   = PAGE_TITLE[role] ?? "Patient Registry";

    // Active tab meta (for empty state messaging)
    const activeTabMeta = ALL_TABS.find((t) => t.value === activeTab)!;

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                <Loader2 size={28} className="text-blue-600 animate-spin" />
                <p className="text-sm text-gray-400">Loading patients...</p>
            </div>
        }>
            <section className="relative w-full space-y-4">

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

                {/* ── Header card ─────────────────────────────────────────────── */}
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
                                    {roleFilteredPatients.length} patient{roleFilteredPatients.length !== 1 ? "s" : ""}
                                    {activeTab !== "all" && (
                                        <> · <span className="font-medium text-gray-500">{searched.length} in this tab</span></>
                                    )}
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

                {/* ── Status tabs ──────────────────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                        {visibleTabs.map((tab) => (
                            <TabPill
                                key={tab.value}
                                tab={tab}
                                active={activeTab === tab.value}
                                count={tab.value === "all" ? roleFilteredPatients.length : (countByStatus[tab.value] ?? 0)}
                                onClick={() => setActiveTab(tab.value)}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Bulk import dialog ───────────────────────────────────────── */}
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

                {/* ── Table card ───────────────────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {searched.length === 0 && !isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                {search
                                    ? <Search size={22} className="text-gray-300" />
                                    : <UserX  size={22} className="text-gray-300" />
                                }
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">
                                    {search
                                        ? "No matching patients"
                                        : activeTab === "all"
                                            ? "No patients yet"
                                            : `No patients in "${activeTabMeta.label}"`
                                    }
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {search
                                        ? `No results for "${search}"`
                                        : activeTab === "all"
                                            ? "Registered patients will appear here."
                                            : "Patients will appear here once they reach this stage."
                                    }
                                </p>
                            </div>
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                    Clear search
                                </button>
                            )}
                            {!search && activeTab !== "all" && (
                                <button
                                    onClick={() => setActiveTab("all")}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                >
                                    View all patients
                                </button>
                            )}
                        </div>
                    ) : (
                        <PatientsTable
                            patients={paginated}
                            isPending={isPending}
                            currentPage={currentPage}
                        />
                    )}
                </div>

                {/* ── Pagination ────────────────────────────────────────────────── */}
                {searched.length > ITEMS_PER_PAGE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
                        <p className="text-xs text-gray-400">
                            Showing{" "}
                            <span className="font-semibold text-gray-600">
                                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, searched.length)}
                            </span>
                            {" "}of{" "}
                            <span className="font-semibold text-gray-600">{searched.length}</span>
                            {" "}patients
                        </p>
                        <div className="flex items-center gap-1">
                            <PaginationBtn onClick={() => setCurrentPage(1)}                     disabled={currentPage === 1}          label="First page"><ChevronsLeft  size={15} /></PaginationBtn>
                            <PaginationBtn onClick={() => setCurrentPage((p) => p - 1)}          disabled={currentPage === 1}          label="Previous">  <ChevronLeft   size={15} /></PaginationBtn>
                            <span className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl min-w-[80px] text-center">
                                {currentPage} / {totalPages}
                            </span>
                            <PaginationBtn onClick={() => setCurrentPage((p) => p + 1)}          disabled={currentPage === totalPages} label="Next">       <ChevronRight  size={15} /></PaginationBtn>
                            <PaginationBtn onClick={() => setCurrentPage(totalPages)}             disabled={currentPage === totalPages} label="Last page">  <ChevronsRight size={15} /></PaginationBtn>
                        </div>
                    </div>
                )}
            </section>
        </Suspense>
    );
}