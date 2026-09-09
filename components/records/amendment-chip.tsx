"use client";

/**
 * The lock chip. One small badge that answers "can I still change this, and
 * for how long?" for every governed record type — the consultation a doctor
 * saved, the result a scientist filed, the note a nurse signed.
 *
 * State comes from `lib/records/row-state.ts`, i.e. the same pure function the
 * server guard uses, so the badge can never advertise an edit that the API
 * would refuse.
 */

import { formatCountdown } from "@/lib/records/amendment-policy";
import { getRowLockState } from "@/lib/records/row-state";
import type { AmendableRecordType } from "@/lib/records/registry";
import { useNow } from "@/hooks/use-now";
import { Check, Lock, PencilLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AmendmentChipProps {
    type: AmendableRecordType;
    row: Record<string, any> | null | undefined;
    /** The signed-in staff id — decides "yours to edit" vs "someone else's". */
    actorId?: string | null;
    /** Display name of the record's author, when the caller already has it. */
    authorName?: string | null;
    /** Hide the countdown (dense tables). */
    compact?: boolean;
    className?: string;
}

export function AmendmentChip({ type, row, actorId, authorName, compact, className }: AmendmentChipProps) {
    const now = useNow(60_000);
    const state = getRowLockState(type, row, actorId, {
        // Before hydration completes there is no trustworthy "now", so show the
        // state without a number rather than a number that then jumps.
        now: now ?? undefined,
        authorName,
    });

    if (state.editable) {
        return (
            <span
                title={state.reason}
                className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700",
                    className
                )}
            >
                <PencilLine size={10} />
                Amendable
                {now !== null && !compact && <span className="font-mono">· {formatCountdown(state.msRemaining)}</span>}
            </span>
        );
    }

    const isOthersRecord = state.reason.toLowerCase().includes("only the");
    return (
        <span
            title={state.reason}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                isOthersRecord
                    ? "border-gray-200 bg-gray-50 text-gray-500"
                    : "border-red-100 bg-red-50/70 text-red-600",
                className
            )}
        >
            {isOthersRecord ? <UserRound size={10} /> : <Lock size={10} />}
            Locked
            {state.amendmentCount > 0 && (
                <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-gray-400">
                    <Check size={9} className="text-emerald-500" />
                    {state.amendmentCount} edit{state.amendmentCount > 1 ? "s" : ""}
                </span>
            )}
        </span>
    );
}
