"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
    FolderOpen,
    Search,
    User,
    Phone,
    ChevronRight,
    Loader2,
    Users,
    FileText,
} from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, type Patient } from "@/types/models";
import { getAllPatients } from "@/lib/services/patient.service";
import { useSearchPatients } from "@/hooks/emr/use-emr";
import { formatDate, calculateAge } from "@/lib/utils";

// ─── Status badge config (compact) ───────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    "registered":             "bg-gray-100 text-gray-600",
    "awaiting-consultation":  "bg-yellow-50 text-yellow-700",
    "under-consultation":     "bg-purple-50 text-purple-700",
    "sent-to-nurse":          "bg-teal-50 text-teal-700",
    "sent-to-lab":            "bg-indigo-50 text-indigo-700",
    "sent-to-pharmacy":       "bg-pink-50 text-pink-700",
    "sent-to-radiology":      "bg-cyan-50 text-cyan-700",
    "awaiting-payment":       "bg-orange-50 text-orange-700",
    "admitted":               "bg-blue-50 text-blue-700",
    "under-observation":      "bg-amber-50 text-amber-700",
    "discharged":             "bg-green-50 text-green-700",
};

function statusLabel(status?: string) {
    return (status ?? "no-status").replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Hospital number badge — one shared NVH-XXXXX series for all patients ────

function HospitalNumber({ value }: { value?: string }) {
    if (!value) return <span className="text-gray-300 italic text-xs">—</span>;
    return (
        <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100"
            title="Hospital number"
        >
            {value}
        </span>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function PatientRow({ patient }: { patient: Patient }) {
    const p = patient as any;
    const age = p.birth_date ? calculateAge(p.birth_date) : null;
    return (
        <Link
            href={`/admin/patient/${patient.id}?tab=documents`}
            className="group grid grid-cols-12 items-center gap-3 px-4 py-3.5 hover:bg-blue-50/40 border-b border-gray-50 last:border-0 transition-colors"
        >
            <div className="col-span-12 sm:col-span-3 min-w-0">
                <HospitalNumber value={p.hospital_number} />
            </div>

            <div className="col-span-12 sm:col-span-4 min-w-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                        {patient.name || <span className="italic font-medium text-gray-400">Unnamed patient</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                        {[p.gender, age !== null ? `${age} yrs` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                </div>
            </div>

            <div className="col-span-6 sm:col-span-2 min-w-0 flex items-center gap-1.5 text-xs text-gray-500">
                <Phone size={12} className="text-gray-300 shrink-0" />
                <span className="truncate">{patient.phone || "—"}</span>
            </div>

            <div className="col-span-3 sm:col-span-2 min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusLabel(p.status)}
                </span>
            </div>

            <div className="col-span-2 sm:col-span-1 min-w-0 hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                    {p.created_at ? formatDate(p.created_at) : "—"}
                </span>
                <ChevronRight size={14} className="text-gray-200 group-hover:text-blue-500 transition-colors mt-0.5" />
            </div>

            {/* Mobile chevron */}
            <div className="col-span-1 sm:hidden flex justify-end">
                <ChevronRight size={14} className="text-gray-300" />
            </div>
        </Link>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientRecordsPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);

    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");

    // Debounce the search input before hitting the server.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(t);
    }, [query]);

    const isSearching = debounced.length >= 2;

    // Server-side search (name / email / phone / hospital number).
    const { data: searchResults = [], isPending: searchPending } = useSearchPatients(debounced);

    // Newest patients first — the recent-records view when no search is typed.
    const { data: recent = [], isPending: recentPending } = useQuery({
        queryKey: ["patients", "admin", "recent"],
        queryFn: () => getAllPatients(0, 500),
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    });

    const patients = useMemo(() => (isSearching ? (searchResults as Patient[]) : (recent as Patient[])), [isSearching, searchResults, recent]);
    const pending = isSearching ? searchPending : recentPending;

    if (!authorized) return null;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                            <FolderOpen size={18} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 leading-tight">Patient Records</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Look up any patient&apos;s folder — newest records first
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                            <Users size={13} />
                            {isSearching ? `${patients.length} match${patients.length !== 1 ? "es" : ""}` : `${patients.length} recent records`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Search bar */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-4">
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name, phone, or hospital number (e.g. NVH-00042)…"
                        aria-label="Search patient records"
                        className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:bg-white transition-all"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            aria-label="Clear search"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                    Search runs across the whole registry. Without a search, the 500 most recent records are shown.
                </p>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Column headers (desktop) */}
                <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span className="col-span-3">Hospital No.</span>
                    <span className="col-span-4">Patient</span>
                    <span className="col-span-2">Phone</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-1 text-right">Registered</span>
                </div>

                {pending ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 size={24} className="text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-400">Loading patient records…</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <FileText size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">
                            {isSearching ? `No patients match "${debounced}"` : "No patient records yet"}
                        </p>
                        <p className="text-xs text-gray-400">
                            {isSearching
                                ? "Try a name, phone number, or hospital number."
                                : "Registered and bulk-imported patients will appear here."}
                        </p>
                    </div>
                ) : (
                    <div>
                        {patients.map((patient) => (
                            <PatientRow key={patient.id} patient={patient} />
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[11px] text-gray-400 px-1">
                Opening a record shows the patient&apos;s folder (scanned documents) and their full chart.
            </p>
        </div>
    );
}
