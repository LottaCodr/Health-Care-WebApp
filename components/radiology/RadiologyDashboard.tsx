"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { toast } from "sonner";
import {
    usePendingRadiologyRequests,
    useCompletedRadiologyRequests,
    useSubmitRadiologyReport,
} from "@/hooks/emr/use-emr";
import { stripRadiologyPrefix } from "@/lib/utils";
import {
    Radio, CheckCircle2, Clock, RefreshCcw, FileText,
    Loader2, AlertTriangle, Image, ChevronDown, User,
} from "lucide-react";
import { useRadiologyStore } from "@/store/radiology-store";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string) {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function fmtTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600",  bg: "bg-gray-100",  border: "border-gray-200",  dot: "bg-gray-400"  },
    urgent:  { label: "Urgent",  color: "text-amber-700", bg: "bg-amber-50",  border: "border-amber-200", dot: "bg-amber-500" },
    stat:    { label: "STAT",    color: "text-red-700",   bg: "bg-red-50",    border: "border-red-200",   dot: "bg-red-500"   },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

// ─── Request card ─────────────────────────────────────────────────────────────

function RequestCard({ request }: { request: any }) {
    const { user } = useAuth();
    const { mutate: submitReport, isPending: saving } = useSubmitRadiologyReport();
    const { inlineForms, inlineExpanded, setInlineFormField, toggleInlineExpanded, clearInlineForm } = useRadiologyStore();

    const form         = inlineForms[request.id]  || { resultText: "", isCritical: false, criticalNote: "" };
    const open         = inlineExpanded[request.id] ?? false;
    const patientName  = request.patients?.name ?? null;
    const doctorName   = request.staffs?.name   ?? null;
    const elapsed      = timeAgo(request.created_at);

    const handleSubmit = () => {
        if (!form.resultText.trim()) { toast.error("Enter the radiology report before submitting."); return; }
        const fullReport = [
            form.resultText,
            form.isCritical ? `\n\n⚠ CRITICAL FINDING:\n${form.criticalNote}` : null,
        ].filter(Boolean).join("");

        submitReport(
            { id: request.id, report: { status: "completed", result: fullReport, completed_by: user?.id ?? user?.$id ?? "", completed_at: new Date().toISOString() } },
            {
                onSuccess: () => {
                    toast.success("Radiology report submitted and patient returned to the doctor queue.");
                    clearInlineForm(request.id);
                },
                onError: (err: any) => toast.error(err?.message ?? "Failed to submit report."),
            }
        );
    };

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
            open ? "border-cyan-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-cyan-100 hover:shadow-sm"
        }`}>
            <div className="flex flex-wrap items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Image size={15} className="text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{stripRadiologyPrefix(request.test_type)}</p>
                        <PriorityBadge priority={request.priority} />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                        {patientName && (
                            <span className="flex items-center gap-1 font-medium text-gray-600">
                                <User size={10} /> {patientName}
                            </span>
                        )}
                        {doctorName && <span>Requested by Dr. {doctorName}</span>}
                        {elapsed && <span className="text-gray-300">· {elapsed}</span>}
                    </div>
                    {request.notes && (
                        <p className="text-xs text-blue-600 italic">"{request.notes}"</p>
                    )}
                </div>
                <button onClick={() => toggleInlineExpanded(request.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm w-full justify-center sm:w-auto shrink-0 ${
                        open ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-200"
                    }`}>
                    <FileText size={12} />
                    {open ? "Cancel" : "Enter Report"}
                </button>
            </div>

            {open && (
                <div className="px-5 pb-5 pt-2 space-y-3 border-t border-cyan-100 bg-cyan-50/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Radiology Report / Findings</p>
                    <textarea
                        value={form.resultText} rows={6}
                        onChange={e => setInlineFormField(request.id, "resultText", e.target.value)}
                        placeholder={`Describe findings systematically:\n\nLungs: Clear. No consolidation or effusion.\nHeart: Normal size and contour.\n\nImpression:\n1. No acute cardiopulmonary disease.`}
                        className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 placeholder:text-gray-300 transition-all"
                    />
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div onClick={() => setInlineFormField(request.id, "isCritical", !form.isCritical)}
                            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${form.isCritical ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-red-400"}`}>
                            {form.isCritical && <CheckCircle2 size={11} className="text-white" />}
                        </div>
                        <p className="text-xs font-bold text-red-600">⚠ Critical Finding — notify doctor immediately</p>
                    </label>
                    {form.isCritical && (
                        <textarea rows={2} value={form.criticalNote}
                            onChange={e => setInlineFormField(request.id, "criticalNote", e.target.value)}
                            placeholder="Describe the critical finding and urgency of action..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-800 placeholder:text-red-300 focus:outline-none focus:border-red-400 resize-none"
                        />
                    )}
                    <div className="flex justify-end gap-2">
                        <button onClick={() => toggleInlineExpanded(request.id)}
                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={saving || !form.resultText.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm shadow-cyan-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {saving ? <><Loader2 size={12} className="animate-spin" /> Submitting...</> : <><CheckCircle2 size={13} /> Submit Report</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Completed card ───────────────────────────────────────────────────────────

function CompletedCard({ request }: { request: any }) {
    const [expanded, setExpanded] = useState(false);
    const patientName = request.patients?.name ?? null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50/60 transition-colors">
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{stripRadiologyPrefix(request.test_type)}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        {patientName && <span className="font-medium text-gray-500">{patientName}</span>}
                        <span className="line-clamp-1">{request.result ?? "Report recorded"}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[10px] text-gray-400">{fmtTime(request.completed_at)}</p>
                    <ChevronDown size={13} className={`text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                </div>
            </button>
            {expanded && request.result && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5 max-h-48 overflow-y-auto">
                        {request.result}
                    </pre>
                    {request.notes && (
                        <div className="mt-2.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-[10px] text-blue-700">
                                <span className="font-bold">Clinical indication: </span>{request.notes}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RadiologyDashboard() {
    const { authorized, loading: protectionLoading } = useRoleProtection([UserRole.Radiologist, UserRole.Admin]);

    const { data: pending = [], isPending: loadingPending, isError: pendingError, refetch } = usePendingRadiologyRequests();
    const { data: completed = [], isPending: loadingCompleted } = useCompletedRadiologyRequests();

    if (protectionLoading) {
        return <div className="h-64 animate-pulse rounded-3xl border border-gray-100 bg-white" />;
    }
    if (!authorized) return null;

    // Sort pending: STAT first, then urgent, then routine
    const sortedPending = [...(pending as any[])].sort((a, b) => {
        const order = { stat: 0, urgent: 1, routine: 2 };
        return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
    });

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Radiology workspace"
                description="Prioritize imaging requests, report critical findings, and review filed investigations."
                icon={Radio}
                tone="cyan"
                actions={
                    <div className="flex items-center gap-2">
                        <Link href="/radiology/reports" className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50 px-3 text-xs font-bold text-cyan-700 transition-colors hover:bg-cyan-100">
                            <FileText size={13} /> Reports
                        </Link>
                        <button onClick={() => refetch()}
                            type="button"
                            aria-label="Refresh radiology queue"
                            disabled={loadingPending || loadingCompleted}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60">
                            <RefreshCcw size={13} className={loadingPending || loadingCompleted ? "animate-spin" : ""} />
                        </button>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                    { label: "Pending Reports", value: (pending as any[]).length,   icon: Clock,        color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Reports Filed",    value: (completed as any[]).length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "STAT / Urgent",    value: (pending as any[]).filter((r: any) => r.priority === "stat" || r.priority === "urgent").length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow`}>
                        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon size={19} className={color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                            <Radio size={16} className="text-cyan-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Pending Reports</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Sorted by priority — STAT first</p>
                        </div>
                    </div>
                    {(pending as any[]).length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            {(pending as any[]).length} pending
                        </span>
                    )}
                </div>
                <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-3">
                    {loadingPending ? (
                        <div className="flex items-center justify-center py-12 gap-3">
                            <Loader2 size={16} className="text-cyan-500 animate-spin" />
                            <p className="text-sm text-gray-400">Loading requests...</p>
                        </div>
                    ) : pendingError ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <AlertTriangle size={18} className="text-red-500" />
                            <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline">Retry</button>
                        </div>
                    ) : sortedPending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">No pending requests</p>
                        </div>
                    ) : sortedPending.map((req: any) => <RequestCard key={req.id} request={req} />)}
                </div>
            </div>

            {/* Completed */}
            {((completed as any[]).length > 0 || loadingCompleted) && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Filed Reports</p>
                            <p className="text-xs text-gray-400 mt-0.5">{(completed as any[]).length} completed report{(completed as any[]).length !== 1 ? "s" : ""} on record</p>
                        </div>
                    </div>
                    <div className="px-4 py-4 sm:px-6 space-y-2">
                        {loadingCompleted ? (
                            <div className="flex items-center justify-center py-8 gap-3">
                                <Loader2 size={14} className="text-gray-400 animate-spin" />
                            </div>
                        ) : (
                            (completed as any[]).map((req: any) => <CompletedCard key={req.id} request={req} />)
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}