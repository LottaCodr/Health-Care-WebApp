"use client";

import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    FlaskConical, CheckCircle2, Clock,
    RefreshCcw, FileText, AlertTriangle, User,
} from "lucide-react";
import { toast } from "sonner";
import { useLabStore } from "@/store/lab-store";
import TestTemplateForm from "./TestTemplateForm";

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

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600",  bg: "bg-gray-100",  dot: "bg-gray-400"  },
    urgent:  { label: "Urgent",  color: "text-amber-700", bg: "bg-amber-50",  dot: "bg-amber-500" },
    stat:    { label: "STAT",    color: "text-red-700",   bg: "bg-red-50",    dot: "bg-red-500"   },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabTechDashboard() {
    const { user }   = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: requests = [], isLoading, refetch } = usePendingLabRequests();

    const {
        dashboardActiveId:     activeId,
        dashboardResultText:   resultText,
        dashboardSubmittingId: submittingId,
        setField,
        setDashboardResultText,
    } = useLabStore();

    const { mutate: updateLabRequest } = useUpdateLabRequest();

    if (!authorized) return null;

    const pending   = (requests as any[]).filter(r => r.status === "pending");
    const completed = (requests as any[]).filter(r => r.status === "completed");

    const handleSubmitResult = (reqId: string, resultOverride?: string) => {
        const result = resultOverride ?? resultText[reqId]?.trim();
        if (!result) { toast.error("Please enter the test result."); return; }
        setField("dashboardSubmittingId", reqId);
        updateLabRequest(
            {
                id: reqId,
                updates: {
                    status:       "completed",
                    result,
                    completed_by: user?.$id,
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    toast.success("Result submitted.");
                    setDashboardResultText(reqId, "");
                    setField("dashboardActiveId", null);
                    refetch();
                },
                onError:   () => toast.error("Failed to submit result."),
                onSettled: () => setField("dashboardSubmittingId", null),
            }
        );
    };

    return (
        <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Pending Tests",  value: pending.length,   icon: Clock,        color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Completed",      value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
                    { label: "STAT Priority",  value: pending.filter((r: any) => r.priority === "stat").length, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
                ].map(s => {
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

            {/* Pending requests */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <FlaskConical size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Lab Requests</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Tests awaiting results · sorted by priority</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {pending.length} pending
                            </span>
                        )}
                        <button onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-3">
                    {isLoading ? <LoadingSkeleton rows={4} /> : pending.length === 0 ? (
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
                            const patientName   = req.patients?.name ?? req.patient_name ?? null;
                            const requestedByName = req.staffs?.name ?? null;
                            const elapsed       = timeAgo(req.created_at);

                            return (
                                <div key={req.id} className={`rounded-2xl border overflow-hidden transition-all ${
                                    isExpanded ? "border-indigo-200 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm"
                                }`}>
                                    <div className="flex items-start gap-3 p-4">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                            req.priority === "stat" ? "bg-red-500" : req.priority === "urgent" ? "bg-amber-400" : "bg-gray-300"
                                        }`} />

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                                                <PriorityBadge priority={req.priority} />
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                                                {patientName && (
                                                    <span className="flex items-center gap-1 font-medium text-gray-600">
                                                        <User size={10} /> {patientName}
                                                    </span>
                                                )}
                                                {requestedByName && <span>Requested by Dr. {requestedByName}</span>}
                                                {elapsed && <span>· {elapsed}</span>}
                                            </div>
                                            {req.notes && (
                                                <p className="text-xs text-blue-600 italic">"{req.notes}"</p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setField("dashboardActiveId", isExpanded ? null : req.id)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shrink-0 ${
                                                isExpanded
                                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                            }`}>
                                            <FileText size={12} />
                                            {isExpanded ? "Cancel" : "Enter Result"}
                                        </button>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-5 pb-5 pt-3 border-t border-indigo-100">
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
                                                    Cancel
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
                            <p className="text-xs text-gray-400 mt-0.5">{completed.length} result{completed.length !== 1 ? "s" : ""} submitted today</p>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {completed.map((req: any) => {
                            const patientName = req.patients?.name ?? req.patient_name ?? `Test #${req.id?.slice(-6)}`;
                            return (
                                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{req.test_type}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {patientName} · {req.result ? req.result.slice(0, 40) + (req.result.length > 40 ? "…" : "") : "Result recorded"}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 shrink-0">{fmtTime(req.completed_at)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}