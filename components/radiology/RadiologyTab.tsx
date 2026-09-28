"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import {
    useRadiologyRequestsByPatient,
    useSubmitRadiologyReport,
    useUpdatePatientStatus,
} from "@/hooks/emr/use-emr";
import { stripRadiologyPrefix } from "@/lib/utils";
import {
    Radio, CheckCircle2, Clock, FileText,
    Loader2, AlertTriangle, ChevronDown,
} from "lucide-react";
import type { Patient } from "@/types/models";
import { useRadiologyStore } from "@/store/radiology-store";
import { RecordAmendmentControls } from "@/components/records";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200", dot: "bg-gray-400" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
    });
}

// ─── Inline report form ───────────────────────────────────────────────────────

function InlineReportForm({
    request,
    patientId,
    onClose,
}: {
    request: any;
    patientId: string;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const { mutate: submitReport, isPending: saving } = useSubmitRadiologyReport();
    const { mutate: updateStatus } = useUpdatePatientStatus();

    const { advancedForms, setAdvancedFormField, clearAdvancedForm } = useRadiologyStore();
    const form = advancedForms[request.id] || {
        findings: "", impression: "", recommendation: "",
        criticalFindings: false, criticalNote: "",
    };
    const { findings, impression, recommendation, criticalFindings: isCritical, criticalNote: criticalNoteState } = form;

    const taCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 focus:bg-white resize-none transition-all";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!findings.trim()) { toast.error("Findings are required."); return; }
        if (!impression.trim()) { toast.error("Impression is required."); return; }

        const fullReport = [
            `FINDINGS:\n${findings}`,
            `IMPRESSION:\n${impression}`,
            recommendation ? `RECOMMENDATION:\n${recommendation}` : null,
            isCritical ? `⚠ CRITICAL FINDING:\n${criticalNoteState}` : null,
        ].filter(Boolean).join("\n\n");

        submitReport(
            {
                id: request.id,
                report: {
                    status: "completed",
                    result: fullReport,
                    completed_by: user?.id ?? user?.$id ?? "",
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    updateStatus(
                        { id: patientId, status: "awaiting-consultation" as any },
                        { onError: () => toast.error("Report saved, but patient status could not be updated.") }
                    );
                    toast.success("Report filed.");
                    clearAdvancedForm(request.id);
                    onClose();
                },
                onError: (err: any) => toast.error(err?.message ?? "Failed to submit report."),
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-cyan-100 bg-cyan-50/20 px-4 py-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                Filing Report
            </p>

            <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Findings <span className="text-red-500">*</span>
                </p>
                <textarea rows={5} value={findings} onChange={e => setAdvancedFormField(request.id, "findings", e.target.value)}
                    placeholder={`Describe findings systematically:\n\nLungs: Clear. No consolidation or effusion.\nHeart: Normal size.\nBones: No acute osseous abnormality.`}
                    className={taCls} />
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Impression <span className="text-red-500">*</span>
                </p>
                <textarea rows={3} value={impression} onChange={e => setAdvancedFormField(request.id, "impression", e.target.value)}
                    placeholder="1. No acute cardiopulmonary disease."
                    className={taCls} />
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Recommendation</p>
                <textarea rows={2} value={recommendation} onChange={e => setAdvancedFormField(request.id, "recommendation", e.target.value)}
                    placeholder="e.g. No further imaging required."
                    className={taCls} />
            </div>

            {/* Critical flag */}
            <label className="flex items-center gap-3 cursor-pointer">
                <div
                    onClick={() => setAdvancedFormField(request.id, "criticalFindings", !isCritical)}
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors
                        ${isCritical ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-red-400"}`}
                >
                    {isCritical && <CheckCircle2 size={11} className="text-white" />}
                </div>
                <p className="text-xs font-bold text-red-600">⚠ Critical Finding</p>
            </label>
            {isCritical && (
                <textarea rows={2} value={criticalNoteState} onChange={e => setAdvancedFormField(request.id, "criticalNote", e.target.value)}
                    placeholder="Describe the critical finding..."
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-800 placeholder:text-red-300 focus:outline-none focus:border-red-400 resize-none" />
            )}

            <div className="flex gap-2">
                <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm shadow-cyan-200 transition-all disabled:opacity-60">
                    {saving
                        ? <><Loader2 size={12} className="animate-spin" /> Submitting...</>
                        : <><CheckCircle2 size={12} /> Submit Report</>
                    }
                </button>
            </div>
        </form>
    );
}

// ─── Pending request row ──────────────────────────────────────────────────────

function PendingRow({
    request,
    patientId,
    canReport,
}: {
    request: any;
    patientId: string;
    canReport: boolean;
}) {
    const { inlineExpanded, toggleInlineExpanded } = useRadiologyStore();
    const open = inlineExpanded[request.id] ?? false;

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-cyan-200" : "border-amber-100 bg-white"}`}>
            <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Radio size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{stripRadiologyPrefix(request.test_type)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">Requested {fmtDate(request.created_at)}</p>
                        {request.notes && (
                            <p className="text-xs text-blue-600 italic">"{request.notes}"</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={request.priority} />
                    {canReport && (
                        <button
                            onClick={() => toggleInlineExpanded(request.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors
                                ${open
                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-200"
                                }`}
                        >
                            <FileText size={11} />
                            {open ? "Cancel" : "Report"}
                        </button>
                    )}
                </div>
            </div>
            {open && (
                <InlineReportForm
                    request={request}
                    patientId={patientId}
                    onClose={() => toggleInlineExpanded(request.id)}
                />
            )}
        </div>
    );
}

// ─── Completed report row ─────────────────────────────────────────────────────

function CompletedRow({ request }: { request: any }) {
    const { inlineExpanded, toggleInlineExpanded } = useRadiologyStore();
    const expanded = inlineExpanded[request.id] ?? false;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => toggleInlineExpanded(request.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{stripRadiologyPrefix(request.test_type)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Reported {fmtDate(request.completed_at)}</p>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
                />
            </button>

            {expanded && request.result && (
                <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Radiology Report</p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        {request.result}
                    </pre>
                    {request.notes && (
                        <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-xs text-blue-700">
                                <span className="font-bold">Clinical indication: </span>
                                {request.notes}
                            </p>
                        </div>
                    )}

                    {/* 24-hour amendment window for the reporting radiologist.
                        Re-submitting the form below would overwrite a signed
                        report; this is the sanctioned path, and it degrades
                        into a correction note once the window closes. */}
                    <div className="pt-3 border-t border-gray-50">
                        <RecordAmendmentControls
                            type="radiology_report"
                            id={request.id}
                            row={request}
                            patientId={request.visit_id ?? null}
                            invalidateKeys={[["radiology"]]}
                            contextLine={stripRadiologyPrefix(request.test_type)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main RadiologyTab ────────────────────────────────────────────────────────

export function RadiologyTab({
    patient,
    userRole,
}: {
    patient: Patient;
    userRole?: string;
}) {
    const patientId = patient.id ?? "";
    const canReport = userRole === "Radiologist" || userRole === "Admin";

    const {
        data: requests = [],
        isPending: loading,
        isError: hasError,
        refetch,
    } = useRadiologyRequestsByPatient(patientId);

    const pending = (requests as any[]).filter(r => r.status === "pending");
    const completed = (requests as any[]).filter(r => r.status === "completed");

    // ── Loading ──
    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 size={16} className="text-cyan-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading radiology data...</p>
        </div>
    );

    // ── Error ──
    if (hasError) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-sm text-gray-500">Failed to load radiology requests</p>
            <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline">Retry</button>
        </div>
    );

    // ── Empty ──
    if (!requests.length) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Radio size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No radiology requests</p>
            <p className="text-xs text-gray-400">
                Imaging investigations appear here after a doctor refers the patient to radiology.
            </p>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                        <Radio size={17} className="text-cyan-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Radiology</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Imaging investigations and reports</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pending.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                            {pending.length} pending
                        </span>
                    )}
                    {completed.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                            {completed.length} reported
                        </span>
                    )}
                </div>
            </div>

            {/* Pending */}
            {pending.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                    </div>
                    {pending.map((req: any) => (
                        <PendingRow
                            key={req.id}
                            request={req}
                            patientId={patientId}
                            canReport={canReport}
                        />
                    ))}
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reports</p>
                    </div>
                    {completed.map((req: any) => (
                        <CompletedRow key={req.id} request={req} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default RadiologyTab;