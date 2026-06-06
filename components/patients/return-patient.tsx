"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { processReturnVisit } from "@/lib/actions/patient-workflow.actions";
import { type ReadmissionType } from "@/lib/services/process-return-visit.service";
import {
    UserCheck, Stethoscope, AlertTriangle,
    BedDouble, Pill, Loader2, ClipboardList,
} from "lucide-react";

interface Props {
    patientId:    string;
    patientName:  string;
    staffId:      string;
    onSuccess?:   () => void;
    onCancel?:    () => void;
}
// ─── Config ───────────────────────────────────────────────────────────────────

const VISIT_TYPES = [
    {
        id:          "followup" as ReadmissionType,
        label:       "Follow-up Visit",
        desc:        "Returning for a scheduled or unscheduled outpatient review",
        icon:        Stethoscope,
        color:       "text-blue-600",
        bg:          "bg-blue-50",
        border:      "border-blue-300",
        routesTo:    "Consultation Queue",
    },
    {
        id:          "emergency" as ReadmissionType,
        label:       "Emergency Return",
        desc:        "Urgent or emergency re-presentation",
        icon:        AlertTriangle,
        color:       "text-red-600",
        bg:          "bg-red-50",
        border:      "border-red-300",
        routesTo:    "Consultation Queue (Urgent)",
    },
    {
        id:          "readmission" as ReadmissionType,
        label:       "Re-admission",
        desc:        "Patient requires inpatient admission again",
        icon:        BedDouble,
        color:       "text-amber-600",
        bg:          "bg-amber-50",
        border:      "border-amber-300",
        routesTo:    "Admitted",
    },
    {
        id:          "pharmacy" as ReadmissionType,
        label:       "Pharmacy Only",
        desc:        "Collecting a prescription or repeat medication",
        icon:        Pill,
        color:       "text-violet-600",
        bg:          "bg-violet-50",
        border:      "border-violet-300",
        routesTo:    "Pharmacy Queue",
    },
] as const;

const PRIORITIES = [
    { value: "routine",   label: "Routine",   dot: "bg-gray-400"   },
    { value: "urgent",    label: "Urgent",    dot: "bg-amber-500"  },
    { value: "emergency", label: "Emergency", dot: "bg-red-500"    },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    patientId:    string;
    patientName:  string;
    staffId:      string;
    onSuccess?:   () => void;
    onCancel?:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReturnPatient({ patientId, patientName, staffId, onSuccess, onCancel }: Props) {
    const qc = useQueryClient();

    const [visitType, setVisitType] = useState<ReadmissionType | null>(null);
    const [reason,    setReason]    = useState("");
    const [priority,  setPriority]  = useState<"routine" | "urgent" | "emergency">("routine");
    const [notes,     setNotes]     = useState("");
    const [loading,   setLoading]   = useState(false);

    const selected = VISIT_TYPES.find(v => v.id === visitType);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!visitType)        { toast.error("Select a visit type."); return; }
        if (!reason.trim())    { toast.error("Reason for return is required."); return; }

        setLoading(true);
        try {
            await processReturnVisit({
                patientId,
                visitType,
                reason:       reason.trim(),
                priority,
                notes:        notes.trim() || undefined,
                registeredBy: staffId,
            });

            // Invalidate all patient-related queries so dashboards refresh
            await qc.invalidateQueries({ queryKey: ["patients"] });

            toast.success(`${patientName} re-admitted. Routed to ${selected?.routesTo}.`);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to re-admit patient.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* Patient banner */}
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-black text-blue-700 text-sm shrink-0">
                    {patientName[0]?.toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-bold text-blue-900">{patientName}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                        Returning patient · records preserved · no re-registration needed
                    </p>
                </div>
                <UserCheck size={16} className="text-blue-400 ml-auto shrink-0" />
            </div>

            {/* Visit type selection */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Reason for Return *
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {VISIT_TYPES.map(vt => {
                        const Icon       = vt.icon;
                        const isSelected = visitType === vt.id;
                        return (
                            <button key={vt.id} type="button"
                                onClick={() => setVisitType(vt.id)}
                                className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                        ? `${vt.border} ${vt.bg}`
                                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                                }`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected ? vt.bg : "bg-white border border-gray-100"
                                }`}>
                                    <Icon size={15} className={isSelected ? vt.color : "text-gray-400"} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-bold truncate ${isSelected ? "text-gray-900" : "text-gray-600"}`}>
                                        {vt.label}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">{vt.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
                {selected && (
                    <p className="text-[11px] text-gray-500 mt-2 pl-1">
                        → Patient will be routed to <span className="font-bold text-gray-700">{selected.routesTo}</span>
                    </p>
                )}
            </div>

            {/* Reason */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    Clinical Reason / Complaint *
                </p>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Wound review after surgery · Persistent fever since discharge · Repeat prescription pick-up…"
                    className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 placeholder:text-gray-300 transition-all" />
            </div>

            {/* Priority */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Priority</p>
                <div className="flex items-center gap-2">
                    {PRIORITIES.map(p => (
                        <button key={p.value} type="button"
                            onClick={() => setPriority(p.value)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                priority === p.value
                                    ? "border-gray-800 bg-gray-800 text-white"
                                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Optional notes */}
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    Additional Notes <span className="text-gray-300 font-normal normal-case">optional</span>
                </p>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Any additional context for the receiving clinician…"
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 focus:bg-white transition-all placeholder:text-gray-300" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
                {onCancel && (
                    <button type="button" onClick={onCancel} disabled={loading}
                        className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                        Cancel
                    </button>
                )}
                <button type="submit" disabled={loading || !visitType || !reason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-200">
                    {loading
                        ? <><Loader2 size={14} className="animate-spin" /> Re-admitting…</>
                        : <><ClipboardList size={14} /> Re-admit Patient</>
                    }
                </button>
            </div>
        </form>
    );
}