"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { processReturnVisit } from "@/lib/services/process-return-visit.service";
import { type ReadmissionType } from "@/lib/services/process-return-visit.service";
import {
    UserCheck, Stethoscope, AlertTriangle,
    BedDouble, Pill, Loader2, ClipboardList,
    ArrowRight, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    patientId:   string;
    patientName: string;
    staffId:     string;
    onSuccess?:  () => void;
    onCancel?:   () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VISIT_TYPES = [
    {
        id:       "followup" as ReadmissionType,
        label:    "Follow-up Visit",
        desc:     "Returning for outpatient review",
        icon:     Stethoscope,
        color:    "text-blue-600",
        bg:       "bg-blue-50",
        activeBg: "bg-blue-600",
        border:   "border-blue-500",
        ring:     "ring-blue-200",
        dot:      "bg-blue-500",
        routesTo: "Consultation Queue",
    },
    {
        id:       "emergency" as ReadmissionType,
        label:    "Emergency Return",
        desc:     "Urgent or acute re-presentation",
        icon:     AlertTriangle,
        color:    "text-red-600",
        bg:       "bg-red-50",
        activeBg: "bg-red-600",
        border:   "border-red-500",
        ring:     "ring-red-200",
        dot:      "bg-red-500",
        routesTo: "Consultation Queue (Urgent)",
    },
    {
        id:       "readmission" as ReadmissionType,
        label:    "Re-admission",
        desc:     "Requires inpatient care again",
        icon:     BedDouble,
        color:    "text-amber-600",
        bg:       "bg-amber-50",
        activeBg: "bg-amber-600",
        border:   "border-amber-500",
        ring:     "ring-amber-200",
        dot:      "bg-amber-500",
        routesTo: "Admitted — front desk assigns ward",
    },
    {
        id:       "pharmacy" as ReadmissionType,
        label:    "Pharmacy Only",
        desc:     "Collecting repeat prescription",
        icon:     Pill,
        color:    "text-violet-600",
        bg:       "bg-violet-50",
        activeBg: "bg-violet-600",
        border:   "border-violet-500",
        ring:     "ring-violet-200",
        dot:      "bg-violet-500",
        routesTo: "Pharmacy Queue",
    },
] as const;

const PRIORITIES = [
    { value: "routine",   label: "Routine",   dot: "bg-gray-400",   active: "bg-gray-700  text-white border-gray-700"   },
    { value: "urgent",    label: "Urgent",    dot: "bg-amber-500",  active: "bg-amber-600 text-white border-amber-600"  },
    { value: "emergency", label: "Emergency", dot: "bg-red-500",    active: "bg-red-600   text-white border-red-600"    },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReturnPatient({ patientId, patientName, staffId, onSuccess, onCancel }: Props) {
    const qc = useQueryClient();

    const [visitType, setVisitType] = useState<ReadmissionType | null>(null);
    const [reason,    setReason]    = useState("");
    const [priority,  setPriority]  = useState<"routine" | "urgent" | "emergency">("routine");
    const [notes,     setNotes]     = useState("");
    const [loading,   setLoading]   = useState(false);

    const selected = VISIT_TYPES.find(v => v.id === visitType);
    const canSubmit = !!visitType && reason.trim().length > 0 && !loading;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;

        setLoading(true);
        try {
            await processReturnVisit({
                patientId,
                visitType:    visitType!,
                reason:       reason.trim(),
                priority,
                notes:        notes.trim() || undefined,
                registeredBy: staffId,
            });

            await qc.invalidateQueries({ queryKey: ["patients"] });
            toast.success(`${patientName} re-admitted → ${selected?.routesTo}`);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to re-admit patient. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-2xl overflow-hidden">
            {/* ── Colour header ── */}
            <div className={`px-6 py-5 transition-colors duration-300 ${
                selected ? `${selected.bg} border-b ${selected.border.replace("border-", "border-b-")}` : "bg-gray-50 border-b border-gray-100"
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 transition-colors duration-300 ${
                        selected ? `${selected.activeBg} text-white` : "bg-white text-gray-500 border border-gray-200"
                    }`}>
                        {patientName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{patientName}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <UserCheck size={11} />
                            Existing patient · records preserved
                        </p>
                    </div>
                    {selected && (
                        <div className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${selected.bg} ${selected.color} border ${selected.border}`}>
                            <ArrowRight size={10} /> {selected.routesTo}
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

                {/* ── Visit type ── */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2.5">
                        Visit Type <span className="text-red-400">*</span>
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {VISIT_TYPES.map(vt => {
                            const Icon       = vt.icon;
                            const isSelected = visitType === vt.id;
                            return (
                                <button key={vt.id} type="button"
                                    onClick={() => setVisitType(isSelected ? null : vt.id)}
                                    className={`relative flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 ${
                                        isSelected
                                            ? `${vt.border} ${vt.bg} ring-2 ${vt.ring}`
                                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                                    }`}>
                                    {/* Selected checkmark */}
                                    {isSelected && (
                                        <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full ${vt.activeBg} flex items-center justify-center`}>
                                            <CheckCircle2 size={10} className="text-white" />
                                        </div>
                                    )}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected ? `${vt.activeBg}` : `bg-white border border-gray-100`
                                    }`}>
                                        <Icon size={16} className={isSelected ? "text-white" : "text-gray-400"} />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <p className={`text-xs font-bold leading-tight ${isSelected ? "text-gray-900" : "text-gray-600"}`}>
                                            {vt.label}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{vt.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Reason ── */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Reason for Return <span className="text-red-400">*</span>
                    </p>
                    <textarea
                        rows={3}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Wound review after surgery · Fever not resolving · Repeat prescription collection…"
                        className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white placeholder:text-gray-300 transition-all" />
                    <p className="text-[10px] text-gray-400 mt-1">{reason.length} characters</p>
                </div>

                {/* ── Priority ── */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Priority</p>
                    <div className="flex items-center gap-2">
                        {PRIORITIES.map(p => (
                            <button key={p.value} type="button"
                                onClick={() => setPriority(p.value)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                    priority === p.value ? p.active : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${priority === p.value ? "bg-white" : p.dot}`} />
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Notes (optional) ── */}
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Notes
                        <span className="text-gray-300 font-normal normal-case tracking-normal ml-1.5">optional</span>
                    </p>
                    <input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Any additional context for the receiving clinician…"
                        className="w-full h-10 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white placeholder:text-gray-300 transition-all" />
                </div>

                {/* ── Routing preview ── */}
                {selected && (
                    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${selected.bg} border ${selected.border} transition-all`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${selected.dot} shrink-0`} />
                        <p className="text-xs text-gray-700 font-medium">
                            {patientName} will be routed to{" "}
                            <span className="font-black text-gray-900">{selected.routesTo}</span>
                        </p>
                    </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-2.5 pt-1">
                    {onCancel && (
                        <button type="button" onClick={onCancel} disabled={loading}
                            className="px-5 py-3 text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors rounded-xl border border-gray-200 hover:border-gray-300 bg-white disabled:opacity-50">
                            Cancel
                        </button>
                    )}
                    <button type="submit" disabled={!canSubmit}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                            selected
                                ? `${selected.activeBg} text-white hover:opacity-90 ${selected.ring.replace("ring-", "shadow-")} shadow-sm`
                                : "bg-gray-800 text-white hover:bg-gray-900"
                        }`}>
                        {loading
                            ? <><Loader2 size={15} className="animate-spin" /> Re-admitting…</>
                            : <><ClipboardList size={15} /> Re-admit Patient</>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
}