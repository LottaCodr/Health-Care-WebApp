"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/types/models";
import { useCloseConsultationQueue } from "@/hooks/emr/use-emr";
import type { QueueCloseReason } from "@/lib/services/patient.service";
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

export const QUEUE_CLOSE_REASONS: { value: QueueCloseReason; label: string }[] = [
    { value: "left-without-being-seen", label: "Left without being seen" },
    { value: "queue-closed", label: "Queue closed (end of session)" },
    { value: "registered-in-error", label: "Registered in error / duplicate" },
    { value: "referred-elsewhere", label: "Referred elsewhere before consult" },
    { value: "other", label: "Other (add a note)" },
];

/**
 * What the confirmation dialog is about to close:
 *  - `one`      — a single patient (per-row "Discharge")
 *  - `selected` — an explicit set of patients (batch from a selection/filter)
 *  - `all`      — the whole queue: the server sweeps everyone still awaiting
 *                 consultation, so `count` is its size at confirmation time and
 *                 `preview` (optional) is only used to show names.
 */
export type QueueCloseTarget =
    | { mode: "one"; patient: Patient }
    | { mode: "selected"; patients: Patient[] }
    | { mode: "all"; count: number; preview?: Patient[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function humanizeQueueCloseError(err: unknown): string {
    const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const clean = (raw ?? "").trim();
    if (!clean) return "Something went wrong. Please try again.";
    if (clean.includes("An error occurred in the Server Components render")) {
        return "Something went wrong. Please try again.";
    }
    return clean;
}

function HospitalNumber({ value }: { value?: string | null }) {
    if (!value) return <span className="text-gray-300 italic text-xs">—</span>;
    return (
        <span className="inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            {value}
        </span>
    );
}

// ─── Shared confirmation dialog ──────────────────────────────────────────────
//
// One dialog for every entry point (dashboard panel, patient-list tab, single
// rows). It owns the mutation so callers only supply *who* is being closed;
// the guarded UPDATE, audit entry and toasts all live in
// `closeConsultationQueue` + `useCloseConsultationQueue`.

interface QueueCloseDialogProps {
    target: QueueCloseTarget | null;
    /** Called with `false` when the dialog closes (cancel, X, or after success). */
    onOpenChange: (open: boolean) => void;
    /** Called after a successful close — e.g. to clear a local selection. */
    onClosed?: () => void;
}

export default function QueueCloseDialog({ target, onOpenChange, onClosed }: QueueCloseDialogProps) {
    const closeQueue = useCloseConsultationQueue();

    const [reason, setReason] = useState<QueueCloseReason | "">("");
    const [note, setNote] = useState("");
    const [ackAll, setAckAll] = useState(false);

    const busy = closeQueue.isPending;
    const open = !!target;

    // Fresh form every time a target is opened.
    useEffect(() => {
        if (target) {
            setReason("");
            setNote("");
            setAckAll(false);
        }
    }, [target]);

    const preview: Patient[] =
        target?.mode === "one"
            ? [target.patient]
            : target?.mode === "selected"
              ? target.patients
              : (target?.preview ?? []);
    const count = target?.mode === "all" ? target.count : preview.length;

    const canSubmit =
        !!reason &&
        (reason !== "other" || note.trim().length > 0) &&
        (target?.mode !== "all" || ackAll) &&
        !busy;

    const handleOpenChange = (next: boolean) => {
        if (!next && busy) return; // don't close mid-flight
        onOpenChange(next);
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

            onClosed?.();
            onOpenChange(false);
        } catch (error) {
            console.error("[queue-close] submit:", error);
            toast.error(humanizeQueueCloseError(error));
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {target?.mode === "one"
                            ? `Discharge ${preview[0]?.name ?? "this patient"} from the consultation queue?`
                            : `Discharge ${count} patient${count === 1 ? "" : "s"} from the consultation queue?`}
                    </DialogTitle>
                    <DialogDescription>
                        These patients were never seen by a doctor. This closes their visit
                        without a consultation and does not create bills or discharge notes.
                    </DialogDescription>
                </DialogHeader>

                {/* Names preview */}
                {preview.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 max-h-40 overflow-y-auto">
                        {preview.slice(0, 8).map((p) => (
                            <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                                <span className="text-xs font-semibold text-gray-800 truncate">
                                    {p.name || "Unnamed patient"}
                                </span>
                                <HospitalNumber value={(p as any).hospital_number} />
                            </div>
                        ))}
                        {preview.length > 8 && (
                            <p className="text-[11px] font-bold text-gray-400 pt-1">
                                + {preview.length - 8} more
                            </p>
                        )}
                        {target?.mode === "all" && (
                            <p className="text-[11px] text-amber-600 font-semibold pt-2">
                                This closes the queue for everyone currently awaiting consultation —
                                including anyone who arrived after this dialog opened.
                            </p>
                        )}
                    </div>
                )}

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
                        {QUEUE_CLOSE_REASONS.map((r) => (
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
                            in the consultation queue ({count}) without a consultation.
                        </span>
                    </label>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <button
                        onClick={() => handleOpenChange(false)}
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
                        {busy ? "Discharging…" : `Discharge ${count} patient${count === 1 ? "" : "s"}`}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
