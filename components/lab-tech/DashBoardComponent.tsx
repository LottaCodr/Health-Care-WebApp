"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    FlaskConical, CheckCircle2, Clock,
    Loader2, RefreshCcw, FileText,
} from "lucide-react";
import { toast } from "sonner";

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

export default function LabTechDashboard() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: requests, loading, refetch } = usePendingLabRequests();
    const { mutate: updateLabRequest } = useUpdateLabRequest();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [resultText, setResultText] = useState<Record<string, string>>({});
    const [submittingId, setSubmittingId] = useState<string | null>(null);

    if (!authorized) return null;

    const pending = requests?.filter((r: any) => r.status === "pending") ?? [];
    const completed = requests?.filter((r: any) => r.status === "completed") ?? [];

    const handleSubmitResult = async (reqId: string) => {
        const result = resultText[reqId]?.trim();
        if (!result) { toast.error("Please enter the test result."); return; }
        setSubmittingId(reqId);
        try {
            await updateLabRequest(reqId, {
                status: "completed", result,
                completed_by: user?.$id,
                completed_at: new Date().toISOString(),
            });
            toast.success("Result submitted.");
            setResultText((p) => { const n = { ...p }; delete n[reqId]; return n; });
            setActiveId(null);
            refetch();
        } catch { toast.error("Failed to submit result."); }
        finally { setSubmittingId(null); }
    };

    return (
        <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: "Pending Tests", value: pending.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
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

            {/* Pending requests */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <FlaskConical size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Lab Requests</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Tests awaiting results</p>
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
                    {loading ? <LoadingSkeleton rows={4} /> : pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">Queue clear</p>
                                <p className="text-xs text-gray-400 mt-1">No pending lab requests</p>
                            </div>
                        </div>
                    ) : pending.map((req: any) => {
                        const isExpanded = activeId === req.id;
                        return (
                            <div key={req.id} className={`rounded-2xl border overflow-hidden transition-all
                                ${isExpanded ? "border-indigo-200 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm"}`}>
                                <div className="flex items-center gap-4 p-4">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                                            <PriorityBadge priority={req.priority} />
                                        </div>
                                        <p className="text-xs text-gray-400 font-mono mt-0.5">Patient #{req.visit_id?.slice(-6) ?? "—"}</p>
                                        {req.notes && <p className="text-xs text-blue-600 mt-1 italic">"{req.notes}"</p>}
                                    </div>
                                    <button
                                        onClick={() => setActiveId(isExpanded ? null : req.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm shrink-0
                                            ${isExpanded ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}
                                    >
                                        <FileText size={12} />
                                        {isExpanded ? "Cancel" : "Enter Result"}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="px-5 pb-5 pt-1 space-y-3 border-t border-indigo-100">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Test Result</label>
                                        <textarea
                                            value={resultText[req.id] ?? ""}
                                            onChange={(e) => setResultText((p) => ({ ...p, [req.id]: e.target.value }))}
                                            placeholder="Enter detailed test results here..."
                                            rows={4}
                                            className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setActiveId(null)}
                                                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                                                Cancel
                                            </button>
                                            <button onClick={() => handleSubmitResult(req.id)}
                                                disabled={submittingId === req.id || !resultText[req.id]?.trim()}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm shadow-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                {submittingId === req.id
                                                    ? <><Loader2 size={12} className="animate-spin" /> Submitting...</>
                                                    : <><CheckCircle2 size={13} /> Submit Result</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                            <p className="text-xs text-gray-400 mt-0.5">{completed.length} result{completed.length !== 1 ? "s" : ""} submitted</p>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {completed.map((req: any) => (
                            <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-700">{req.test_type ?? "Lab Test"}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{req.result ?? "Result recorded"}</p>
                                </div>
                                <p className="text-[10px] text-gray-400 shrink-0">
                                    {req.completed_at ? new Date(req.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}