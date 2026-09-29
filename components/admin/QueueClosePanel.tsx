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
import { toast } from "sonner";
import { PatientStatus, type Patient } from "@/types/models";
import {
    usePatientsByStatus,
    useCloseConsultationQueue,
} from "@/hooks/emr/use-emr";
import type { QueueCloseReason } from "@/lib/services/patient.service";
import { calculateAge, fmtFull } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

// ─── Reason taxonomy (client mirror of the server's QueueCloseReason) ─────────
// This is what separates an administrative queue-close from a real,
// billing-cleared discharge — the reason is written to the audit trail.

const REASONS: { value: QueueCloseReason; label: string }[] = [
    { value: "left-without-being-seen", label: "Left without being seen" },
    { value: "queue-closed", label: "Queue closed (end of session)" },
    { value: "registered-in-error", label: "Registered in error / duplicate" },
    { value: "referred-elsewhere", label: "Referred elsewhere before consult" },
    { value: "other", label: "Other (add a note)" },
];

type CloseTarget =
    | { mode: "one"; patient: Patient }
    | { mode: "selected"; patients: Patient[] }
    | { mode: "all" };

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

function errorText(err: unknown): string {
    const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const clean = (raw ?? "").trim();
    if (!clean) return "Something went wrong. Please try again.";
    if (clean.includes("An error occurred in the Server Components render")) {
        return "Something went wrong. Please try again.";
    }
    return clean;
}

// ─── Panel ───────────────────────────────────────────────────────────────────
//
// Per-row "Discharge", checkbox "Discharge selected (n)", and a guarded
// "Close queue (n)" — every variant opens the same confirmation dialog
// (count + names + required reason), then calls the same atomic server action.

export default function QueueClosePanel() {
    const queue = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const closeQueue = useCloseConsultationQueue();

    const patients = useMemo(() => (queue.data ?? []) as Patient[], [queue.data]);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [target, setTarget] = useState<CloseTarget | null>(null);

    // Dialog form state
    const [reason, setReason] = useState<QueueCloseReason | "">("");
    const [note, setNote] = useState("");
    const [ackAll, setAckAll] = useState(false);

    const busy = closeQueue.isPending;
    const allSelected = patients.length > 0 && selected.size === patients.length;

    const resetForm = () => {
        setReason("");
        setNote("");
        setAckAll(false);
    };

    const openTarget = (t: CloseTarget) => {
        resetForm();
        setTarget(t);
    };

    const closeDialog = () => {
        if (busy) return;
        setTarget(null);
        resetForm();
    };

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

    const submit = async () => {
        if (!target || busy) return;
        if (!reason) {
            toast.error("Please choose why the queue is being closed.");
            return;
        }
        if (reason === "other" && note.trim().length === 0) {
            toast.error('Please add a short note when the reason is "Other".');
            return;
        }
        if (target.mode === "all" && !ackAll) {
            toast.error("Please confirm you understand what closing the queue does.");
            return;
        }

        const patientIds =
            target.mode === "one"
                ? [target.patient.id]
                : target.mode === "selected"
                  ? target.patients.map((p) => p.id)
                  : undefined; // "all" — the server resolves everyone currently awaiting

        try {
            const result = await closeQueue.mutateAsync({
                patientIds,
                reason,
                note: note.trim() || undefined,
            });

            if (!result.ok) {
                toast.error(result.message);
                return;
            }

            const closed = result.closed.length;
            const skipped = result.skipped.length;
            toast.success(
                closed === 0
                    ? "Nobody was waiting in the consultation queue."
                    : `${closed} patient${closed === 1 ? "" : "s"} discharged from the consultation queue.`
            );
            if (skipped > 0) {
                toast.info(
                    `${skipped} skipped — their status changed before the close (e.g. a consultation started).`
                );
            }

            setSelected(new Set());
            setTarget(null);
            resetForm();
        } catch (error) {
            console.error("[queue-close] submit:", error);
            toast.error(errorText(error));
        }
    };

    // Dialog copy per mode
    const targetNames: Patient[] =
        target?.mode === "one"
            ? [target.patient]
            : target?.mode === "selected"
              ? target.patients
              : patients;
    const targetCount = target?.mode === "all" ? patients.length : targetNames.length;
    const canSubmit =
        !!reason &&
        (reason !== "other" || note.trim().length > 0) &&
        (target?.mode !== "all" || ackAll) &&
        !busy;

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
                            onClick={() => openTarget({ mode: "all" })}
                            disabled={busy || patients.length === 0}
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
                                    openTarget({
                                        mode: "selected",
                                        patients: patients.filter((p) => selected.has(p.id)),
                                    })
                                }
                                disabled={busy}
                                className="ml-auto flex h-9 items-center gap-2 rounded-xl bg-[#0a1628] px-3 text-xs font-bold text-white transition-all hover:bg-[#0f1f38] disabled:opacity-40"
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
                    <p className="text-sm font-semibold text-gray-600">{errorText(queue.error)}</p>
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
                                    onClick={() => openTarget({ mode: "one", patient })}
                                    disabled={busy}
                                    className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
                                >
                                    <LogOut size={12} /> Discharge
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Confirmation dialog ── */}
            <Dialog open={!!target} onOpenChange={(o) => !o && closeDialog()}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {target?.mode === "one"
                                ? `Discharge ${targetNames[0]?.name ?? "this patient"} from the consultation queue?`
                                : `Discharge ${targetCount} patient${targetCount === 1 ? "" : "s"} from the consultation queue?`}
                        </DialogTitle>
                        <DialogDescription>
                            These patients were never seen by a doctor. This closes their visit
                            without a consultation and does not create bills or discharge notes.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Names preview */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 max-h-40 overflow-y-auto">
                        {targetNames.slice(0, 8).map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                                <span className="text-xs font-semibold text-gray-800 truncate">
                                    {p.name || "Unnamed patient"}
                                </span>
                                <HospitalNumber value={(p as any).hospital_number} />
                            </div>
                        ))}
                        {targetNames.length > 8 && (
                            <p className="text-[11px] font-bold text-gray-400 pt-1">
                                + {targetNames.length - 8} more
                            </p>
                        )}
                        {target?.mode === "all" && (
                            <p className="text-[11px] text-amber-600 font-semibold pt-2">
                                This closes the queue for everyone currently awaiting consultation —
                                including anyone who arrived after this dialog opened.
                            </p>
                        )}
                    </div>

                    {/* Reason */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                            Reason (required)
                        </p>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value as QueueCloseReason | "")}
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                        >
                            <option value="" disabled>
                                Choose why…
                            </option>
                            {REASONS.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                            Note {reason === "other" ? "(required)" : "(optional)"}
                        </p>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={2}
                            placeholder="Short explanation for the audit trail…"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
                        />
                    </div>

                    {/* Second confirm for the queue-wide close */}
                    {target?.mode === "all" && (
                        <label className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ackAll}
                                onChange={(e) => setAckAll(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600"
                            />
                            <span className="text-xs font-semibold text-amber-800">
                                I understand this discharges <strong>every</strong> patient currently
                                in the consultation queue ({patients.length}) without a consultation.
                            </span>
                        </label>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <button
                            onClick={closeDialog}
                            disabled={busy}
                            className="flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submit}
                            disabled={!canSubmit}
                            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {busy && <Loader2 size={14} className="animate-spin" />}
                            {busy
                                ? "Discharging…"
                                : `Discharge ${targetCount} patient${targetCount === 1 ? "" : "s"}`}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
