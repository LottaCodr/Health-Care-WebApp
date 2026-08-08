"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useAllPatients } from "@/hooks/emr/use-patients";
import { useRoleProtection } from "@/lib/role-utils";
import Link from "next/link";
import { UserRole } from "@/types/models";
import {
    Search, X, Download, FileText, User, Calendar,
    Droplets, Dna, Filter, ChevronDown, RefreshCcw,
    Loader2, AlertTriangle, ClipboardList, Phone,
    AlertCircle, Eye, Printer, SortAsc, SortDesc,
    Baby, Heart,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string): string {
    if (!dob) return "—";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return "—";
    const now = new Date();
    let yrs = now.getFullYear() - d.getFullYear();
    let mos = now.getMonth() - d.getMonth();
    if (mos < 0) { yrs--; mos += 12; }
    if (yrs === 0) return `${mos}mo`;
    if (yrs < 2) return `${yrs}yr ${mos}mo`;
    return `${yrs} yrs`;
}

function isChild(dob?: string): boolean {
    if (!dob) return false;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 13;
}

function fmt(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
    registered: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
    "awaiting-consultation": { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
    "under-consultation": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
    "sent-to-nurse": { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-400" },
    "sent-to-lab": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-400" },
    "sent-to-pharmacy": { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
    "awaiting-payment": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    discharged: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-400" },
};

function StatusBadge({ status }: { status?: string }) {
    const s = status ?? "registered";
    const cfg = STATUS_CFG[s] ?? STATUS_CFG.registered;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {s.replace(/-/g, " ")}
        </span>
    );
}

// ─── PDF Export ────────────────────────────────────────────────────────────────

function exportToPDF(patients: any[]) {
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) return;
    const rows = patients.map(p => `
        <tr>
            <td>${p.name ?? "—"}</td>
            <td>${calcAge(p.birth_date)}</td>
            <td>${p.gender ?? "—"}</td>
            <td>${p.phone ?? "—"}</td>
            <td>${p.blood_group ?? "—"} / ${p.geno_type ?? "—"}</td>
            <td>${p.allergies ?? "None"}</td>
            <td>${(p.status ?? "").replace(/-/g, " ")}</td>
            <td>${fmt(p.created_at)}</td>
        </tr>`).join("");
    printWin.document.write(`
        <html><head><title>Patient Health Records — Nile Valley Hospital</title>
        <style>
            body { font-family: Georgia, serif; padding: 32px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p  { font-size: 11px; color: #666; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-weight: bold; letter-spacing: .04em; font-size: 10px; text-transform: uppercase; }
            td { padding: 7px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
            tr:nth-child(even) td { background: #f8f9fa; }
            @media print { @page { margin: 20mm; size: A4 landscape; } }
        </style></head><body>
        <h1>Nile Valley Mother & Child Hospital</h1>
        <p>Patient Health Records · Generated: ${new Date().toLocaleString("en-GB")} · ${patients.length} patients</p>
        <table>
            <thead><tr>
                <th>Patient Name</th><th>Age</th><th>Gender</th>
                <th>Phone</th><th>Blood / Genotype</th>
                <th>Allergies</th><th>Status</th><th>Registered</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table></body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
}

function exportToCSV(patients: any[]) {
    const headers = ["Name", "Age", "Gender", "DOB", "Phone", "Email", "Blood Group", "Genotype", "Allergies", "Status", "Registered"];
    const rows = patients.map(p => [
        p.name ?? "",
        calcAge(p.birth_date),
        p.gender ?? "",
        fmt(p.birth_date),
        p.phone ?? "",
        p.email ?? "",
        p.blood_group ?? "",
        p.geno_type ?? "",
        (p.allergies ?? "").replace(/,/g, ";"),
        (p.status ?? "").replace(/-/g, " "),
        fmt(p.created_at),
    ].map(v => `"${v}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nile-valley-health-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Patient row ──────────────────────────────────────────────────────────────

function PatientRow({ patient }: { patient: any }) {
    const child = isChild(patient.birth_date);
    return (
        <tr className="group hover:bg-gray-50/80 transition-colors">
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                        ${child ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                        {child ? <Baby size={14} /> : patient.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{patient.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{patient.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3.5">
                <p className="text-sm font-semibold text-gray-700">{calcAge(patient.birth_date)}</p>
                <p className="text-[10px] text-gray-400">{fmt(patient.birth_date)}</p>
            </td>
            <td className="px-4 py-3.5 text-sm font-medium text-gray-600 capitalize">{patient.gender ?? "—"}</td>
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                        {patient.blood_group ?? "—"}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">{patient.geno_type ?? "—"}</span>
                </div>
            </td>
            <td className="px-4 py-3.5">
                {patient.allergies ? (
                    <div className="flex items-center gap-1.5">
                        <AlertCircle size={11} className="text-red-500 shrink-0" />
                        <p className="text-xs text-red-700 font-medium line-clamp-1">{patient.allergies}</p>
                    </div>
                ) : (
                    <p className="text-xs text-gray-300 italic">None recorded</p>
                )}
            </td>
            <td className="px-4 py-3.5">
                <StatusBadge status={patient.status} />
            </td>
            <td className="px-4 py-3.5 text-xs font-medium text-gray-500">{fmt(patient.created_at)}</td>
            <td className="px-4 py-3.5">
                <Link href={`/doctor/health-records/${patient.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-xs font-bold text-gray-600 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                    <Eye size={12} /> View
                </Link>
            </td>
        </tr>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HealthRecordsComponent() {
    const { authorized } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);
    const { data: patients, isLoading, isError, refetch } = useAllPatients();

    const [search, setSearch] = useState("");
    const [gender, setGender] = useState("all");
    const [status, setStatus] = useState("all");
    const [ageGroup, setAgeGroup] = useState("all");
    const [sortField, setSortField] = useState<"name" | "date">("date");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [page, setPage] = useState(1);
    const PER_PAGE = 20;

    const toggleSort = (field: "name" | "date") => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    const filtered = useMemo(() => {
        if (!patients) return [];
        return patients
            .filter((p: any) => {
                const matchSearch = !search ||
                    (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
                    (p.phone ?? "").includes(search) ||
                    (p.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
                    (p.id ?? "").toLowerCase().includes(search.toLowerCase());
                const matchGender = gender === "all" || (p.gender ?? "").toLowerCase() === gender;
                const matchStatus = status === "all" || p.status === status;
                const age = parseInt(calcAge(p.birth_date));
                const matchAge = ageGroup === "all" ||
                    (ageGroup === "child" && isChild(p.birth_date)) ||
                    (ageGroup === "adult" && !isChild(p.birth_date));
                return matchSearch && matchGender && matchStatus && matchAge;
            })
            .sort((a: any, b: any) => {
                const dir = sortDir === "asc" ? 1 : -1;
                if (sortField === "name") return dir * (a.name ?? "").localeCompare(b.name ?? "");
                return dir * (new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
            });
    }, [patients, search, gender, status, ageGroup, sortField, sortDir]);

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const clearFilters = () => { setSearch(""); setGender("all"); setStatus("all"); setAgeGroup("all"); setPage(1); };
    const hasFilters = search || gender !== "all" || status !== "all" || ageGroup !== "all";

    if (!authorized) return null;

    const selectCls = "h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 focus:outline-none appearance-none cursor-pointer";

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Health Records</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {patients?.length ?? 0} registered patients
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => exportToCSV(filtered)} disabled={!filtered.length}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-600 shadow-sm transition-all disabled:opacity-40">
                        <Download size={13} /> Export CSV
                    </button>
                    <button onClick={() => exportToPDF(filtered)} disabled={!filtered.length}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-sm shadow-red-200 transition-all disabled:opacity-40">
                        <Printer size={13} /> Export PDF
                    </button>
                </div>
            </div>

            {/* ── Main card ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Filters */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search name, phone, email, ID..."
                            className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={13} /></button>}
                    </div>

                    {/* Gender */}
                    <div className="relative">
                        <select value={gender} onChange={e => { setGender(e.target.value); setPage(1); }} className={selectCls}>
                            <option value="all">All Genders</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Age group */}
                    <div className="relative">
                        <select value={ageGroup} onChange={e => { setAgeGroup(e.target.value); setPage(1); }} className={selectCls}>
                            <option value="all">All Ages</option>
                            <option value="child">Paediatric (0–12)</option>
                            <option value="adult">Adult (13+)</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Status */}
                    <div className="relative">
                        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
                            <option value="all">All Status</option>
                            <option value="registered">Registered</option>
                            <option value="awaiting-consultation">Awaiting Consultation</option>
                            <option value="under-consultation">Under Consultation</option>
                            <option value="sent-to-lab">Sent to Lab</option>
                            <option value="sent-to-pharmacy">Sent to Pharmacy</option>
                            <option value="awaiting-payment">Awaiting Payment</option>
                            <option value="discharged">Discharged</option>
                        </select>
                        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {hasFilters && (
                        <button onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                            <X size={11} /> Clear
                        </button>
                    )}

                    <button onClick={() => refetch()}
                        className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0">
                        <RefreshCcw size={13} />
                    </button>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 gap-3">
                        <Loader2 size={18} className="text-red-500 animate-spin" />
                        <p className="text-sm text-gray-400">Loading records...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <AlertTriangle size={20} className="text-red-500" />
                        <p className="text-sm font-semibold text-gray-600">Failed to load records</p>
                        <button onClick={() => refetch()} className="text-xs font-bold text-red-600 hover:underline">Retry</button>
                    </div>
                ) : paged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <ClipboardList size={20} className="text-gray-300" />
                        <p className="text-sm font-semibold text-gray-500">No records found</p>
                        {hasFilters && <button onClick={clearFilters} className="text-xs text-red-600 hover:underline">Clear filters</button>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/50">
                                    {[
                                        { label: "Patient", sortKey: "name" as const },
                                        { label: "Age", sortKey: null },
                                        { label: "Gender", sortKey: null },
                                        { label: "Blood / Geno", sortKey: null },
                                        { label: "Allergies", sortKey: null },
                                        { label: "Status", sortKey: null },
                                        { label: "Registered", sortKey: "date" as const },
                                        { label: "", sortKey: null },
                                    ].map(({ label, sortKey }) => (
                                        <th key={label} className="px-4 py-3 text-left">
                                            {sortKey ? (
                                                <button onClick={() => toggleSort(sortKey)}
                                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors">
                                                    {label}
                                                    {sortField === sortKey
                                                        ? sortDir === "asc"
                                                            ? <SortAsc size={11} className="text-red-500" />
                                                            : <SortDesc size={11} className="text-red-500" />
                                                        : <SortAsc size={11} className="text-gray-200" />}
                                                </button>
                                            ) : (
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paged.map((p: any) => <PatientRow key={p.id} patient={p} />)}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-medium">
                            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-500 flex items-center justify-center text-xs font-bold hover:border-gray-300 disabled:opacity-40 transition-colors">
                                ‹
                            </button>
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                const n = i + 1;
                                return (
                                    <button key={n} onClick={() => setPage(n)}
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all
                                            ${page === n
                                                ? "bg-red-700 text-white border border-red-700 shadow-sm"
                                                : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                                        {n}
                                    </button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="w-8 h-8 rounded-xl border border-gray-200 bg-white text-gray-500 flex items-center justify-center text-xs font-bold hover:border-gray-300 disabled:opacity-40 transition-colors">
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}