"use client";

/**
 * The one control every department mounts next to a clinical record:
 * the lock chip, the "Amend" button (only when the window is open), and the
 * append-only corrections list.
 *
 * It exists so the rule is stated once. A lab bench, a nursing task, a
 * discharge note and a consultation all behave identically because they render
 * the same component over their own row — which is also what keeps the wording
 * honest for staff ("your record", "the window closed"), rather than each
 * screen inventing its own explanation of the same policy.
 */

import { useState } from "react";
import { History, PencilLine, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { getRowLockState } from "@/lib/records/row-state";
import { getRecordDef, type AmendableRecordType } from "@/lib/records/registry";
import { AmendmentChip } from "./amendment-chip";
import { AmendRecordDialog } from "./amend-record-dialog";
import { RecordAddendumPanel } from "./addendum-panel";
import { cn } from "@/lib/utils";

type QueryKey = readonly (string | number)[];

export interface RecordAmendmentControlsProps {
    type: AmendableRecordType;
    id: string;
    /** The row as stored — it already carries the timestamp and author columns. */
    row: Record<string, any> | null | undefined;
    /** Defaults to the signed-in staff id; pass explicitly in shared views. */
    actorId?: string | null;
    /** Author display name, when the caller has it (nicer lock message). */
    authorName?: string | null;
    patientId?: string | null;
    /** Queries to refresh after an amendment or a note. */
    invalidateKeys?: QueryKey[];
    /** Subtitle inside the dialog, e.g. patient + test name. */
    contextLine?: string;
    /** Hide the chip (when the caller already shows one). */
    hideChip?: boolean;
    /** Show the corrections list without a click. */
    showCorrections?: boolean;
    compact?: boolean;
    className?: string;
}

export function RecordAmendmentControls({
    type, id, row, actorId, authorName, patientId, invalidateKeys,
    contextLine, hideChip, showCorrections, compact, className,
}: RecordAmendmentControlsProps) {
    const { user } = useAuth();
    const me = actorId ?? (user?.id ?? (user as any)?.$id ?? null);
    const state = getRowLockState(type, row, me, { authorName });

    // Shared screens (a patient tab opened by a nurse, an admin reviewing a
    // chart) render the same control. Reading is staff-wide; writing follows
    // the registry's role list — so the buttons that would only come back as
    // FORBIDDEN are not offered, while the correction list stays visible.
    const role = (user as any)?.role as string | undefined;
    const def = getRecordDef(type);
    const mayWrite = role === "Admin" || (role ? def.editorRoles.includes(role as any) : false);

    const [amendOpen, setAmendOpen] = useState(false);
    const [correctionsOpen, setCorrectionsOpen] = useState(Boolean(showCorrections));

    return (
        <>
            <div className={cn("flex flex-wrap items-center gap-2", className)}>
                {!hideChip && <AmendmentChip type={type} row={row} actorId={me} authorName={authorName} compact={compact} />}

                {state.editable && mayWrite && (
                    <button
                        type="button"
                        onClick={() => setAmendOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                        <PencilLine size={11} /> Amend
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setCorrectionsOpen(v => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 transition-colors hover:text-gray-800"
                >
                    <History size={11} /> Corrections
                </button>

                {/* A frozen record with no way to annotate it would just push the
                    correction into the corridor — so this hint points at the one
                    thing that is still possible. */}
                {state.locked && mayWrite && !correctionsOpen && (
                    <span className="text-[10px] font-medium text-gray-400">
                        Locked — you can still attach a correction note.
                    </span>
                )}
            </div>

            {correctionsOpen && (
                // `w-full` so the panel breaks onto its own line when the
                // control is mounted inside a flex-wrap strip (the results
                // table's meta row) instead of squeezing next to the chip.
                <div className="mt-3 w-full rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                    <RecordAddendumPanel
                        type={type}
                        id={id}
                        patientId={patientId}
                        autoOpen={state.locked && mayWrite}
                        readOnly={!mayWrite}
                        invalidateKeys={invalidateKeys}
                    />
                    {state.editable && mayWrite && (
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
                            <ShieldCheck size={11} className="text-emerald-500" />
                            A note is not a replacement for the amendment above — use it when the record is already
                            signed by someone else.
                        </p>
                    )}
                </div>
            )}

            <AmendRecordDialog
                type={type}
                id={id}
                row={row}
                actorId={me}
                open={amendOpen}
                onOpenChange={setAmendOpen}
                invalidateKeys={invalidateKeys}
                contextLine={contextLine}
            />
        </>
    );
}
