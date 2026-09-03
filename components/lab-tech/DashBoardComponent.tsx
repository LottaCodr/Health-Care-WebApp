"use client";

import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests, useCompletedLabRequests, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    FlaskConical, CheckCircle2, Clock,
    RefreshCcw, FileText, AlertTriangle, User,
    Phone, Calendar, Droplets, Beaker, Hash,
    ChevronDown, ChevronUp, Activity, Microscope,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtFull, fmtTime } from "@/lib/utils";
import { useLabStore } from "@/store/lab-store";
import TestTemplateForm from "./TestTemplateForm";
import { calculateAge } from "@/utils/export";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string) {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatDate(iso?: string) {
    if (!iso) return "—";
    return fmtDate(iso);
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
    routine: { label: "Routine", color: "text-gray-600",  bg: "bg-gray-100",  dot: "bg-gray-400", border: "border-gray-200"  },
    urgent:  { label: "Urgent",  color: "text-amber-700", bg: "bg-amber-50",  dot: "bg-amber-500", border: "border-amber-200" },
    stat:    { label: "STAT",    color: "text-red-700",   bg: "bg-red-50",    dot: "bg-red-500", border: "border-red-200"   },
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

// ─── Result preview parser for completed ─────────────────────────────────────
const PREVIEW_SKIP = [
    "TEST NAME", "PARAMETER", "─", "Note:", "Additional Notes",
    "Reference set:", "Sample ID:", "Mode:", "Test Time:",
    "HEMATOLOGY ANALYZER", "Full Blood Count (FBC)",
    "[The test result only accounts for this test sample]",
];

function parseResultPreview(result?: string, maxLen = 80) {
    if (!result) return "Result recorded";
    // Try to extract first meaningful lines after header
    const lines = result.split("\n").filter(l => {
        const t = l.trim();
        return t && !PREVIEW_SKIP.some((s) => t.includes(s));
    });
    // Skip category and name lines if they look like headers
    const meaningful = lines.slice(2).join(" • ") || result;
    return meaningful.slice(0, maxLen) + (meaningful.length > maxLen ? "…" : "");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LabTechDashboard() {
    const { user }   = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: pendingData = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingLabRequests();
    const { data: completedData = [], isLoading: completedLoading, refetch: refetchCompleted } = useCompletedLabRequests();

    const {
        dashboardActiveId:     activeId,
        dashboardResultText:   resultText,
        dashboardSubmittingId: submittingId,
        setField,
        setDashboardResultText,
    } = useLabStore();

    const { mutate: updateLabRequest } = useUpdateLabRequest();

    if (!authorized) return null;

    const pending   = (pendingData as any[]).filter(r => r.status === "pending");
    const completed = (completedData as any[]);

    const handleSubmitResult = (reqId: string, resultOverride?: string, priceOverride?: number) => {
        const result = resultOverride ?? resultText[reqId]?.trim();
        if (!result) { toast.error("Please enter the test result."); return; }
        setField("dashboardSubmittingId", reqId);
        updateLabRequest(
            {
                id: reqId,
                updates: {
                    status:       "completed",
                    result,
                    completed_by: user?.$id ?? user?.id,
                    completed_at: new Date().toISOString(),
                    ...(priceOverride && priceOverride > 0 ? { price: priceOverride } : {}),
                },
            },
            {
                onSuccess: () => {
                    toast.success("Result submitted and updated in billing.");
                    setDashboardResultText(reqId, "");
                    setField("dashboardActiveId", null);
                    refetchPending();
                    refetchCompleted();
                },
                onError:   () => toast.error("Failed to submit result."),
                onSettled: () => setField("dashboardSubmittingId", null),
            }
        );
    };

    const refetch = () => { refetchPending(); refetchCompleted(); };

    return (
        <div className="space-y-6">

            <DashboardHeader
                title="Laboratory workspace"
                description="Work through priority specimens, enter structured results, and review today’s completed tests."
                icon={FlaskConical}
                tone="indigo"
                actions={
                    <Link href="/lab-tech/catalog" className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                        <Microscope size={13} /> Test catalog
                    </Link>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: "Pending Tests",  value: pending.length,   icon: Clock,        color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Completed",      value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "STAT Priority",  value: pending.filter((r: any) => r.priority === "stat").length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow`}>
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

            {/* Pending requests */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <FlaskConical size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Lab Requests Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Tests awaiting results • sorted by priority • patient details included</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {pending.length} pending
                            </span>
                        )}
                        <button onClick={refetch}
                            type="button"
                            aria-label="Refresh laboratory queues"
                            disabled={pendingLoading || completedLoading}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:cursor-wait disabled:opacity-60">
                            <RefreshCcw size={13} className={pendingLoading || completedLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                <div className="px-4 sm:px-6 py-5 space-y-4">
                    {pendingLoading ? <LoadingSkeleton rows={4} /> : pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Queue clear</p>
                            <p className="text-xs text-gray-400">No pending lab requests</p>
                        </div>
                    ) : (
                        // Sort: STAT first, then urgent, then routine
                        [...pending].sort((a: any, b: any) => {
                            const order = { stat: 0, urgent: 1, routine: 2 };
                            return (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
                        }).map((req: any) => {
                            const isExpanded    = activeId === req.id;
                            const patient = req.patients ?? {};
                            const patientName   = patient?.name ?? req.patient_name ?? `Patient #${req.visit_id?.slice(-6) ?? req.id.slice(-6)}`;
                            const patientPhone = patient?.phone;
                            const patientGender = patient?.gender;
                            const patientAge = patient?.birth_date ? calculateAge(patient.birth_date) : null;
                            const patientIdShort = req.visit_id ? `#${req.visit_id.slice(-8).toUpperCase()}` : `#${req.id.slice(-6).toUpperCase()}`;
                            const patientBg = patient?.blood_group;
                            const requestedByName = req.staffs?.name ?? null;
                            const elapsed       = timeAgo(req.created_at);

                            return (
                                <div key={req.id} className={`rounded-2xl border overflow-hidden transition-all ${isExpanded ? "border-indigo-200 bg-indigo-50/20 shadow-sm" : "border-gray-200 bg-white hover:border-indigo-100 hover:shadow-sm"}`}>
                                    {/* Priority accent bar */}
                                    <div className={`h-1 w-full ${req.priority === "stat" ? "bg-red-500" : req.priority === "urgent" ? "bg-amber-400" : "bg-gray-200"}`} />
                                    <div className="p-4 sm:p-5">
                                        {/* Top: Patient header */}
                                        <div className="flex items-start gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 text-white font-black text-sm shadow-sm">
                                                {getInitials(patientName)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-sm font-bold text-gray-900 truncate">{patientName}</h3>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-mono font-bold text-gray-600">
                                                        <Hash size={10} /> {patientIdShort}
                                                    </span>
                                                    <PriorityBadge priority={req.priority} />
                                                </div>
                                                {/* Patient important details row */}
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {patientAge !== null && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                            <Calendar size={11} className="text-gray-400" /> {patientAge} yrs
                                                        </span>
                                                    )}
                                                    {patientGender && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                            <User size={11} className="text-gray-400" /> {patientGender}
                                                        </span>
                                                    )}
                                                    {patientPhone && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                            <Phone size={11} className="text-gray-400" /> {patientPhone}
                                                        </span>
                                                    )}
                                                    {patientBg && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                                            <Droplets size={11} /> {patientBg}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Test + meta */}
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                                                        <Beaker size={11} /> {req.test_type ?? "Lab Test"}
                                                    </span>
                                                    {elapsed && (
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <Clock size={11} /> {elapsed}
                                                        </span>
                                                    )}
                                                    {requestedByName && (
                                                        <span className="text-xs text-gray-500">• Requested by Dr. {requestedByName}</span>
                                                    )}
                                                </div>
                                                {req.notes && (
                                                    <div className="mt-2.5 flex items-start gap-2 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-xl">
                                                        <FileText size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                                        <p className="text-xs text-blue-700 leading-relaxed"><span className="font-bold">Doctor&apos;s note:</span> {req.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fmtDate(req.created_at)}</span>
                                                <button
                                                    onClick={() => setField("dashboardActiveId", isExpanded ? null : req.id)}
                                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${isExpanded ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}>
                                                    {isExpanded ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={12} /> Enter Result</>}
                                                </button>
                                            </div>
                                        </div>
                                        {/* Mobile action */}
                                        <div className="sm:hidden mt-3">
                                            <button
                                                onClick={() => setField("dashboardActiveId", isExpanded ? null : req.id)}
                                                className={`w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${isExpanded ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}>
                                                {isExpanded ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={12} /> Enter Result for {patientName.split(" ")[0]}</>}
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-indigo-100 bg-white">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Activity size={14} className="text-indigo-600" />
                                                <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Enter Structured Result — {req.test_type}</p>
                                                <span className="ml-auto text-xs text-gray-400 font-mono">{patientIdShort} • {patientName}</span>
                                            </div>
                                            <TestTemplateForm
                                                testType={req.test_type ?? ""}
                                                submitting={submittingId === req.id}
                                                onSubmit={async (resultString) => {
                                                    handleSubmitResult(req.id, resultString);
                                                }}
                                            />
                                            <div className="flex justify-end mt-3">
                                                <button onClick={() => setField("dashboardActiveId", null)}
                                                    className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Completed */}
            {completed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Completed Tests</p>
                            <p className="text-xs text-gray-400 mt-0.5">{completed.length} result{completed.length !== 1 ? "s" : ""} • most recent first</p>
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 py-4 space-y-3 max-h-[520px] overflow-y-auto">
                        {completed.slice(0, 20).map((req: any) => {
                            const patient = req.patients ?? {};
                            const patientName = patient?.name ?? req.patient_name ?? `Test #${req.id?.slice(-6)}`;
                            const patientIdShort = req.visit_id ? `#${req.visit_id.slice(-8).toUpperCase()}` : `#${req.id.slice(-6)}`;
                            return (
                                <div key={req.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-green-100 hover:shadow-sm transition-all">
                                    <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 size={14} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-xs font-bold text-gray-800">{req.test_type}</p>
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">{patientIdShort}</span>
                                            <PriorityBadge priority={req.priority} />
                                        </div>
                                        <p className="text-xs font-semibold text-gray-700 mt-1 truncate">{patientName}</p>
                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                            {parseResultPreview(req.result)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] font-bold text-gray-500">{fmtDate(req.completed_at)}</p>
                                        <p className="text-[10px] text-gray-400">{fmtTime(req.completed_at)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
