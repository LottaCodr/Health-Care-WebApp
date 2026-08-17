"use client";

import React, { useState, useMemo } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCompletedLabRequests } from "@/hooks/emr/use-lab";
import {
    FlaskConical, Search, RefreshCcw, CheckCircle2,
    Clock, Calendar, User, X, ChevronDown,
    Microscope, Loader2, AlertTriangle, FileText,
    Phone, Hash, Droplets, Beaker,
} from "lucide-react";
import { useLabStore } from "@/store/lab-store";
import { calculateAge } from "@/utils/export";
import { parseLabResult } from "@/lib/clinical/hematology-reference-ranges";
import HematologyAnalyzerReport from "./HematologyAnalyzerReport";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400", border: "border-gray-200" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-200" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", border: "border-red-200" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

function getInitials(name?: string) {
    if (!name) return "?";
    return name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

// Shared structured-result parser (handles both the legacy 4-column format
// and the analyzer 5-column format with flags) — lives in the clinical module.
const parseStructuredResult = parseLabResult;

// ─── Result detail panel ──────────────────────────────────────────────────────

function ResultPanel({ req, onClose }: { req: any; onClose: () => void }) {
    const patient = req.patients ?? {};
    const patientName = patient?.name ?? null;
    const patientPhone = patient?.phone;
    const patientGender = patient?.gender;
    const patientAge = patient?.birth_date ? calculateAge(patient.birth_date) : null;
    const parsed = parseStructuredResult(req.result);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-green-50/60 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
                        <CheckCircle2 size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{req.test_type ?? "Lab Test"}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                            Completed {fmt(req.completed_at)} · {fmtTime(req.completed_at)}
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline font-mono">ID: {req.visit_id?.slice(-8).toUpperCase() ?? req.id.slice(-6).toUpperCase()}</span>
                        </p>
                    </div>
                </div>
                <button onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="px-5 py-4 space-y-4">
                {/* Patient details - important */}
                {patientName && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                            {getInitials(patientName)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{patientName}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-indigo-100 text-indigo-700">
                                    <Hash size={10} /> {req.visit_id?.slice(-8).toUpperCase() ?? "—"}
                                </span>
                                {patientAge !== null && <span className="text-xs text-gray-600">{patientAge} yrs</span>}
                                {patientGender && <span className="text-xs text-gray-600">• {patientGender}</span>}
                                {patientPhone && <span className="text-xs text-gray-600 flex items-center gap-1">• <Phone size={10} /> {patientPhone}</span>}
                                {patient?.blood_group && <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><Droplets size={10} className="inline" /> {patient.blood_group}</span>}
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={req.priority} />
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Hash size={11} className="text-gray-400" /> Patient: <span className="font-mono font-bold">{req.visit_id?.slice(-8) ?? req.id.slice(-6)}</span>
                    </span>
                    {req.completed_by && (
                        <span className="text-xs text-gray-500">By: <span className="font-mono">{req.completed_by?.slice(0, 8)}</span></span>
                    )}
                </div>
                {req.notes && (
                    <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-xs text-blue-700"><span className="font-bold">Doctor&apos;s note:</span> {req.notes}</p>
                    </div>
                )}
                {req.result && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Beaker size={12} className="text-indigo-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Structured Result</p>
                        </div>
                        {parsed?.kind === "hematology-analyzer" && parsed.rows.length > 0 ? (
                            <HematologyAnalyzerReport request={req} />
                        ) : parsed?.kind !== "free" && parsed && parsed.rows.length > 0 ? (
                            <div className="space-y-3">
                                {(parsed.category || parsed.name) && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {parsed.category && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{parsed.category}</span>}
                                        <span className="text-xs font-bold text-gray-800">{parsed.name}</span>
                                        {parsed.referenceSet && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{parsed.referenceSet}</span>
                                        )}
                                    </div>
                                )}
                                <div className="overflow-hidden rounded-xl border border-gray-200">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Test</th>
                                                {parsed.rows.some((r) => r.flag) && (
                                                    <th className="text-center px-2 py-2 font-black uppercase tracking-widest text-gray-500 w-10">Flag</th>
                                                )}
                                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Result</th>
                                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500 hidden sm:table-cell">Ref.</th>
                                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {parsed.rows.map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50">
                                                    <td className="px-3 py-2 font-semibold text-gray-800">{r.label}</td>
                                                    {parsed.rows.some((rr) => rr.flag) && (
                                                        <td className="px-2 py-2 text-center">
                                                            {r.flag && (
                                                                <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black border ${
                                                                    r.flag === "H" ? "bg-red-50 text-red-700 border-red-200" : "bg-sky-50 text-sky-700 border-sky-200"
                                                                }`}>
                                                                    {r.flag}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2 font-bold text-indigo-700">{r.value || "—"}</td>
                                                    <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{r.ref || "—"}</td>
                                                    <td className="px-3 py-2 text-gray-500 font-mono text-[11px]">{r.unit || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsed.note && (
                                    <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                        <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">{parsed.note}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                                {req.result}
                            </pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LabReportsPage() {
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: results, isLoading: loading, error, refetch } = useCompletedLabRequests();

    const {
        reportSearch: search, setField, reportPriority: priority,
        reportDateRange: dateRange, reportSelected: selected
    } = useLabStore();

    const filtered = useMemo(() => {
        if (!results) return [];
        const now = new Date();
        return results.filter((r: any) => {
            const patientName = r.patients?.name ?? "";
            const matchSearch = !search ||
                (r.test_type ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (r.result ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (r.visit_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
                patientName.toLowerCase().includes(search.toLowerCase());
            const matchPriority = priority === "all" || r.priority === priority;
            const completedAt = r.completed_at ? new Date(r.completed_at) : null;
            let matchDate = true;
            if (completedAt) {
                if (dateRange === "today") matchDate = completedAt.toDateString() === now.toDateString();
                else if (dateRange === "week") matchDate = (now.getTime() - completedAt.getTime()) < 7 * 86400000;
                else if (dateRange === "month") matchDate = (now.getTime() - completedAt.getTime()) < 30 * 86400000;
            }
            return matchSearch && matchPriority && matchDate;
        });
    }, [results, search, priority, dateRange]);

    if (!authorized) return null;

    const statCount = results?.length ?? 0;
    const todayCount = results?.filter((r: any) => r.completed_at && new Date(r.completed_at).toDateString() === new Date().toDateString()).length ?? 0;
    const statTests = results?.filter((r: any) => r.priority === "stat").length ?? 0;

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Reports", value: statCount, icon: Microscope, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
                    { label: "Today", value: todayCount, icon: Calendar, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "STAT Tests", value: statTests, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                ].map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Main content ── */}
            <div className={`grid gap-5 ${selected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>

                {/* Results list */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <FlaskConical size={16} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800 leading-tight">Lab Reports</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {statCount} results • patient details included</p>
                            </div>
                        </div>
                        <button onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 flex-wrap">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input value={search} onChange={(e) => setField("reportSearch", e.target.value)}
                                placeholder="Search test, patient, result..."
                                className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 focus:bg-white transition-all" />
                            {search && <button onClick={() => setField("reportSearch", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                        </div>
                        <div className="relative">
                            <select value={priority} onChange={(e) => setField("reportPriority", e.target.value)}
                                className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer">
                                <option value="all">All Priority</option>
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={dateRange} onChange={(e) => setField("reportDateRange", e.target.value as any)}
                                className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer">
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* List */}
                    <div className="px-6 py-5 space-y-2.5 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 gap-3">
                                <Loader2 size={18} className="text-indigo-500 animate-spin" />
                                <p className="text-sm text-gray-400">Loading reports...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-red-500" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600">Failed to load reports</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    <FlaskConical size={20} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">No reports found</p>
                                <p className="text-xs text-gray-400">Try adjusting your filters</p>
                            </div>
                        ) : filtered.map((req: any) => {
                            const patient = req.patients ?? {};
                            const patientName = patient?.name ?? `Patient #${req.visit_id?.slice(-6) ?? req.id.slice(-6)}`;
                            const patientIdShort = req.visit_id?.slice(-6).toUpperCase() ?? req.id.slice(-6).toUpperCase();
                            return (
                                <button key={req.id} onClick={() => setField("reportSelected", selected?.id === req.id ? null : req)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all
                                        ${selected?.id === req.id
                                            ? "border-indigo-200 bg-indigo-50/50"
                                            : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm"
                                        }`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                            <CheckCircle2 size={14} className="text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                                                <PriorityBadge priority={req.priority} />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                                                    <User size={11} className="text-gray-400" /> {patientName}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded">#{patientIdShort}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400">{fmt(req.completed_at)}</span>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs text-gray-400">{fmtTime(req.completed_at)}</span>
                                            </div>
                                        </div>
                                        <FileText size={14} className={`shrink-0 mt-1 ${selected?.id === req.id ? "text-indigo-500" : "text-gray-300"}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Result Details • Properly Arranged</p>
                        <ResultPanel req={selected} onClose={() => setField("reportSelected", null)} />
                    </div>
                )}
            </div>
        </div>
    );
}
