/**
 * Payment timestamps — single source of truth for display.
 *
 * Every time shown on a bill comes from the database row, never from the
 * client clock:
 *
 *   created_at      when the bill was raised (insert time in the DB)
 *   processed_date  when money was last received toward the bill — written on
 *                   EVERY settlement (full, partial, deposit-credit)
 *   paid_at         when the bill became fully paid
 *
 * Parsing note: PostgREST returns `timestamp with time zone` columns with an
 * explicit offset, but a plain `timestamp` column comes back WITHOUT one —
 * and `new Date("2026-09-23T07:41:00")` would then read that wall-clock
 * string in the BROWSER's local zone, silently shifting every displayed time
 * by the local UTC offset. This hospital stores UTC (all writes use
 * `toISOString()`), so offset-less values are treated as UTC, never local.
 */

/** Parse a Supabase/PostgREST timestamp. Returns `null` when missing/invalid. */
export function parseDbTimestamp(value: string | null | undefined): Date | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Postgres returns "2026-09-23 07:41:00.123456+00" for timestamptz and
    // "2026-09-23 07:41:00.123456" for a naive timestamp — normalize the space.
    let iso = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");

    // Normalize numeric offsets to ECMA's "+HH:mm" form ("+00", "+0000" → "+00:00").
    iso = iso
        .replace(/([+-])(\d{2}):?(\d{2})$/, "$1$2:$3")
        .replace(/([+-])(\d{2})$/, "$1$2:00");

    const hasZone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(iso);
    // Offset-less date-time → naive Postgres timestamp → stored as UTC here.
    // Never let the browser read it in its own local zone.
    const target = !hasZone && iso.includes("T") ? `${iso}Z` : iso;

    const t = Date.parse(target);
    if (Number.isNaN(t)) return null;
    return new Date(t);
}

/**
 * The timestamp a billing-history row must display, taken straight from the
 * database columns. `label` distinguishes the two meanings so a settlement
 * time is never presented as the time the bill was raised (or vice versa).
 * Returns `null` when the row carries no timestamp at all — callers render
 * "—" instead of inventing a time on the client.
 */
export function pickBillDisplayTimestamp(row: {
    status?: string | null;
    paid_at?: string | null;
    processed_date?: string | null;
    processedDate?: string | null;
    created_at?: string | null;
}): { iso: string; label: "paid" | "billed" } | null {
    const status = (row.status ?? "").toLowerCase();
    const settled =
        status === "paid" ||
        status === "completed" ||
        status === "partial" ||
        status === "waived" ||
        status === "refunded";

    if (settled) {
        // Settlement time: processed_date is written on EVERY settle (full,
        // partial, deposit-credit), paid_at only when the bill closed in full.
        const iso = row.processed_date ?? row.processedDate ?? row.paid_at ?? null;
        if (iso) return { iso, label: "paid" };
    }

    if (row.created_at) return { iso: row.created_at, label: "billed" };
    return null;
}
