"use client";

import React from "react";
import { useLabRequestsByPatient } from "@/hooks/use-emr";
import { LabResultUploadForm } from "@/components/lab-tech/lab-result-upload-form";
// import { Patient } from "@/context/patients/types";
import {
    FlaskConical, ClipboardList, CheckCircle2,
    Clock, Loader2, AlertTriangle,
} from "lucide-react";
import { Patient } from "@/types/models";

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

// ─── Completed result card ────────────────────────────────────────────────────

function LabResultCard({ req }: { req: any }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={15} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Completed {req.completed_at
                                ? new Date(req.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={req.priority} />
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Completed
                    </span>
                </div>
            </div>

            {/* Result body */}
            <div className="px-5 py-4 space-y-3">
                {req.result ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <ClipboardList size={11} className="text-gray-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Result</p>
                        </div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                            {req.result}
                        </pre>
                    </>
                ) : (
                    <p className="text-xs text-gray-400 italic">No result text recorded.</p>
                )}

                {req.notes && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 border border-blue-100/60 rounded-xl">
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-bold">Doctor's note:</span> {req.notes}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Pending card (non-lab-tech view) ─────────────────────────────────────────

function PendingCard({ req }: { req: any }) {
    return (
        <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock size={15} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Requested {req.created_at
                                ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={req.priority} />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        Awaiting Results
                    </span>
                </div>
            </div>
            {req.notes && (
                <div className="px-5 pb-4">
                    <div className="px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100/60">
                        <p className="text-xs text-blue-700">
                            <span className="font-bold">Doctor's note:</span> {req.notes}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    patient: Patient;
    userRole?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LabTab({ patient, userRole }: Props) {
    const { data: labRequests, loading, error } = useLabRequestsByPatient(patient.id ?? "");

    const isLabTech = userRole === "Labtech" || userRole === "LabTechnician";
    const pendingRequests = labRequests?.filter((r: any) => r.status === "pending") ?? [];
    const completedRequests = labRequests?.filter((r: any) => r.status === "completed") ?? [];

    return (
        <div className="space-y-5">

            {/* ── Section header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                        <FlaskConical size={17} className="text-sky-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Lab Results</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Laboratory investigations and findings</p>
                    </div>
                </div>

                {!loading && !!labRequests?.length && (
                    <div className="flex items-center gap-2">
                        {pendingRequests.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {pendingRequests.length} pending
                            </span>
                        )}
                        {completedRequests.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                {completedRequests.length} completed
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 gap-3">
                    <Loader2 size={18} className="text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading lab requests...</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Failed to load lab requests</p>
                </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && !labRequests?.length && (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <FlaskConical size={20} className="text-gray-300" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500">No lab requests yet</p>
                        <p className="text-xs text-gray-400 mt-1">Lab requests appear here after a doctor refers the patient</p>
                    </div>
                </div>
            )}

            {/* ── Pending section ── */}
            {!loading && pendingRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Tests</p>
                    </div>
                    {isLabTech
                        ? <LabResultUploadForm patientId={patient.id ?? ""} />
                        : pendingRequests.map((req: any) => <PendingCard key={req.id} req={req} />)
                    }
                </div>
            )}

            {/* ── Completed section ── */}
            {!loading && completedRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed Results</p>
                    </div>
                    {completedRequests.map((req: any) => <LabResultCard key={req.id} req={req} />)}
                </div>
            )}
        </div>
    );
}