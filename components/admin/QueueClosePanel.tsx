"use client";

import React, { useMemo, useState } from "react";
import {
    Stethoscope,
    Loader2,
    RefreshCcw,
    AlertTriangle,
    LogOut,
    CheckSquare,
    Square,
} from "lucide-react";
import { PatientStatus, type Patient } from "@/types/models";
import { usePatientsByStatus } from "@/hooks/emr/use-emr";
import { calculateAge, fmtFull } from "@/lib/utils";
import QueueCloseDialog, {
    humanizeQueueCloseError,
    type QueueCloseTarget,
} from "@/components/patients/QueueCloseDialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function HospitalNumber({ value }: { value?: string | null }) {
    if (!value) return <span className="text-gray-300 italic text-xs">—</span>;
    return (
        <span className="inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            {value}
        </span>
    );
}

function PatientMeta({ patient }: { patient: Patient }) {
    const p = patient as any;
    const age = p.birth_date ? calculateAge(p.birth_date) : null;
    return (
        <p className="text-xs text-gray-400 truncate">
            {[p.gender, age !== null ? `${age} yrs` : null, p.created_at ? `arrived ${fmtFull(p.created_at)}` : null]
                .filter(Boolean)
                .join(" · ") || "—"}
        </p>
    );
}

// ─── Panel ───────────────────────────────────────────────────────────────────
//
// Per-row "Discharge", checkbox "Discharge selected (n)", and a guarded
// "Close queue (n)" — every variant opens the shared confirmation dialog
// (count + names + required reason), then calls the same atomic server action.

export default function QueueClosePanel() {
    const queue = usePatientsByStatus(PatientStatus.AwaitingConsultation);

    const patients = useMemo(() => (queue.data ?? []) as Patient[], [queue.data]);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [target, setTarget] = useState<QueueCloseTarget | null>(null);

    const allSelected = patients.length > 0 && selected.size === patients.length;

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelected(allSelected ? new Set() : new Set(patients.map((p) => p.id)));
    };

    return (
        <div id="consultation-queue" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="px-6 py-5 border-b border-gray-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Consultation Queue</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Patients awaiting consultation — discharge individuals or close the whole queue.
                            Discharging here closes the visit without a consultation and does not touch billing.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setTarget({ mode: "all", count: patients.length, preview: patients })}
                            disabled={patients.length === 0}
                            className="flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-all hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <LogOut size={13} /> Close queue ({patients.length})
                        </button>
                    </div>
                </div>

                {/* Selection bar */}
                {patients.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                            aria-label={allSelected ? "Clear selection" : "Select all patients in queue"}
                        >
                            {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                            {allSelected ? "Clear selection" : "Select all"}
                        </button>
                        <span className="text-[11px] text-gray-400">
                            {selected.size > 0 ? `${selected.size} selected` : "Select patients to discharge individually or in a batch"}
                        </span>
                        {selected.size > 0 && (
                            <button
                                onClick={() =>
                                    setTarget({
                                        mode: "selected",
                                        patients: patients.filter((p) => selected.has(p.id)),
                                    })
                                }
                                className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-[#0a1628] px-3 text-xs font-bold text-white transition-all hover:bg-[#0f1f38]"
                            >
                                <LogOut size={13} /> Discharge selected ({selected.size})
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── List ── */}
            {queue.isLoading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                    <Loader2 size={22} className="text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-400">Loading consultation queue…</p>
                </div>
            ) : queue.error ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 px-6 text-center">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <p className="text-sm font-semibold text-gray-600">{humanizeQueueCloseError(queue.error)}</p>
                    <button
                        onClick={() => queue.refetch()}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                        <RefreshCcw size={12} /> Retry
                    </button>
                </div>
            ) : patients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                        <Stethoscope size={18} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Nobody is waiting</p>
                    <p className="text-xs text-gray-400">The consultation queue is empty.</p>
                </div>
            ) : (
                <div>
                    {patients.map((patient) => {
                        const isSelected = selected.has(patient.id);
                        return (
                            <div
                                key={patient.id}
                                className={`flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-50 last:border-0 transition-colors ${
                                    isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/60"
                                }`}
                            >
                                <button
                                    onClick={() => toggleOne(patient.id)}
                                    className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
                                    aria-label={isSelected ? `Deselect ${patient.name}` : `Select ${patient.name}`}
                                >
                                    {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                                </button>

                                <HospitalNumber value={(patient as any).hospital_number} />

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">
                                        {patient.name || <span className="italic font-medium text-gray-400">Unnamed patient</span>}
                                    </p>
                                    <PatientMeta patient={patient} />
                                </div>

                                <button
                                    onClick={() => setTarget({ mode: "one", patient })}
                                    className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                                >
                                    <LogOut size={12} /> Discharge
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Confirmation dialog (shared with the patient list) ── */}
            <QueueCloseDialog
                target={target}
                onOpenChange={(open) => !open && setTarget(null)}
                onClosed={() => setSelected(new Set())}
            />
        </div>
    );
}
