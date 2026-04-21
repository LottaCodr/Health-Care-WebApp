"use client";

import React, { useState, useMemo } from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCompletedLabRequests } from "@/hooks/emr/use-lab";
import {
    FlaskConical, Search, RefreshCcw, CheckCircle2,
    Clock, Calendar, User, X, ChevronDown,
    Microscope, Loader2, AlertTriangle, FileText,
    Filter,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

// ─── Result detail panel ──────────────────────────────────────────────────────

function ResultPanel({ req, onClose }: { req: any; onClose: () => void }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                        <CheckCircle2 size={15} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{req.test_type ?? "Lab Test"}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            Completed {fmt(req.completed_at)} · {fmtTime(req.completed_at)}
                        </p>
                    </div>
                </div>
                <button onClick={onClose}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X size={14} />
                </button>
            </div>
            <div className="px-5 py-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <PriorityBadge priority={req.priority} />
                    <span className="text-xs text-gray-500">Patient: <span className="font-mono font-bold">{req.visit_id?.slice(-8) ?? "—"}</span></span>
                    {req.completed_by && (
                        <span className="text-xs text-gray-500">By: <span className="font-mono">{req.completed_by?.slice(0, 8)}</span></span>
                    )}
                </div>
                {req.notes && (
                    <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-xs text-blue-700"><span className="font-bold">Doctor's note:</span> {req.notes}</p>
                    </div>
                )}
                {req.result && (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Result</p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                            {req.result}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabReportsPage() {
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: results, loading, error, refetch } = useCompletedLabRequests();

    const [search, setSearch] = useState("");
    const [priority, setPriority] = useState("all");
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "all">("all");
    const [selected, setSelected] = useState<any | null>(null);

    const filtered = useMemo(() => {
        if (!results) return [];
        const now = new Date();
        return results.filter((r: any) => {
            const matchSearch = !search ||
                (r.test_type ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (r.result ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (r.visit_id ?? "").toLowerCase().includes(search.toLowerCase());
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
                                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {statCount} results</p>
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
                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search test, result, patient..."
                                className="w-full h-9 pl-9 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 focus:bg-white transition-all" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                        </div>
                        <div className="relative">
                            <select value={priority} onChange={(e) => setPriority(e.target.value)}
                                className="h-9 pl-3 pr-8 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:outline-none appearance-none cursor-pointer">
                                <option value="all">All Priority</option>
                                <option value="routine">Routine</option>
                                <option value="urgent">Urgent</option>
                                <option value="stat">STAT</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}
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
                        ) : filtered.map((req: any) => (
                            <button key={req.id} onClick={() => setSelected(selected?.id === req.id ? null : req)}
                                className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all
                                    ${selected?.id === req.id
                                        ? "border-indigo-200 bg-indigo-50/50"
                                        : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm"
                                    }`}>
                                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                                        <PriorityBadge priority={req.priority} />
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-xs text-gray-400 font-mono">#{req.visit_id?.slice(-6)}</span>
                                        <span className="text-xs text-gray-400">{fmt(req.completed_at)}</span>
                                    </div>
                                </div>
                                <FileText size={14} className={selected?.id === req.id ? "text-indigo-500" : "text-gray-300"} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Result Details</p>
                        <ResultPanel req={selected} onClose={() => setSelected(null)} />
                    </div>
                )}
            </div>
        </div>
    );
}