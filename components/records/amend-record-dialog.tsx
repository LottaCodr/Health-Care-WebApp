"use client";

/**
 * The amendment dialog — the only way content gets rewritten.
 *
 * Deliberately a *diff-friendly* editor rather than a clone of the original
 * form: the clinician sees the stored text, changes what needs changing (a
 * typo, a dose, a whole prescription line), picks WHY, and saves. The reason
 * is not decoration — it lands in the audit trail, and it is what a records
 * officer reads months later to understand why the chart differs from the one
 * the patient signed for.
 *
 * Nothing here decides whether editing is allowed: the server re-checks on
 * save (lib/services/record-lock.ts) and this dialog simply explains the
 * refusal when it arrives.
 */

import { useEffect, useMemo, useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AMENDMENT_REASONS, formatCountdown } from "@/lib/records/amendment-policy";
import { getRecordDef, normalizeForCompare, type AmendableRecordType } from "@/lib/records/registry";
import { getRowAmendmentWindow, isRowEmptyOfContent } from "@/lib/records/row-state";
import { amendmentErrorMessage, isLockedError, useAmendRecord } from "@/hooks/emr/use-amendments";
import { AlertTriangle, Check, History, Info, Loader2, Lock, ShieldAlert } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { toast } from "sonner";

type QueryKey = readonly (string | number)[];

export interface AmendRecordDialogProps {
    type: AmendableRecordType;
    id: string;
    /** The record as currently stored (the row from the list/query). */
    row: Record<string, any> | null | undefined;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    actorId?: string | null;
    /** Query keys to refresh after a successful save. */
    invalidateKeys?: QueryKey[];
    /** Extra text under the title (e.g. patient name / test name). */
    contextLine?: string;
}

