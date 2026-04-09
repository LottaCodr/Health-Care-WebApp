"use client"

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { usePendingLabRequests, useLabRequestsByPatient, useUpdateLabRequest } from "@/hooks/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    Radio, CheckCircle2, 
    Loader2,  X, 
    BadgeInfo,
} from "lucide-react";
import { toast } from "sonner";
import { Patient } from "@/types/models";

const clean   = (t: string) => t.replace(/^\[RADIOLOGY\]\s*/, "");
const fmt     = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
 
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
 


interface ReportFormProps {
    req:       any;
    onClose:   () => void;
    onSuccess: () => void;
}
 
export function RadiologyReportForm({ req, onClose, onSuccess }: ReportFormProps) {
    const { user }                = useAuth();
    const { mutate: updateRequest } = useUpdateLabRequest();
 
    // Standard structured radiology report fields (RSNA/ACR format)
    const [technique,        setTechnique]        = useState("");
    const [comparisonStudy,  setComparisonStudy]  = useState("");
    const [findings,         setFindings]         = useState("");
    const [impression,       setImpression]       = useState("");
    const [recommendation,   setRecommendation]   = useState("");
    const [criticalFindings, setCriticalFindings] = useState(false);
    const [criticalNote,     setCriticalNote]     = useState("");
    const [saving,           setSaving]           = useState(false);
 
    const taClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 focus:bg-white resize-none transition-all font-medium";
 
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!findings.trim())   { toast.error("Findings section is required."); return; }
        if (!impression.trim()) { toast.error("Impression / conclusion is required."); return; }
 
        setSaving(true);
        try {
            // Build full structured report
            const fullReport = [
                technique        ? `TECHNIQUE:\n${technique}`                          : "",
                comparisonStudy  ? `COMPARISON:\n${comparisonStudy}`                   : "",
                `FINDINGS:\n${findings}`,
                `IMPRESSION:\n${impression}`,
                recommendation   ? `RECOMMENDATION:\n${recommendation}`                : "",
                criticalFindings ? `⚠ CRITICAL FINDING:\n${criticalNote}`            : "",
            ].filter(Boolean).join("\n\n");
 
            await updateRequest(req.id, {
                status:       "completed",
                result:       fullReport,
                completed_by: user?.$id ?? user?.id,
                completed_at: new Date().toISOString(),
            });
 
            toast.success("Radiology report submitted.");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to submit report.");
        } finally { setSaving(false); }
    };
 
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
                            <p className="text-xs text-gray-400 mt-0.5">{clean(req.test_type)} · Patient #{req.visit_id?.slice(-6)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                        <X size={14} />
                    </button>
                </div>
 
                {/* Request summary banner */}
                <div className="mx-6 mt-4 px-4 py-3 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-center gap-3 shrink-0">
                    <BadgeInfo size={14} className="text-cyan-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-cyan-800">{clean(req.test_type)}</p>
                        <p className="text-[10px] text-cyan-600 mt-0.5">
                            {req.notes && <span>Clinical indication: {req.notes} · </span>}
                            Requested {fmt(req.created_at)} · Priority: {req.priority ?? "routine"}
                        </p>
                    </div>
                    <PriorityBadge priority={req.priority} />
                </div>
 
                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
 
                    {/* Technique */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Technique / Protocol
                            <span className="ml-2 text-gray-300 normal-case font-normal">Describe imaging technique used</span>
                        </p>
                        <textarea rows={2} value={technique} onChange={e => setTechnique(e.target.value)}
                            placeholder="e.g. PA and lateral chest radiographs obtained. / Contrast-enhanced CT abdomen and pelvis performed..."
                            className={taClass} />
                    </div>
 
                    {/* Comparison */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Comparison Studies
                            <span className="ml-2 text-gray-300 normal-case font-normal">Previous imaging for comparison</span>
                        </p>
                        <textarea rows={2} value={comparisonStudy} onChange={e => setComparisonStudy(e.target.value)}
                            placeholder="e.g. None available. / Compared with chest X-ray dated [date]..."
                            className={taClass} />
                    </div>
 
                    {/* Findings — the core section */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Findings <span className="text-red-500">*</span>
                            <span className="ml-2 text-gray-300 normal-case font-normal">Systematic organ-by-organ observations</span>
                        </p>
                        <textarea rows={8} value={findings} onChange={e => setFindings(e.target.value)}
                            placeholder={`Describe findings systematically by anatomical area. Example:\n\nLungs: Clear. No consolidation, effusion or pneumothorax.\nHeart: Normal size and contour.\nMediastinum: Normal width.\nBones: No acute osseous abnormality.\nSoft tissues: Unremarkable.`}
                            className={taClass} />
                    </div>
 
                    {/* Impression — most critical section */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Impression / Conclusion <span className="text-red-500">*</span>
                            <span className="ml-2 text-gray-300 normal-case font-normal">Summary of diagnostic conclusions</span>
                        </p>
                        <textarea rows={4} value={impression} onChange={e => setImpression(e.target.value)}
                            placeholder={`1. No acute cardiopulmonary disease.\n2. Mild cardiomegaly — clinical correlation recommended.\n3. No pleural effusion identified.`}
                            className={taClass} />
                    </div>
 
                    {/* Recommendation */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Recommendation
                            <span className="ml-2 text-gray-300 normal-case font-normal">Follow-up imaging or clinical action</span>
                        </p>
                        <textarea rows={2} value={recommendation} onChange={e => setRecommendation(e.target.value)}
                            placeholder="e.g. Clinical correlation recommended. / Follow-up CT in 3 months. / No further imaging required."
                            className={taClass} />
                    </div>
 
                    {/* Critical finding flag */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div onClick={() => setCriticalFindings(v => !v)}
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors
                                    ${criticalFindings ? "bg-red-600 border-red-600" : "border-gray-300 hover:border-red-400"}`}>
                                {criticalFindings && <CheckCircle2 size={12} className="text-white" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-red-600">⚠ Critical Finding</p>
                                <p className="text-[10px] text-gray-400">Check if this report contains a finding requiring immediate clinical attention</p>
                            </div>
                        </label>
                        {criticalFindings && (
                            <textarea rows={2} value={criticalNote} onChange={e => setCriticalNote(e.target.value)}
                                placeholder="Describe the critical finding and recommended urgency of action..."
                                className="w-full px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-800 placeholder:text-red-300 focus:outline-none focus:border-red-400 resize-none font-medium" />
                        )}
                    </div>
                </form>
 
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-50 flex gap-2 shrink-0">
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="" onClick={handleSubmit} disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold shadow-sm shadow-cyan-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> Submitting...</> : <><CheckCircle2 size={13} /> Submit Report</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
 
