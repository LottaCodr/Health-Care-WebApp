/**
 * Record amendment policy — the single source of truth for "may this record
 * still be edited?".
 *
 * WHY THIS EXISTS
 * The medical-records team asked for a practical compromise: clinicians must
 * be able to correct what they wrote (a misspelling through to a changed
 * prescription), but a chart that can be rewritten forever is worthless as
 * evidence. The rule the hospital agreed on is a fixed window:
 *
 *   • a record may be edited by ITS AUTHOR for AMENDMENT_WINDOW_HOURS after it
 *     was written — unlimited edits inside the window, no edit outside it;
 *   • the window NEVER extends: amending a record at hour 23 does not buy a
 *     fresh 24 hours (anchor stays at the original write);
 *   • once the window closes the original text is frozen for good — staff can
 *     only attach an append-only correction note (an "addendum"), which is
 *     shown next to the record and never overwrites it;
 *   • amendments do not silently replace history: every edit is diffed into
 *     `audit_logs` and stamped on the row (`amended_at`, `amendment_count`).
 *
 * This module is deliberately pure (no Supabase, no React): the same function
 * decides the badge the clinician sees and the rejection the server returns,
 * so the UI can never be more permissive than the API. Enforcement itself
 * happens in `lib/services/record-lock.ts` (server actions) and again in
 * Postgres (`supabase/migrations/20260908_record_amendment_window.sql`) so the
 * window also holds against direct calls to the public anon key.
 */

/** Hours an author has to amend a record they wrote. Fixed by policy. */
export const AMENDMENT_WINDOW_HOURS = 24;

export const AMENDMENT_WINDOW_MS = AMENDMENT_WINDOW_HOURS * 60 * 60 * 1000;

/** Why an edit was (or will be) refused. `ok` means it is allowed. */
export type AmendmentBlockReason =
    | "ok"
    /** 24 hours have elapsed since the record was written. */
    | "window_expired"
    /** The record belongs to someone else — authors only. */
    | "not_author"
    /** The row carries no usable timestamp, so the window cannot be enforced. */
    | "no_timestamp";

export interface AmendmentWindowInput {
    /** Timestamp the record's content was written (see each record type's anchor). */
    anchor?: unknown;
    /** Staff id that authored the content (may be null on legacy rows). */
    authorId?: string | null;
    /** Staff id asking to edit right now. */
    actorId?: string | null;
    /**
     * True when this write is the record's FIRST content (e.g. a lab scientist
     * filing a result on a request that had none). Initial filing is not an
     * amendment, so the window never blocks it.
     */
    firstFiling?: boolean;
    /** Injectable clock (tests, SSR determinism). Defaults to `Date.now()`. */
    now?: number;
    /** Override the window length (tests only — production always uses 24h). */
    windowMs?: number;
}

export interface AmendmentWindow {
    /** Whether an edit of the record's content is allowed right now. */
    editable: boolean;
    /** Machine-readable reason when `editable` is false (and `"ok"` when it is). */
    blockedOn: AmendmentBlockReason;
    /** Epoch ms of the original write, or null when the row has no timestamp. */
    anchorMs: number | null;
    /** Epoch ms when editing stops. Null when there is nothing to enforce. */
    deadline: number | null;
    /** Whole ms left before the deadline (0 once expired). */
    msRemaining: number;
    windowHours: number;
    /**
     * True when the row has no author to compare against, so attribution is
     * loose: whoever files it becomes the author (see `claimAuthor`).
     */
    unowned: boolean;
}

/** Coerce whatever the DB/JSON gave us into epoch ms (null when unreadable). */
export function toEpochMs(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isNaN(t) ? null : t;
    }
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const t = Date.parse(value);
        if (!Number.isNaN(t)) return t;
        // Postgres `time`/`date` fragments and other non-ISO shapes are not
        // usable as a window anchor — treat them as missing rather than as
        // "epoch 0", which would lock every record instantly.
        return null;
    }
    return null;
}

/**
 * Decide whether `actorId` may edit the content of a record.
 *
 * Order of checks matters for the message the clinician gets: ownership is
 * reported before the clock, because "this is not yours to edit" is more
 * actionable than "it is too late".
 */
