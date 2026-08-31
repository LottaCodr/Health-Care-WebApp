/**
 * Shared helpers for the lab test catalog.
 *
 * Single source of truth for what counts as the "same" lab test: the test
 * name, compared case-insensitively with internal whitespace collapsed.
 * Used by the billing lookup, the catalog lists and the bulk importer so they
 * all agree on duplicates.
 */

export function normalizeLabTestName(name?: string | null): string {
    return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Structural minimum the de-dupe helpers need. */
export interface LabCatalogLike {
    id?: string | null;
    test_name?: string | null;
    test_code?: string | null;
    price?: number | null;
    is_active?: boolean | null;
}

/**
 * Keeper priority (lower is better). Mirrors the ordering used by the
 * `20260831_dedupe_lab_test_catalog.sql` migration so both agree on which row
 * survives: active → has a price → has a test code → lowest id.
 */
function keeperScore(t: LabCatalogLike): [number, number, number] {
    return [
        t.is_active ? 0 : 1,
        typeof t.price === "number" && t.price > 0 ? 0 : 1,
        (t.test_code ?? "").trim() ? 0 : 1,
    ];
}

function isBetterCandidate(a: LabCatalogLike, b: LabCatalogLike): boolean {
    const sa = keeperScore(a);
    const sb = keeperScore(b);
    for (let i = 0; i < sa.length; i++) {
        if (sa[i] !== sb[i]) return sa[i] < sb[i];
    }
    return String(a.id ?? "") < String(b.id ?? "");
}

/**
 * Collapse the catalog to one row per normalized test name, keeping the best
 * row. Used when listing tests so duplicate rows never reach the UI (doctor's
 * picker, quick-route panel, lab-tab chips) even before the DB is cleaned up.
 */
export function dedupeLabTests<T extends LabCatalogLike>(items: T[]): T[] {
    const best = new Map<string, T>();
    for (const item of items) {
        const key = normalizeLabTestName(item.test_name);
        const existing = best.get(key);
        if (!existing || isBetterCandidate(item, existing)) {
            best.set(key, item);
        }
    }
    return [...best.values()];
}
