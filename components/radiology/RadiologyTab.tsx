"use client"

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { usePendingLabRequests, useLabRequestsByPatient, useUpdateLabRequest } from "@/hooks/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    Radio, CheckCircle2, Clock, RefreshCcw, Search,
    Loader2, AlertTriangle, ChevronDown, ChevronRight,
    FileText, X, Calendar, Filter, Microscope,
    BadgeInfo, Eye, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Patient } from "@/types/models";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
const clean   = (t: string) => t.replace(/^\[RADIOLOGY\]\s*/, "");
const isRad   = (r: any)    => String(r?.test_type ?? "").startsWith("[RADIOLOGY]");
const fmt     = (iso?: string) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
 
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
 


export function RadiologyTab({ patient, userRole }: { patient: Patient; userRole?: string }) {
    const { data: allRequests, loading, error, refetch } = useLabRequestsByPatient(patient.id ?? "");
    const [reportTarget, setReportTarget] = useState<any | null>(null);
    const [expandedId,   setExpandedId]   = useState<string | null>(null);
 
    const requests  = allRequests?.filter(isRad) ?? [];
    const pending   = requests.filter((r: any) => r.status === "pending");
    const completed = requests.filter((r: any) => r.status === "completed");
 
    const isRadiologist = userRole === "Admin" || "Radiologist"; 
 
    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-cyan-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading radiology data...</p>
        </div>
    );
 
    if (!requests.length) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Radio size={20} className="text-gray-300" />
            </div>
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">No radiology requests</p>
                <p className="text-xs text-gray-400 mt-1">Imaging investigations appear here after a doctor refers the patient</p>
            </div>
        </div>
    );
 
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                        <Radio size={17} className="text-cyan-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">Radiology</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Imaging investigations and reports</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pending.length  > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{pending.length} pending</span>}
                    {completed.length > 0 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">{completed.length} reported</span>}
                </div>
            </div>
 
            {/* Pending */}
            {pending.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending Investigations</p>
                    </div>
                    {pending.map((req: any) => (
                        <div key={req.id} className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                <Radio size={14} className="text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{clean(req.test_type)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Requested {fmt(req.created_at)}</p>
                                {req.notes && <p className="text-xs text-blue-600 mt-1 italic">"{req.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <PriorityBadge priority={req.priority} />
                                {isRadiologist && (
                                    <button onClick={() => setReportTarget(req)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors">
                                        <FileText size={11} /> Report
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
 
            {/* Completed */}
            {completed.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Radiology Reports</p>
                    </div>
                    {completed.map((req: any) => (
                        <div key={req.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <button type="button" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors border-b border-gray-50">
                                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800">{clean(req.test_type)}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Reported {fmt(req.completed_at)}</p>
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedId === req.id ? "rotate-180" : ""}`} />
                            </button>
                            {expandedId === req.id && req.result && (
                                <div className="px-5 py-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Radiology Report</p>
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                                        {req.result}
                                    </pre>
                                    {req.notes && (
                                        <div className="mt-3 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                                            <p className="text-xs text-blue-700"><span className="font-bold">Clinical indication:</span> {req.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
 
            {reportTarget && (
                <RadiologyReportForm req={reportTarget} onClose={() => setReportTarget(null)} onSuccess={refetch} />
            )}
        </div>
    );
}