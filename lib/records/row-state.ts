/**
 * Client-safe part of the amendment layer: given a row the UI already has,
 * work out whether it can still be edited.
 *
 * No Supabase import on purpose — the list queries already return the anchor
 * and author columns, so a card can show "amendable for another 5h 12m"
 * without a per-row round trip. The server independently re-checks on write
 * (see `lib/services/record-lock.ts`), so a stale or tampered client view can
 * never widen the window.
 */

import {
    describeAmendmentWindow,
    evaluateAmendmentWindow,
    pickAnchor,
    pickAuthor,
    type AmendmentWindow,
} from "./amendment-policy";
import { getRecordDef, type AmendableRecordType } from "./registry";

/** Does this row still have content this staff member may change? */
export function getRowAmendmentWindow(
    type: AmendableRecordType,
    row: Record<string, any> | null | undefined,
    actorId?: string | null
): AmendmentWindow {
    const def = getRecordDef(type);
    return evaluateAmendmentWindow({
        anchor: pickAnchor(row ?? null, def.anchor),
        authorId: pickAuthor(row ?? null, def.author),
        actorId,
    });
}

/** True when the row has no content yet, so saving it is a filing, not an edit. */
export function isRowEmptyOfContent(
    type: AmendableRecordType,
    row: Record<string, any> | null | undefined
): boolean {
    const def = getRecordDef(type);
    if (!row) return true;
    return def.content.every((column) => {
        const value = (row as Record<string, any>)[column];
        if (value === null || value === undefined) return true;
        if (Array.isArray(value)) return value.length === 0;
        return String(value).trim() === "";
    });
}

/**
 * Compact, presentation-ready state for a lock chip.
 * `locked` means "cannot edit"; `reason` explains why in one line.
 */
export interface RowLockState {
    editable: boolean;
    locked: boolean;
    reason: string;
    msRemaining: number;
    deadline: number | null;
    amendmentCount: number;
    lastAmendedAt: string | null;
}

export function getRowLockState(
    type: AmendableRecordType,
    row: Record<string, any> | null | undefined,
    actorId?: string | null,
    opts?: { now?: number; authorName?: string | null }
): RowLockState {
    const win = getRowAmendmentWindow(type, row, actorId);
    const rowAny = (row ?? {}) as Record<string, any>;
    return {
        editable: win.editable,
        locked: !win.editable,
        reason: describeWindow(win, opts?.authorName),
        msRemaining: win.msRemaining,
        deadline: win.deadline,
        amendmentCount: Number(rowAny.amendment_count ?? 0) || 0,
        lastAmendedAt: rowAny.amended_at ?? null,
    };
}

function describeWindow(win: AmendmentWindow, authorName?: string | null): string {
    switch (win.blockedOn) {
        case "not_author":
            return authorName
                ? `Locked — ${authorName} wrote this record. Only the author may amend it.`
                : "Locked — only the staff member who wrote this record may amend it.";
        case "window_expired":
            return `Locked — the ${win.windowHours}-hour amendment window has closed.`;
        case "no_timestamp":
            return "No saved timestamp on this record — edits allowed and logged.";
        default:
            return `Open to ${win.unowned ? "anyone in your department" : "you"} until the window closes.`;
    }
}
