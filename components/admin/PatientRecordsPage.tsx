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
    Archive,
    RotateCcw,
    Trash2,
    Link2,
} from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, type Patient } from "@/types/models";
import { getAllPatients } from "@/lib/services/patient.service";
import { unwrapResult } from "@/lib/utils/service-result";
import { useSearchPatients, useDisabledPatients } from "@/hooks/emr/use-emr";
import { formatDate, calculateAge } from "@/lib/utils";
import ManagePatientRecordDialog, {
    type ManageRecordMode,
} from "@/components/patients/ManagePatientRecordDialog";

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
    "awaiting-front-desk":    "bg-blue-50 text-blue-700",
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

// ─── Active Row ───────────────────────────────────────────────────────────────

function ActivePatientRow({
    patient,
    onManage,
}: {
    patient: Patient;
    onManage: (patient: Patient, mode: ManageRecordMode) => void;
}) {
    const p = patient as any;
    const age = p.birth_date ? calculateAge(p.birth_date) : null;
    return (
        <div className="group grid grid-cols-12 items-center gap-3 px-4 py-3.5 hover:bg-blue-50/40 border-b border-gray-50 last:border-0 transition-colors">
            <Link
                href={`/admin/patient/${patient.id}?tab=documents`}
                className="col-span-12 sm:col-span-2 min-w-0"
            >
                <HospitalNumber value={p.hospital_number} />
            </Link>

            <Link
                href={`/admin/patient/${patient.id}?tab=documents`}
                className="col-span-12 sm:col-span-4 min-w-0 flex items-center gap-3"
            >
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <User size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                        {patient.name || <span className="italic font-medium text-gray-400">Unnamed patient</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                        {[p.gender, age !== null ? `${age} yrs` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                </div>
            </Link>

            <div className="col-span-6 sm:col-span-2 min-w-0 flex items-center gap-1.5 text-xs text-gray-500">
                <Phone size={12} className="text-gray-300 shrink-0" />
                <span className="truncate">{patient.phone || "—"}</span>
            </div>

            <div className="col-span-6 sm:col-span-2 min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {statusLabel(p.status)}
                </span>
            </div>

            <div className="col-span-12 sm:col-span-2 min-w-0 flex items-center justify-end gap-1.5">
                <span className="text-[11px] text-gray-400 whitespace-nowrap hidden md:inline mr-1">
                    {p.created_at ? formatDate(p.created_at) : "—"}
                </span>
                <button
                    type="button"
                    onClick={() => onManage(patient, "disable")}
                    title="Disable or delete duplicate/mistaken patient record"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50 text-[11px] font-bold text-gray-600 hover:text-amber-700 transition-colors"
                >
                    <Archive size={12} />
                    <span className="hidden lg:inline">Disable</span>
                </button>
                <Link
                    href={`/admin/patient/${patient.id}?tab=documents`}
                    aria-label={`Open ${patient.name || "patient"} record`}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    <ChevronRight size={15} />
                </Link>
            </div>
        </div>
    );
}

// ─── Disabled Row ─────────────────────────────────────────────────────────────

function DisabledPatientRow({
    patient,
    onManage,
}: {
    patient: Patient;
    onManage: (patient: Patient, mode: ManageRecordMode) => void;
}) {
    const p = patient as any;
    const age = p.birth_date ? calculateAge(p.birth_date) : null;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-amber-50/20 transition-colors">
            <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Archive size={15} className="text-amber-600" />
                </div>
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <HospitalNumber value={p.hospital_number} />
                        <Link
                            href={`/admin/patient/${patient.id}?tab=documents`}
                            className="text-sm font-bold text-gray-900 hover:text-blue-700 truncate"
                        >
                            {patient.name || <span className="italic font-medium text-gray-400">Unnamed patient</span>}
                        </Link>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Disabled
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">
                        {[p.gender, age !== null ? `${age} yrs` : null, patient.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-amber-800">
                        {p.disabled_reason || "Disabled by administrator"}
                        {p.disabled_at ? ` · ${formatDate(p.disabled_at)}` : ""}
                    </p>
                    {p.duplicate_of_patient_id && (
                        <p className="text-xs">
                            <Link
                                href={`/admin/patient/${p.duplicate_of_patient_id}`}
                                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                            >
                                <Link2 size={11} /> View primary record
                            </Link>
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 sm:pl-3">
                <button
                    type="button"
                    onClick={() => onManage(patient, "restore")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-colors"
                >
                    <RotateCcw size={12} /> Restore
                </button>
                <button
                    type="button"
                    onClick={() => onManage(patient, "delete")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold transition-colors"
                >
                    <Trash2 size={12} /> Delete
                </button>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientRecordsPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);

    const [view, setView] = useState<"active" | "disabled">("active");
    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const [manageTarget, setManageTarget] = useState<{
        patient: Patient;
        mode: ManageRecordMode;
    } | null>(null);

    // Debounce the search input before hitting the server.
    useEffect(() => {
        const t = setTimeout(() => setDebounced(query.trim()), 250);
        return () => clearTimeout(t);
    }, [query]);

    const isSearching = debounced.length >= 2;

    // Server-side search (name / email / phone / hospital number) on active patients.
    const {
        data: searchResults = [],
        isPending: searchPending,
        error: searchError,
        refetch: refetchSearch,
    } = useSearchPatients(view === "active" ? debounced : "");

    // Newest active patients first — the recent-records view when no search is typed.
    const {
        data: recent = [],
        isPending: recentPending,
        error: recentError,
        refetch: refetchRecent,
    } = useQuery({
        queryKey: ["patients", "list", "admin", "recent"],
        queryFn: async () => unwrapResult(await getAllPatients(0, 500)),
        enabled: authorized,
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    });

    // Disabled / archived records (Admin-only)
    const disabledQuery = useDisabledPatients(view === "disabled" ? debounced : "", {
        enabled: authorized,
    });

    const patients = useMemo(() => {
        if (view === "disabled") return (disabledQuery.data ?? []) as Patient[];
        return isSearching ? (searchResults as Patient[]) : (recent as Patient[]);
    }, [view, disabledQuery.data, isSearching, searchResults, recent]);

    const pending =
        view === "disabled"
            ? disabledQuery.isPending
            : isSearching
                ? searchPending
                : recentPending;

    const loadError = (
        view === "disabled"
            ? disabledQuery.error
            : isSearching
                ? searchError
                : recentError
    ) as Error | null;

    const retry = () => {
        if (view === "disabled") void disabledQuery.refetch();
        else if (isSearching) void refetchSearch();
        else void refetchRecent();
    };

    const disabledCount = (disabledQuery.data ?? []).length;

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
                                Look up, disable, restore, or remove duplicate patient records (admin only)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex rounded-xl bg-gray-100 p-1">
                            <button
                                type="button"
                                onClick={() => setView("active")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    view === "active"
                                        ? "bg-white text-gray-900 shadow-xs"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                Active Records
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("disabled")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    view === "disabled"
                                        ? "bg-white text-amber-800 shadow-xs"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                Disabled
                                {disabledCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                        {disabledCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 pl-1">
                            <Users size={13} />
                            {view === "disabled"
                                ? `${patients.length} disabled`
                                : isSearching
                                    ? `${patients.length} match${patients.length !== 1 ? "es" : ""}`
                                    : `${patients.length} recent records`}
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
                        placeholder={
                            view === "disabled"
                                ? "Search disabled records by name, phone, or hospital number…"
                                : "Search by name, phone, or hospital number (e.g. NVH-00042)…"
                        }
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
                    {view === "disabled"
                        ? "Disabled records are hidden from all clinical queues, searches, and counts. You can restore a record or permanently delete zero-history duplicates here."
                        : "Search runs across active records in the registry. Without a search, the 500 most recent active records are shown."}
                </p>
            </div>

            {/* List */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {view === "active" && (
                    <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span className="col-span-2">Hospital No.</span>
                        <span className="col-span-4">Patient</span>
                        <span className="col-span-2">Phone</span>
                        <span className="col-span-2">Status</span>
                        <span className="col-span-2 text-right">Actions</span>
                    </div>
                )}

                {pending ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 size={24} className="text-blue-500 animate-spin" />
                        <p className="text-sm text-gray-400">Loading patient records…</p>
                    </div>
                ) : loadError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6" role="alert">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                            <FileText size={20} className="text-amber-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-700">
                            Patient records could not be loaded
                        </p>
                        <p className="text-xs text-gray-500 max-w-md break-words">
                            {loadError.message || "The system could not read the patient registry just now."}
                        </p>
                        <p className="text-[11px] text-gray-400 max-w-md">
                            This is a read failure, not an empty registry — no patient has been removed.
                        </p>
                        <button
                            type="button"
                            onClick={retry}
                            className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                            Try again
                        </button>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <FileText size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">
                            {isSearching
                                ? `No ${view === "disabled" ? "disabled " : ""}patients match "${debounced}"`
                                : view === "disabled"
                                    ? "No disabled patient records"
                                    : "No patient records yet"}
                        </p>
                        <p className="text-xs text-gray-400">
                            {isSearching
                                ? "Try a name, phone number, or hospital number."
                                : view === "disabled"
                                    ? "Duplicate or mistaken patient records disabled by an administrator will appear here."
                                    : "Registered and bulk-imported patients will appear here."}
                        </p>
                    </div>
                ) : view === "disabled" ? (
                    <div>
                        {patients.map((patient) => (
                            <DisabledPatientRow
                                key={patient.id}
                                patient={patient}
                                onManage={(p, mode) => setManageTarget({ patient: p, mode })}
                            />
                        ))}
                    </div>
                ) : (
                    <div>
                        {patients.map((patient) => (
                            <ActivePatientRow
                                key={patient.id}
                                patient={patient}
                                onManage={(p, mode) => setManageTarget({ patient: p, mode })}
                            />
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[11px] text-gray-400 px-1">
                Opening a record shows the patient&apos;s folder (scanned documents) and their full chart.
            </p>

            {/* Admin-only Disable / Restore / Delete dialog */}
            <ManagePatientRecordDialog
                patient={manageTarget?.patient ?? null}
                open={!!manageTarget}
                onOpenChange={(open) => !open && setManageTarget(null)}
                initialMode={manageTarget?.mode}
                onSuccess={() => {
                    void refetchRecent();
                    void disabledQuery.refetch();
                    if (isSearching) void refetchSearch();
                }}
            />
        </div>
    );
}
