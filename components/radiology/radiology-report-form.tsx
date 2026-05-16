"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import {
    useSubmitRadiologyReport,
    useUpdatePatientStatus,
} from "@/hooks/emr/use-emr";
import { stripRadiologyPrefix } from "@/lib/utils";
import {
    Radio, CheckCircle2, Loader2, X, BadgeInfo,
} from "lucide-react";
import { useRadiologyStore } from "@/store/radiology-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RadiologyReportFormProps {
    req: any;
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RadiologyReportForm({ req, onClose, onSuccess }: RadiologyReportFormProps) {
    const { user } = useAuth();

    // ── Hooks called unconditionally at the top — never inside callbacks ──────
    const { mutate: submitReport, isPending: saving } = useSubmitRadiologyReport();
    const { mutate: updatePatientStatus } = useUpdatePatientStatus();

    // ── Form state ────────────────────────────────────────────────────────────
    const { advancedForms, setAdvancedFormField, clearAdvancedForm } = useRadiologyStore();
    const form = advancedForms[req.id] || {
        technique: "", comparisonStudy: "", findings: "", impression: "",
        recommendation: "", criticalFindings: false, criticalNote: "",
    };
    const { technique, comparisonStudy, findings, impression, recommendation, criticalFindings, criticalNote } = form;

    const taClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 focus:bg-white resize-none transition-all font-medium";

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!findings.trim()) { toast.error("Findings section is required."); return; }
        if (!impression.trim()) { toast.error("Impression / conclusion is required."); return; }

        // Build RSNA/ACR-structured report text
        const fullReport = [
            technique ? `TECHNIQUE:\n${technique}` : null,
            comparisonStudy ? `COMPARISON:\n${comparisonStudy}` : null,
            `FINDINGS:\n${findings}`,
            `IMPRESSION:\n${impression}`,
            recommendation ? `RECOMMENDATION:\n${recommendation}` : null,
            criticalFindings ? `⚠ CRITICAL FINDING:\n${criticalNote}` : null,
        ].filter(Boolean).join("\n\n");

        submitReport(
            {
                id: req.id,
                report: {
                    status: "completed",
                    result: fullReport,
                    completed_by: user?.id ?? user?.$id ?? "",
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    // Return patient to doctor for result review
                    const patientId = req.visit_id ?? req.patient_id;
                    if (patientId) {
                        updatePatientStatus(
                            { id: patientId, status: "awaiting-consultation" as any },
                            {
                                onError: () =>
                                    toast.error("Report submitted, but patient status could not be updated."),
                            }
                        );
                    }
                    toast.success("Radiology report submitted.");
                    clearAdvancedForm(req.id);
                    onSuccess();
                    onClose();
                },
                onError: (err: any) =>
                    toast.error(err?.message ?? "Failed to submit report."),
            }
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                            <Radio size={16} className="text-cyan-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-900">File Radiology Report</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {stripRadiologyPrefix(req.test_type)} · Patient #{req.visit_id?.slice(-6) ?? "—"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Request summary banner */}
                <div className="mx-6 mt-4 px-4 py-3 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-center gap-3 shrink-0">
                    <BadgeInfo size={14} className="text-cyan-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cyan-800">
                            {stripRadiologyPrefix(req.test_type)}
                        </p>
                        <p className="text-[10px] text-cyan-600 mt-0.5">
                            {req.notes && <span>Clinical indication: {req.notes} · </span>}
                            Requested {fmtDate(req.created_at)} · Priority: {req.priority ?? "routine"}
                        </p>
                    </div>
                    <PriorityBadge priority={req.priority} />
                </div>

                {/* Scrollable form body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Technique */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Technique / Protocol
                            <span className="ml-2 text-gray-300 normal-case font-normal">imaging method used</span>
                        </p>
                        <textarea rows={2} value={technique} onChange={e => setAdvancedFormField(req.id, "technique", e.target.value)}
                            placeholder="e.g. PA and lateral chest radiographs obtained. / Contrast-enhanced CT abdomen performed..."
                            className={taClass} />
                    </div>

                    {/* Comparison */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Comparison Studies
                            <span className="ml-2 text-gray-300 normal-case font-normal">prior imaging for reference</span>
                        </p>
                        <textarea rows={2} value={comparisonStudy} onChange={e => setAdvancedFormField(req.id, "comparisonStudy", e.target.value)}
                            placeholder="e.g. None available. / Compared with chest X-ray dated [date]..."
                            className={taClass} />
                    </div>

                    {/* Findings — required */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Findings <span className="text-red-500">*</span>
                            <span className="ml-2 text-gray-300 normal-case font-normal">systematic organ-by-organ observations</span>
                        </p>
                        <textarea rows={8} value={findings} onChange={e => setAdvancedFormField(req.id, "findings", e.target.value)}
                            placeholder={`Lungs: Clear. No consolidation, effusion or pneumothorax.\nHeart: Normal size and contour.\nMediastinum: Normal width.\nBones: No acute osseous abnormality.\nSoft tissues: Unremarkable.`}
                            className={taClass} />
                    </div>

                    {/* Impression — required */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Impression / Conclusion <span className="text-red-500">*</span>
                            <span className="ml-2 text-gray-300 normal-case font-normal">diagnostic conclusions</span>
                        </p>
                        <textarea rows={4} value={impression} onChange={e => setAdvancedFormField(req.id, "impression", e.target.value)}
                            placeholder={`1. No acute cardiopulmonary disease.\n2. Mild cardiomegaly — clinical correlation recommended.\n3. No pleural effusion identified.`}
                            className={taClass} />
                    </div>

                    {/* Recommendation */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Recommendation
                            <span className="ml-2 text-gray-300 normal-case font-normal">follow-up or clinical action</span>
                        </p>
                        <textarea rows={2} value={recommendation} onChange={e => setAdvancedFormField(req.id, "recommendation", e.target.value)}
                            placeholder="e.g. Follow-up CT in 3 months. / No further imaging required."
                            className={taClass} />
                    </div>

                    {/* Critical finding flag */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div
                                onClick={() => setAdvancedFormField(req.id, "criticalFindings", !criticalFindings)}
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors
                                    ${criticalFindings ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-red-400"}`}
                            >
                                {criticalFindings && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-red-600">⚠ Critical Finding</p>
                                <p className="text-[10px] text-gray-400">
                                    Check if this finding requires immediate clinical attention
                                </p>
                            </div>
                        </label>
                        {criticalFindings && (
                            <textarea
                                rows={2}
                                value={criticalNote}
                                onChange={e => setAdvancedFormField(req.id, "criticalNote", e.target.value)}
                                placeholder="Describe the critical finding and recommended urgency of action..."
                                className="w-full px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-800 placeholder:text-red-300 focus:outline-none focus:border-red-400 resize-none font-medium"
                            />
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-50 flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit as any}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold shadow-sm shadow-cyan-200 transition-all disabled:opacity-60"
                    >
                        {saving
                            ? <><Loader2 size={13} className="animate-spin" /> Submitting...</>
                            : <><CheckCircle2 size={13} /> Submit Report</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}