export function AmendRecordDialog({
    type, id, row, open, onOpenChange, actorId, invalidateKeys, contextLine,
}: AmendRecordDialogProps) {
    const def = getRecordDef(type);
    const now = useNow(60_000);
    const window = getRowAmendmentWindow(type, row, actorId);
    const isEmpty = isRowEmptyOfContent(type, row);
    const saving = useAmendRecord({ invalidateKeys });

    const initial = useMemo(() => {
        const out: Record<string, string> = {};
        for (const field of def.fields) out[field.column] = stringify(row?.[field.column]);
        return out;
    }, [def, row]);

    const [values, setValues] = useState<Record<string, string>>(initial);
    const [reason, setReason] = useState<string>("spelling");
    const [note, setNote] = useState("");
    /**
     * The server's veto. The chip in the list may still say "amendable" when a
     * long-open tab saves at 24h01m — the refusal below takes over the dialog
     * instead of leaving the clinician clicking Save again.
     */
    const [serverLocked, setServerLocked] = useState(false);

    // Re-seed whenever the dialog opens (or the row changes) so a clinician
    // never edits a stale copy left over from the previous record.
    useEffect(() => {
        if (open) {
            setValues(initial);
            setNote("");
            setServerLocked(false);
        }
    }, [open, initial]);

    const changedColumns = useMemo(
        () => def.fields
            .filter(f => normalizeForCompare(initial[f.column]) !== normalizeForCompare(values[f.column]))
            .map(f => f.column),
        [def, initial, values]
    );

    const canEdit = window.editable && !serverLocked;

    async function handleSave() {
        if (!canEdit) {
            toast.error("This record is locked — attach a correction note instead.");
            return;
        }
        if (!changedColumns.length) {
            toast("Nothing changed yet — edit a field first.");
            return;
        }
        if (reason === "other" && note.trim().length < 3) {
            toast.error("Add a one-line explanation — 'Other' needs a reason.");
            return;
        }

        const updates: Record<string, any> = {};
        for (const f of def.fields) {
            if (!changedColumns.includes(f.column)) continue;
            updates[f.column] = f.numeric ? toNumberOrNull(values[f.column]) : values[f.column].trim();
        }

        try {
            await saving.mutateAsync({ type, id, updates, reason, note: note.trim() || null });
            onOpenChange(false);
        } catch (error) {
            // Keep the dialog open so nothing typed is lost, and say why in the
            // place the clinician is looking at.
            if (isLockedError(error)) setServerLocked(true);
            console.warn("[amend] save failed:", amendmentErrorMessage(error));
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-3xl border-gray-100 p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 text-left">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                            <History size={15} className="text-amber-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black tracking-tight text-gray-900">
                                Amend {def.label.toLowerCase()}
                            </DialogTitle>
                            {contextLine && (
                                <DialogDescription className="text-xs text-gray-500 mt-0.5">{contextLine}</DialogDescription>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Window state */}
                    {canEdit ? (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                            <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-emerald-800 leading-relaxed">
                                <span className="font-bold">Inside the 24-hour window.</span>{" "}
                                {now !== null && <>You have <span className="font-mono font-bold">{formatCountdown(window.msRemaining)}</span> left to correct this entry. </>}
                                The original text is kept and every change is recorded in the audit trail — this is not a silent overwrite.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3">
                            <Lock size={14} className="text-red-600 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-800 leading-relaxed">
                                <span className="font-bold">Locked.</span>{" "}
                                {serverLocked
                                    ? "The save was refused — this tab kept the record open past its window (or it belongs to someone else)."
                                    : window.blockedOn === "not_author"
                                        ? "Only the person who filed this record may amend it."
                                        : "The 24-hour amendment window has closed, so the entry stays exactly as written."}{" "}
                                Use a correction note instead — it is dated, signed and shown beside the record.
                            </p>
                        </div>
                    )}

                    {isEmpty && (
                        <p className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                            <Info size={12} className="text-blue-500" />
                            Nothing is filed on this record yet — saving completes it rather than amending it.
                        </p>
                    )}

                    {/* Fields */}
                    {def.fields.map(field => (
                        <div key={field.column}>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {field.label}
                                </p>
                                {changedColumns.includes(field.column) && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
                                        changed
                                    </span>
                                )}
                            </div>
                            {field.multiline ? (
                                <Textarea
                                    value={values[field.column] ?? ""}
                                    onChange={(e) => setValues(v => ({ ...v, [field.column]: e.target.value }))}
                                    disabled={!canEdit}
                                    rows={6}
                                    className="rounded-xl border-gray-200 bg-gray-50/60 text-sm font-medium leading-relaxed text-gray-800 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            ) : (
                                <input
                                    type={field.numeric ? "number" : "text"}
                                    value={values[field.column] ?? ""}
                                    onChange={(e) => setValues(v => ({ ...v, [field.column]: e.target.value }))}
                                    disabled={!canEdit}
                                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50/60 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            )}
                            {field.help && <p className="mt-1 text-[10px] text-gray-400">{field.help}</p>}
                        </div>
                    ))}

                    {/* Why */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <ShieldAlert size={12} className="text-gray-400" /> Reason for the amendment
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {AMENDMENT_REASONS.map(r => (
                                <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setReason(r.value)}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                        reason === r.value
                                            ? "border-blue-300 bg-blue-50 text-blue-700"
                                            : "border-gray-200 bg-white text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={!canEdit}
                            rows={2}
                            placeholder="Optional note for the record (who asked, what was wrong)…"
                            className="rounded-xl border-gray-200 bg-white text-xs leading-relaxed focus-visible:ring-2 focus-visible:ring-blue-100 disabled:opacity-60"
                        />
                    </div>
                </div>

                <DialogFooter className="mx-0 my-0 px-6 py-4 border-t border-gray-100 bg-gray-50/60 gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="h-9 px-4 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canEdit || saving.isPending || !changedColumns.length}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        {saving.isPending
                            ? <Loader2 size={13} className="animate-spin" />
                            : <AlertTriangle size={13} />}
                        Save amendment
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function stringify(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
}

function toNumberOrNull(value: string): number | null {
    const n = Number(value);
    return value.trim() === "" || Number.isNaN(n) ? null : n;
}
