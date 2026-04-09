

"use client";

import React from "react";
import { useLabRequestsByPatient, useUpdateLabRequest } from "@/hooks/use-emr";
import { useAuth } from "@/context/auth-provider";
import {
    Radio, Clock, CheckCircle2, Loader2,
    AlertTriangle, Image, FileText, ChevronDown,
} from "lucide-react";
import { Patient } from "@/types/models";
import { useState } from "react";

const cleanTestType2 = (t: string) => t.replace(/^\[RADIOLOGY\]\s*/, "");

interface RadiologyTabProps { patient: Patient; userRole?: string; }

export function RadiologyTab({ patient, userRole }: RadiologyTabProps) {
    const { data: allRequests, loading, error,  } = useLabRequestsByPatient(patient.id ?? "");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filter radiology-only
    const requests  = allRequests?.filter((r: any) => String(r.test_type ?? "").startsWith("[RADIOLOGY]")) ?? [];
    const pending   = requests.filter((r: any) => r.status === "pending");
    const completed = requests.filter((r: any) => r.status === "completed");

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-cyan-500 animate-spin" />
            <p className="text-sm text-gray-400">Loading radiology requests...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load radiology data</p>
        </div>
    );

    if (!requests.length) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <Radio size={20} className="text-gray-300" />
            </div>
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">No radiology requests</p>
                <p className="text-xs text-gray-400 mt-1">Radiology investigations appear here after a doctor refers the patient</p>
            </div>
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
                            {completed.length} completed
                        </span>
                    )}
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
                                <Image size={14} className="text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-800">{cleanTestType2(req.test_type)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Requested {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                                </p>
                                {req.notes && <p className="text-xs text-blue-600 mt-1 italic">"{req.notes}"</p>}
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 shrink-0">
                                Awaiting Report
                            </span>
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
                                className="w-full flex items-center gap-4 px-5 py-4 border-b border-gray-50 text-left hover:bg-gray-50/60 transition-colors">
                                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={14} className="text-green-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800">{cleanTestType2(req.test_type)}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Reported {req.completed_at ? new Date(req.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </p>
                                </div>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedId === req.id ? "rotate-180" : ""}`} />
                            </button>
                            {expandedId === req.id && req.result && (
                                <div className="px-5 py-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Report / Findings</p>
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                                        {req.result}
                                    </pre>
                                    {req.notes && (
                                        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl mt-3">
                                            <p className="text-xs text-blue-700"><span className="font-bold">Clinical indication:</span> {req.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}