export function evaluateAmendmentWindow(input: AmendmentWindowInput): AmendmentWindow {
    const { anchor, authorId, actorId, firstFiling = false } = input;
    const windowMs = input.windowMs ?? AMENDMENT_WINDOW_MS;
    const windowHours = Math.round((windowMs / 3_600_000) * 100) / 100;
    const now = input.now ?? Date.now();
    const anchorMs = toEpochMs(anchor);
    const author = (authorId ?? "").toString().trim();
    const actor = (actorId ?? "").toString().trim();

    const base: AmendmentWindow = {
        editable: true,
        blockedOn: "ok",
        anchorMs,
        deadline: anchorMs === null ? null : anchorMs + windowMs,
        msRemaining: anchorMs === null ? 0 : Math.max(0, anchorMs + windowMs - now),
        windowHours,
        unowned: !author,
    };

    // Filing content for the first time is never an amendment.
    if (firstFiling) return base;

    // Attribution: authors only. A row with no stored author (legacy data, or
    // a result that was never stamped) is treated as unowned — the guard lets
    // the write through and claims authorship for the person making it, which
    // is what keeps the rule usable on an old database.
    if (author && actor && author !== actor) {
        return { ...base, editable: false, blockedOn: "not_author" };
    }

    // Nothing to enforce when the row has no timestamp (older schemas).
    if (anchorMs === null) {
        return { ...base, editable: true, blockedOn: "no_timestamp" };
    }

    if (base.msRemaining <= 0) {
        return { ...base, editable: false, blockedOn: "window_expired" };
    }

    return base;
}

/** Convenience: read the anchor straight off a row using a coalesce order. */
export function pickAnchor(
    row: Record<string, any> | null | undefined,
    anchorColumns: readonly string[]
): unknown {
    if (!row) return null;
    for (const col of anchorColumns) {
        const value = toEpochMs(row[col]);
        if (value !== null) return row[col];
    }
    return null;
}

/** Convenience: read the author straight off a row using a coalesce order. */
export function pickAuthor(
    row: Record<string, any> | null | undefined,
    authorColumns: readonly string[]
): string | null {
    if (!row) return null;
    for (const col of authorColumns) {
        const value = row[col];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
    }
    return null;
}

/** "5h 12m" / "48m" / "36s" — the countdown shown next to the lock chip. */
export function formatCountdown(msRemaining: number): string {
    if (msRemaining <= 0) return "0m";
    const totalSeconds = Math.floor(msRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours >= 1) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes >= 1) return `${minutes}m`;
    return `${Math.max(totalSeconds % 60, 1)}s`;
}

/**
 * One-line explanation for a clinician. Kept deliberately plain: it is shown
 * in a tooltip on a card and re-used verbatim in the error toast that comes
 * back from the server, so both stay in sync.
 */
export function describeAmendmentWindow(win: AmendmentWindow, opts?: { authorName?: string | null }): string {
    switch (win.blockedOn) {
        case "not_author":
            return `Locked — only ${opts?.authorName ? opts.authorName : "the clinician who wrote this"} may amend their own record.`;
        case "window_expired":
            return `Locked — the ${fmtHours(win.windowHours)} amendment window closed. Attach a correction note instead; the original entry stays as filed.`;
        case "no_timestamp":
            return `This record has no saved timestamp, so the ${fmtHours(win.windowHours)} window cannot be checked — edits are allowed and logged.`;
        default:
            return `Editable for another ${formatCountdown(win.msRemaining)} — amendments are logged and the original text is kept in the audit trail.`;
    }
}

function fmtHours(hours: number): string {
    return `${hours}-hour`;
}

/**
 * Reasons a record gets amended. Stored in the audit trail and printed next to
 * the amendment count so reviewers can see WHY text changed.
 */
export const AMENDMENT_REASONS = [
    { value: "spelling", label: "Spelling / wording" },
    { value: "dose", label: "Dose or frequency correction" },
    { value: "prescription", label: "Prescription change" },
    { value: "diagnosis", label: "Diagnosis correction" },
    { value: "result", label: "Result / measurement correction" },
    { value: "omission", label: "Missing information added" },
    { value: "patient_identity", label: "Wrong patient / identity detail" },
    { value: "other", label: "Other (explained below)" },
] as const;

export type AmendmentReason = (typeof AMENDMENT_REASONS)[number]["value"];

export const AMENDMENT_REASON_LABELS: Record<string, string> = Object.fromEntries(
    AMENDMENT_REASONS.map((r) => [r.value, r.label])
);

export function amendmentReasonLabel(reason?: string | null): string {
    if (!reason) return "Amendment";
    return AMENDMENT_REASON_LABELS[reason] ?? reason;
}
