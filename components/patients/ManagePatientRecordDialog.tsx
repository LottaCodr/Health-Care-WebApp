"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Archive,
    Trash2,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Search,
    Link2,
    ShieldAlert,
    X,
} from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/models";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    useDisablePatient,
    useRestorePatient,
    useDeletePatient,
    usePatientActivitySummary,
    usePotentialDuplicatePatients,
    useSearchPatients,
} from "@/hooks/emr/use-emr";
import {
    PATIENT_DISABLE_REASONS,
    describeActivityBreakdown,
    isPatientDisabled,
    type PatientDisableReason,
} from "@/lib/utils/patient-archive";
import { formatDate } from "@/lib/utils";

export type ManageRecordMode = "disable" | "delete" | "restore";

interface ManagePatientRecordDialogProps {
    patient: Patient | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialMode?: ManageRecordMode;
    onSuccess?: (action: "disabled" | "restored" | "deleted") => void;
}

export default function ManagePatientRecordDialog({
    patient,
    open,
    onOpenChange,
    initialMode,
    onSuccess,
}: ManagePatientRecordDialogProps) {
    const disabled = isPatientDisabled(patient);
    const defaultMode: ManageRecordMode = disabled
        ? initialMode === "delete"
            ? "delete"
            : "restore"
        : initialMode === "delete"
            ? "delete"
            : "disable";

    const [mode, setMode] = useState<ManageRecordMode>(defaultMode);
    const [reason, setReason] = useState<PatientDisableReason>("duplicate-entry");
    const [note, setNote] = useState("");
    const [primaryPatient, setPrimaryPatient] = useState<Patient | null>(null);
    const [dupSearch, setDupSearch] = useState("");
    const [confirmText, setConfirmText] = useState("");

    const disableMutation = useDisablePatient();
    const restoreMutation = useRestorePatient();
    const deleteMutation = useDeletePatient();

    const patientId = patient?.id ?? "";
    const busy =
        disableMutation.isPending || restoreMutation.isPending || deleteMutation.isPending;

    const activityQuery = usePatientActivitySummary(patientId, {
        enabled: open && !!patientId && mode === "delete",
    });

    const showDupLinker =
        !disabled &&
        mode === "disable" &&
        (reason === "duplicate-entry" || reason === "merged-or-consolidated");

    const potentialDupsQuery = usePotentialDuplicatePatients(patientId, {
        enabled: open && !!patientId && showDupLinker,
    });
    const dupSearchQuery = useSearchPatients(dupSearch.trim());

    useEffect(() => {
        if (!open) return;
        setMode(defaultMode);
        setReason("duplicate-entry");
        setNote("");
        setPrimaryPatient(null);
        setDupSearch("");
        setConfirmText("");
    }, [open, defaultMode, patientId]);

    const candidatePrimaryRecords = useMemo(() => {
        const list = dupSearch.trim().length >= 2
            ? ((dupSearchQuery.data ?? []) as Patient[])
            : ((potentialDupsQuery.data ?? []) as Patient[]);
        return list.filter((p) => p.id !== patientId && p.is_active !== false);
    }, [dupSearch, dupSearchQuery.data, potentialDupsQuery.data, patientId]);

    if (!patient) return null;

    const p = patient as any;
    const expectedConfirm = p.hospital_number ? String(p.hospital_number).trim() : "DELETE";
    const summary = activityQuery.data;
    const activityParts = summary ? describeActivityBreakdown(summary) : [];

    const handleClose = (next: boolean) => {
        if (!next && busy) return;
        onOpenChange(next);
    };

    const handleDisable = async () => {
        if (reason === "other" && !note.trim()) {
            toast.error('Please add a short note when the reason is "Other".');
            return;
        }
        try {
            await disableMutation.mutateAsync({
                patientId: patient.id,
                reason,
                note: note.trim() || undefined,
                duplicateOfPatientId: primaryPatient?.id ?? null,
            });
            toast.success(`${patient.name || "Patient record"} has been disabled.`);
            onSuccess?.("disabled");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to disable patient record.");
        }
    };

    const handleRestore = async () => {
        try {
            await restoreMutation.mutateAsync(patient.id);
            toast.success(`${patient.name || "Patient record"} has been restored.`);
            onSuccess?.("restored");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to restore patient record.");
        }
    };

    const handleDelete = async () => {
        if (reason === "other" && !note.trim()) {
            toast.error('Please add a short note when the reason is "Other".');
            return;
        }
        if (confirmText.trim().toUpperCase() !== expectedConfirm.toUpperCase()) {
            toast.error(`Type "${expectedConfirm}" to confirm permanent deletion.`);
            return;
        }
        try {
            await deleteMutation.mutateAsync({
                patientId: patient.id,
                reason,
                note: note.trim() || undefined,
            });
            toast.success(`${patient.name || "Patient record"} permanently deleted.`);
            onSuccess?.("deleted");
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to delete patient record.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                mode === "delete"
                                    ? "bg-red-50 text-red-600"
                                    : mode === "restore"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-amber-50 text-amber-600"
                            }`}
                        >
                            {mode === "delete" ? (
                                <Trash2 size={16} />
                            ) : mode === "restore" ? (
                                <RotateCcw size={16} />
                            ) : (
                                <Archive size={16} />
                            )}
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-sm font-bold text-gray-900">
                                {disabled ? "Manage Disabled Patient Record" : "Disable or Delete Patient Record"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 mt-0.5 truncate">
                                {patient.name || "Unnamed patient"}
                                {p.hospital_number ? ` · ${p.hospital_number}` : ""}
                                {patient.phone ? ` · ${patient.phone}` : ""}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Mode switcher */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    {disabled ? (
                        <button
                            type="button"
                            onClick={() => setMode("restore")}
                            className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all ${
                                mode === "restore"
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <RotateCcw size={13} /> Restore Record
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setMode("disable")}
                            className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all ${
                                mode === "disable"
                                    ? "border-amber-500 bg-amber-50 text-amber-800"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <Archive size={13} /> Disable (Recommended)
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setMode("delete")}
                        className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-xs font-bold transition-all ${
                            mode === "delete"
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                        }`}
                    >
                        <Trash2 size={13} /> Delete Permanently
                    </button>
                </div>

                {/* ── Restore view ───────────────────────────────────────────── */}
                {mode === "restore" && (
                    <div className="space-y-4 pt-2">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-1.5">
                            <p className="text-xs font-bold text-amber-900">Currently Disabled</p>
                            {p.disabled_reason && (
                                <p className="text-xs text-amber-800">Reason: {p.disabled_reason}</p>
                            )}
                            {p.disabled_at && (
                                <p className="text-[11px] text-amber-700">
                                    Disabled on {formatDate(p.disabled_at)}
                                </p>
                            )}
                            {p.duplicate_of_patient_id && (
                                <p className="text-xs pt-1">
                                    <Link
                                        href={`/admin/patient/${p.duplicate_of_patient_id}`}
                                        className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                                    >
                                        <Link2 size={12} /> Open primary patient record
                                    </Link>
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed">
                            Restoring this record makes it active again in searches, patient lists, and department queues.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => handleClose(false)}
                                disabled={busy}
                                className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRestore}
                                disabled={busy}
                                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                            >
                                {restoreMutation.isPending ? (
                                    <><Loader2 size={13} className="animate-spin" /> Restoring…</>
                                ) : (
                                    <><RotateCcw size={13} /> Restore Patient Record</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Disable view ───────────────────────────────────────────── */}
                {mode === "disable" && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                            <ShieldAlert size={14} className="text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-800 leading-relaxed">
                                Disabling hides this duplicate from all active queues, searches, and counts while keeping its
                                hospital number (<span className="font-mono font-bold">{p.hospital_number || "unassigned"}</span>) intact
                                so numbering never skips. An admin can restore it anytime.
                            </p>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                Reason (required)
                            </p>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value as PatientDisableReason)}
                                className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                            >
                                {PATIENT_DISABLE_REASONS.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {showDupLinker && (
                            <div className="space-y-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                        Primary / Kept Patient Record (optional)
                                    </p>
                                    {primaryPatient && (
                                        <button
                                            type="button"
                                            onClick={() => setPrimaryPatient(null)}
                                            className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
                                        >
                                            <X size={11} /> Clear
                                        </button>
                                    )}
                                </div>

                                {primaryPatient ? (
                                    <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate">
                                                {primaryPatient.name || "Unnamed patient"}
                                            </p>
                                            <p className="text-[11px] text-gray-500 truncate">
                                                {primaryPatient.hospital_number || "—"}
                                                {primaryPatient.phone ? ` · ${primaryPatient.phone}` : ""}
                                            </p>
                                        </div>
                                        <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={dupSearch}
                                                onChange={(e) => setDupSearch(e.target.value)}
                                                placeholder="Search original record by name, phone, or NVH no…"
                                                className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                            />
                                        </div>

                                        {(potentialDupsQuery.isLoading || (dupSearch.trim().length >= 2 && dupSearchQuery.isFetching)) ? (
                                            <p className="text-[11px] text-gray-400 flex items-center gap-1.5 py-1">
                                                <Loader2 size={12} className="animate-spin" /> Looking for matching records…
                                            </p>
                                        ) : candidatePrimaryRecords.length > 0 ? (
                                            <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                                                <p className="text-[10px] font-semibold text-gray-400">
                                                    {dupSearch.trim().length >= 2 ? "Search results:" : "Possible matching records:"}
                                                </p>
                                                {candidatePrimaryRecords.map((cand) => (
                                                    <button
                                                        key={cand.id}
                                                        type="button"
                                                        onClick={() => setPrimaryPatient(cand)}
                                                        className="w-full flex items-center justify-between gap-2 text-left rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 px-2.5 py-1.5 transition-colors"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold text-gray-800 truncate">
                                                                {cand.name || "Unnamed patient"}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 truncate">
                                                                {cand.phone || "No phone"}
                                                                {cand.created_at ? ` · Created ${formatDate(cand.created_at)}` : ""}
                                                            </p>
                                                        </div>
                                                        <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md shrink-0">
                                                            {cand.hospital_number || "—"}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-gray-400">
                                                {dupSearch.trim().length >= 2
                                                    ? "No matching active records found."
                                                    : "No automatic phone/name matches found — search above if needed."}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                Note {reason === "other" ? "(required)" : "(optional)"}
                            </p>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                placeholder="e.g. Shift change duplicate — patient already registered as NVH-01234"
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 resize-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => handleClose(false)}
                                disabled={busy}
                                className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDisable}
                                disabled={busy || (reason === "other" && !note.trim())}
                                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {disableMutation.isPending ? (
                                    <><Loader2 size={13} className="animate-spin" /> Disabling…</>
                                ) : (
                                    <><Archive size={13} /> Disable Record</>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Delete Permanently view ────────────────────────────────── */}
                {mode === "delete" && (
                    <div className="space-y-4 pt-2">
                        {activityQuery.isLoading ? (
                            <div className="flex items-center gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <Loader2 size={16} className="text-gray-400 animate-spin shrink-0" />
                                <p className="text-xs text-gray-500">
                                    Checking whether clinical, billing, or document records are attached…
                                </p>
                            </div>
                        ) : activityQuery.error ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-1">
                                <p className="text-xs font-bold text-red-800">Could not verify record history</p>
                                <p className="text-xs text-red-700">{(activityQuery.error as Error).message}</p>
                            </div>
                        ) : summary && !summary.canHardDelete ? (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-red-900">
                                            Permanent deletion is blocked
                                        </p>
                                        <p className="text-xs text-red-800 mt-1 leading-relaxed">
                                            This patient record has{" "}
                                            <strong>{summary.totalLinkedRecords}</strong> linked hospital record
                                            {summary.totalLinkedRecords === 1 ? "" : "s"} ({activityParts.join(", ")}).
                                            To preserve clinical and financial history,{" "}
                                            <strong>{disabled ? "keep it disabled" : "disable the record instead"}</strong>.
                                        </p>
                                    </div>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => setMode("disable")}
                                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                                    >
                                        <Archive size={12} /> Switch to Disable Record
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
                                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                                        No consultations, lab requests, prescriptions, bills, or documents are attached to this record.
                                    </p>
                                </div>

                                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5">
                                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        <strong>Warning:</strong> Permanent deletion cannot be undone. Removing this row
                                        permanently deletes hospital number{" "}
                                        <span className="font-mono font-bold">{p.hospital_number || "—"}</span> (and if it
                                        is the newest number, the next registration may reuse it). Use{" "}
                                        <strong>Disable</strong> if you want to keep numbering gapless.
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                        Reason (required)
                                    </p>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value as PatientDisableReason)}
                                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300"
                                    >
                                        {PATIENT_DISABLE_REASONS.map((r) => (
                                            <option key={r.value} value={r.value}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                        Note {reason === "other" ? "(required)" : "(optional)"}
                                    </p>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        rows={2}
                                        placeholder="Short explanation for the audit log…"
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
                                    />
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                        Type <span className="font-mono text-red-600">{expectedConfirm}</span> to confirm
                                    </p>
                                    <input
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder={expectedConfirm}
                                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white font-mono text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => handleClose(false)}
                                disabled={busy}
                                className="h-10 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            {summary?.canHardDelete && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={
                                        busy ||
                                        confirmText.trim().toUpperCase() !== expectedConfirm.toUpperCase() ||
                                        (reason === "other" && !note.trim())
                                    }
                                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {deleteMutation.isPending ? (
                                        <><Loader2 size={13} className="animate-spin" /> Deleting…</>
                                    ) : (
                                        <><Trash2 size={13} /> Delete Permanently</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
