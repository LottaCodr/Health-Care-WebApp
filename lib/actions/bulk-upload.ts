"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "@/lib/services/auth-guard";
import { normalizeLabTestName } from "@/lib/utils/lab-catalog";
import {
    formatHospitalNumber,
    hospitalNumberSuffix,
    normalizeHospitalNumber,
} from "@/lib/hospital-number";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";
import { isBlankCsvRow, normalizeGender, parseBirthDate } from "@/lib/utils/patient-import";

// ── Table names — update if your schema differs ───────────────────────────────
const TABLES = {
    patients:         "patients",
    drug_inventory:   "drug_inventory",     // pharmacy drug catalog
    lab_test_catalog: "lab_test_catalog",   // lab test catalog
} as const;

export type UploadType = "patients" | "drug_inventory" | "lab_test_catalog";

export interface ChunkResult {
    success: number;
    failed:  number;
    errors:  { row: number; reason: string }[];
    /**
     * Non-blocking notes: values that were repaired, dropped or skipped. The
     * row is still imported, so these are never reported as failures.
     */
    warnings?: { row: number; reason: string }[];
}

// ─── Check which records already exist ───────────────────────────────────────

// PostgREST turns .in(field, values) into a query-string filter, so a lookup
// for thousands of values (a 5k-patient import) would blow the URL length
// limit. The lookup is split into small value batches instead.
const EXISTING_CHECK_BATCH = 200;

// ─── Chunk budget ─────────────────────────────────────────────────────────────
// A chunk request must always finish well inside the platform's request limit
// (Next.js server actions are commonly cut off around 60s, reverse proxies
// sooner). When a request is killed mid-flight the browser only ever sees a
// broken response ("An unexpected response was received from the server."),
// which surfaces as "the server took too long to respond" for *every* row in
// the chunk and hides the real database error that caused the slow-down.
// Everything in the insert path is bounded by this budget so a bad chunk
// always comes back quickly with an accurate, per-row reason.
const CHUNK_BUDGET_MS = 20_000;

/** Max simultaneous database round trips while isolating failing rows. */
const MAX_PARALLEL_DB_CALLS = 4;

/** Batches at or below this size are isolated one row at a time. */
const PER_ROW_THRESHOLD = 32;

/** How many sub-batches a failing batch is split into. */
const SPLIT_FACTOR = 8;

export async function checkExistingRecords(
    type: UploadType,
    values: string[],
): Promise<string[]> {
    try {
        await requireStaff();
        if (!values.length) return [];
        const sb = await createClient();

        // Lab tests are keyed by NAME (the business key the billing lookup uses),
        // not by code — otherwise the same test uploaded under a different code
        // slips through and creates duplicates.
        if (type === "lab_test_catalog") {
            try {
                const { data } = await sb
                    .from(TABLES[type])
                    .select("test_name, test_code");

                const incoming = new Set(values.map((v) => normalizeLabTestName(v)));
                const existing = (data ?? []).flatMap((r: any) => [
                    normalizeLabTestName(r.test_name),
                    String(r.test_code ?? "").trim().toLowerCase(),
                ]);

                return [...new Set(existing)].filter((v) => v && incoming.has(v));
            } catch (e) {
                console.error("[bulk-upload] checkExistingRecords (lab):", e);
                return [];
            }
        }

        const field = type === "patients" ? "phone" : "drug_name";
        const batches: string[][] = [];
        for (let i = 0; i < values.length; i += EXISTING_CHECK_BATCH) {
            batches.push(values.slice(i, i + EXISTING_CHECK_BATCH));
        }

        const found = new Set<string>();
        const LOOKUP_CONCURRENCY = 4;
        let next = 0;
        const claimNext = () => {
            if (next >= batches.length) return null;
            return batches[next++];
        };

        await Promise.all(
            Array.from({ length: Math.min(LOOKUP_CONCURRENCY, batches.length) }, async () => {
                while (true) {
                    const batch = claimNext();
                    if (!batch) break;
                    try {
                        const { data, error } = await sb
                            .from(TABLES[type])
                            .select(field)
                            .in(field, batch);
                        if (error) {
                            console.error("[bulk-upload] checkExistingRecords:", error);
                            continue;
                        }
                        for (const r of data ?? []) {
                            found.add(String((r as any)[field] ?? "").toLowerCase().trim());
                        }
                    } catch (e) {
                        console.error("[bulk-upload] checkExistingRecords batch:", e);
                        continue;
                    }
                }
            })
        );

        return [...found];
    } catch (e) {
        // Auth failure or unexpected error — log and return empty so upload can still proceed
        // (per-row error isolation will catch real duplicates via DB unique constraints).
        console.error("[bulk-upload] checkExistingRecords outer:", e);
        return [];
    }
}

// ─── Map raw CSV row → DB shape ───────────────────────────────────────────────
// Reading rules (dates, genders, blank rows) live in lib/utils/patient-import.ts
// so the dialog's preview notes and the importer agree on what gets dropped.

interface MappedRow {
    data:  Record<string, any>;
    /** Values that had to be dropped or corrected, explained for the uploader. */
    notes: string[];
}

/**
 * True when a mapped patient row actually carries something from the file.
 *
 * `status` is supplied by the importer rather than read from the CSV, so it
 * does not count. Without this, a file whose first line is not a header row
 * (an Excel export pasted straight in, say) would map every column to nothing
 * and create a hundred blank patient records instead of an error.
 */
function hasPatientData(data: Record<string, any>): boolean {
    return Object.entries(data).some(([key, value]) => {
        if (key === "status") return false;
        if (value === null || value === undefined) return false;
        return String(value).trim() !== "";
    });
}

function mapRow(type: UploadType, row: Record<string, string>): MappedRow {
    const str = (k: string, fb = "") => (row[k] ?? fb).trim();
    const clean = (k: string) => {
        const v = (row[k] ?? "").trim();
        return v.length > 0 ? v : null;
    };
    const num = (k: string, fb = 0) => parseFloat(row[k] ?? "") || fb;

    switch (type) {
        case "patients": {
            // No patient field is required. A blank column is "not recorded" and
            // is stored as NULL; a column holding something the database could
            // not use is dropped with a note so the patient is still registered.
            const notes: string[] = [];

            // Accept legacy NVHE-*/NVH* values too, but always store them in the
            // canonical shared series (NVH- + zero-padded number).
            const rawHospitalNumber    = str("hospital_number");
            const explicitHospitalNumber = normalizeHospitalNumber(rawHospitalNumber) ?? "";
            if (rawHospitalNumber && !explicitHospitalNumber) {
                notes.push(`Hospital number "${rawHospitalNumber}" is not a valid NVH-00001 number, so a new one was assigned instead.`);
            }

            const rawDob = clean("date_of_birth");
            let birthDate: string | null = null;
            if (rawDob) {
                birthDate = parseBirthDate(rawDob);
                if (!birthDate) {
                    notes.push(`Date of birth "${rawDob}" could not be read, so it was left blank. Use YYYY-MM-DD (e.g. 1990-06-15) to record it later.`);
                }
            }

            const rawGender = clean("gender");
            let gender: string | null = null;
            if (rawGender) {
                gender = normalizeGender(rawGender);
                if (!gender) {
                    notes.push(`Gender "${rawGender}" was not recognised (Male, Female or Other), so it was left blank.`);
                }
            }

            return {
                notes,
                data: {
                    name:                     clean("name"),
                    birth_date:               birthDate,
                    gender,
                    phone:                    clean("phone"),
                    address:                  clean("address"),
                    blood_group:              clean("blood_group"),
                    geno_type:                clean("genotype") || clean("geno_type"),
                    emergency_contact_name:   clean("next_of_kin_name") || clean("emergency_contact_name"),
                    emergency_contact_number: clean("next_of_kin_phone") || clean("emergency_contact_number"),
                    email:                    clean("email"),
                    // Only an explicit number is sent. A blank one is
                    // auto-assigned in bulkUploadChunk (the key stays absent so
                    // pre-migration databases keep working).
                    ...(explicitHospitalNumber ? { hospital_number: explicitHospitalNumber } : {}),
                    status:                   "registered",
                },
            };
        }

        case "drug_inventory":
            return {
                notes: [],
                data: {
                    drug_name:     str("drug_name"),
                    generic_name:  clean("generic_name"),
                    category:      str("category").toUpperCase(),
                    unit:          str("unit") || "Pack",
                    reorder_level: num("reorder_level", 3),
                    price:         num("price", 0),
                    is_active:     (() => {
                        const v = (row["is_active"] ?? "TRUE").trim().toUpperCase();
                        return v !== "FALSE" && v !== "INACTIVE";
                    })(),
                },
            };

        case "lab_test_catalog":
            return {
                notes: [],
                data: {
                    test_name:    str("test_name"),
                    test_code:    str("test_code"),
                    category:     clean("category"),
                    normal_range: clean("normal_range"),
                    unit:         clean("unit"),
                    price:        num("price", 0),
                    is_active:    true,
                },
            };

        default:
            throw new Error(`Unknown upload type: ${type}`);
    }
}

// ─── Hospital number allocation ───────────────────────────────────────────────

/**
 * Allocates `count` fresh hospital numbers from the shared NVH-XXXXX series.
 * Prefers the batch allocator (one RPC for the whole chunk); falls back to
 * per-row allocation when the batch function hasn't been migrated yet.
 */
async function allocateHospitalNumbers(sb: any, count: number): Promise<string[]> {
    try {
        const { data, error } = await sb.rpc("next_hospital_numbers", { p_count: count });
        if (!error && Array.isArray(data) && data.length >= count) {
            const rawStrings = data.slice(0, count).map((v: any) => {
                if (typeof v === "string") return v;
                if (v && typeof v === "object") {
                    const vals = Object.values(v);
                    if (vals.length && typeof vals[0] === "string") return vals[0] as string;
                    return String(vals[0] ?? "");
                }
                return String(v ?? "");
            });
            const parsed = rawStrings.map((s) => normalizeHospitalNumber(s));
            if (parsed.every((n): n is string => n !== null)) return parsed as string[];
            console.error("[bulk-upload] next_hospital_numbers: unexpected response shape", data?.[0]);
        }
        if (error) console.error("[bulk-upload] next_hospital_numbers:", error);
    } catch (e) {
        console.error("[bulk-upload] next_hospital_numbers:", e);
    }

    // Fallback: limited concurrency per-row allocation
    const FALLBACK_CONCURRENCY = 10;
    const out: string[] = new Array(count).fill("");
    let nextIdx = 0;

    async function fallbackWorker() {
        while (nextIdx < count) {
            const idx = nextIdx++;
            try {
                const { data: hn, error: hnError } = await sb.rpc("next_hospital_number", { p_prefix: "NVH" });
                if (!hnError && typeof hn === "string") {
                    out[idx] = normalizeHospitalNumber(hn) ?? hn;
                }
            } catch (e) {
                console.error("[bulk-upload] next_hospital_number:", e);
                out[idx] = "";
            }
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(FALLBACK_CONCURRENCY, count) }, () => fallbackWorker())
    );

    return out;
}

// ─── Resilient batch insert ───────────────────────────────────────────────────

/** Check if an error is a non-retryable schema/auth error that affects all rows */
function isTableLevelError(err: any): boolean {
    const code = String(err?.code ?? "");
    const msg = String(err?.message ?? "").toLowerCase();
    return (
        code === "42P01" || // relation does not exist
        code === "42501" || // insufficient privilege
        code === "42703" || // undefined column
        msg.includes("permission denied") ||
        msg.includes("does not exist")
    );
}

/**
 * Errors that are environmental rather than data-related: a network blip, a
 * gateway 502/504, a Postgres statement timeout or a connection reset.
 *
 * These fail again for every sub-batch, so isolating rows one by one would
 * just burn the whole chunk budget and end up reporting the same message
 * hundreds of times. They are reported once for the whole batch instead.
 */
function isTransientError(err: any): boolean {
    const code   = String(err?.code ?? "");
    const status = Number(err?.status ?? err?.statusCode ?? 0);
    const msg    = String(err?.message ?? "").toLowerCase();

    if (status >= 500 || status === 429) return true;
    if (
        code === "57014" || // query_canceled / statement timeout
        code === "57P01" || // admin_shutdown
        code === "40001" || // serialization_failure (deadlock)
        code === "08000" || // connection_exception
        code === "08006" || // connection_failure
        code === "08003"    // connection_does_not_exist
    ) return true;

    return (
        msg.includes("fetch failed") ||
        msg.includes("failed to fetch") ||
        msg.includes("networkerror") ||
        msg.includes("load failed") ||
        msg.includes("econnreset") ||
        msg.includes("econnrefused") ||
        msg.includes("socket hang up") ||
        msg.includes("statement timeout") ||
        msg.includes("timeout") ||
        msg.includes("gateway") ||
        msg.includes("too many connections")
    );
}

// ─── Insert machinery ─────────────────────────────────────────────────────────

interface PendingRow { index: number; data: Record<string, any> }

interface InsertState {
    sb:        any;
    table:     string;
    rowOffset: number;
    errors:    { row: number; reason: string }[];
    /** Wall-clock deadline for the whole chunk. */
    deadline:  number;
    /** First real database error seen — reported if the budget runs out. */
    firstReason: string | null;
    /** Raw first error, logged server-side so the cause is never lost. */
    firstError: any;
    /** Free slots for parallel database calls. */
    slots:     number;
    waiting:   (() => void)[];
}

/** Borrow a parallel-database-call slot (bounded fan-out, shared by recursion). */
async function withSlot<T>(state: InsertState, fn: () => Promise<T>): Promise<T> {
    if (state.slots <= 0) {
        await new Promise<void>((resolve) => state.waiting.push(resolve));
    }
    state.slots--;
    try {
        return await fn();
    } finally {
        state.slots++;
        state.waiting.shift()?.();
    }
}

function rowNumber(state: InsertState, row: PendingRow): number {
    return state.rowOffset + row.index + 2;
}

function failAll(
    state:  InsertState,
    rows:   PendingRow[],
    reason: string,
): { success: number; failed: number } {
    for (const r of rows) state.errors.push({ row: rowNumber(state, r), reason });
    return { success: 0, failed: rows.length };
}

function splitRows(rows: PendingRow[], parts: number): PendingRow[][] {
    const size  = Math.ceil(rows.length / parts);
    const out: PendingRow[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
}

/** Give up on a batch because the chunk is out of time, keeping the real cause. */
function outOfTime(state: InsertState, rows: PendingRow[]): { success: number; failed: number } {
    return failAll(
        state,
        rows,
        state.firstReason ??
            "This batch could not be completed in time. Please retry the rows listed in the error report.",
    );
}

/**
 * Inserts rows as one batch (fast path). On a data error the batch is split
 * into sub-batches that are retried **concurrently**, and small batches are
 * isolated one row at a time — so a handful of bad rows in a 250-row chunk
 * costs a couple of seconds instead of ~500 sequential round trips (which
 * overran the request timeout and surfaced as a bogus "server took too long"
 * error for every row).
 *
 * Everything is bounded by `state.deadline`: if the budget runs out, the
 * remaining rows are reported with the real database reason captured earlier.
 */
async function insertRows(
    state: InsertState,
    rows:  PendingRow[],
): Promise<{ success: number; failed: number }> {
    if (!rows.length) return { success: 0, failed: 0 };

    // Out of budget: stop hammering the database and report what we know.
    // Never let the platform kill the request — that is what used to turn a
    // data error into "the server took too long to respond".
    if (Date.now() >= state.deadline) return outOfTime(state, rows);

    let error: any = null;
    try {
        const res = await withSlot<{ error?: any } | null>(state, async () => {
            // Re-check the budget *after* acquiring a slot. Calls queue up
            // behind the concurrency limit, so the check at the top of this
            // function can pass long before the insert actually runs.
            if (Date.now() >= state.deadline) return null;
            return (await state.sb.from(state.table).insert(rows.map((r) => r.data))) ?? {};
        });
        if (res === null) return outOfTime(state, rows);
        error = res?.error ?? null;
    } catch (e) {
        error = e;
    }

    if (!error) return { success: rows.length, failed: 0 };

    const reason = formatFriendlyDbError(error, "Could not save this row.");
    if (!state.firstReason) {
        state.firstReason = reason;
        state.firstError  = error;
    }

    // Schema/auth errors affect every row — never split them.
    if (isTableLevelError(error)) return failAll(state, rows, reason);

    // Transient failures would repeat for every sub-batch.
    if (isTransientError(error)) return failAll(state, rows, reason);

    if (rows.length === 1) {
        state.errors.push({ row: rowNumber(state, rows[0]), reason });
        return { success: 0, failed: 1 };
    }

    // Small batch → isolate the offending rows one by one, in parallel.
    if (rows.length <= PER_ROW_THRESHOLD) {
        const results = await Promise.all(rows.map((r) => insertRows(state, [r])));
        return results.reduce(
            (acc, r) => ({ success: acc.success + r.success, failed: acc.failed + r.failed }),
            { success: 0, failed: 0 },
        );
    }

    // Large batch → split and retry each part concurrently.
    const results = await Promise.all(splitRows(rows, SPLIT_FACTOR).map((part) => insertRows(state, part)));
    return results.reduce(
        (acc, r) => ({ success: acc.success + r.success, failed: acc.failed + r.failed }),
        { success: 0, failed: 0 },
    );
}

/** Entry point used by `bulkUploadChunk`. */
async function insertResilient(
    sb:        any,
    table:     string,
    rows:      PendingRow[],
    rowOffset: number,
    errors:    { row: number; reason: string }[],
    deadline:  number,
): Promise<{ success: number; failed: number }> {
    const state: InsertState = {
        sb,
        table,
        rowOffset,
        errors,
        deadline,
        firstReason: null,
        firstError: null,
        slots: MAX_PARALLEL_DB_CALLS,
        waiting: [],
    };

    const result = await insertRows(state, rows);

    if (state.firstError) {
        // The browser only ever sees the friendly text, so keep the raw
        // Postgres/PostgREST error in the server log for diagnosis.
        console.error(
            `[bulk-upload] chunk at row ${rowOffset + 2}: ${result.success} saved, ${result.failed} failed —`,
            state.firstError,
        );
    }

    return result;
}

// ─── Duplicate screening ──────────────────────────────────────────────────────

/**
 * Removes patient rows whose phone number or hospital number is already
 * registered, reporting each one with a precise reason.
 *
 * Re-uploading a file (or importing paper records that were already entered)
 * otherwise fails the whole batch insert on a unique index, and every failing
 * row then has to be isolated one by one. Screening first turns those rows
 * into a clear "already registered" message instead.
 */
async function removeExistingPatients(
    sb:        any,
    rows:      PendingRow[],
    rowOffset: number,
    errors:    { row: number; reason: string }[],
): Promise<PendingRow[]> {
    const phones = new Set<string>();
    const numbers = new Set<string>();

    for (const r of rows) {
        const phone = String(r.data.phone ?? "").trim().toLowerCase();
        const hn    = normalizeHospitalNumber(String(r.data.hospital_number ?? ""));
        if (phone) phones.add(phone);
        if (hn) numbers.add(hn);
    }
    if (!phones.size && !numbers.size) return rows;

    const foundPhones  = new Set<string>();
    const foundNumbers = new Set<string>();

    const collect = async (field: string, values: string[], into: Set<string>) => {
        for (let i = 0; i < values.length; i += EXISTING_CHECK_BATCH) {
            const batch = values.slice(i, i + EXISTING_CHECK_BATCH);
            try {
                const { data, error } = await sb
                    .from(TABLES.patients)
                    .select(field)
                    .in(field, batch);
                if (error) {
                    // Never block the import on a failed lookup — the insert
                    // stage still reports real duplicates accurately.
                    console.error("[bulk-upload] duplicate screening:", error);
                    return;
                }
                for (const rec of data ?? []) {
                    const raw = String((rec as any)?.[field] ?? "").trim();
                    if (raw) into.add(field === "phone" ? raw.toLowerCase() : (normalizeHospitalNumber(raw) ?? raw));
                }
            } catch (e) {
                console.error("[bulk-upload] duplicate screening batch:", e);
                return;
            }
        }
    };

    await Promise.all([
        phones.size  ? collect("phone", [...phones], foundPhones)   : Promise.resolve(),
        numbers.size ? collect("hospital_number", [...numbers], foundNumbers) : Promise.resolve(),
    ]);

    if (!foundPhones.size && !foundNumbers.size) return rows;

    const kept: PendingRow[] = [];
    for (const r of rows) {
        const phone = String(r.data.phone ?? "").trim().toLowerCase();
        const hn    = normalizeHospitalNumber(String(r.data.hospital_number ?? ""));
        if (hn && foundNumbers.has(hn)) {
            errors.push({
                row:    rowOffset + r.index + 2,
                reason: "This hospital number is already assigned to another patient.",
            });
            continue;
        }
        if (phone && foundPhones.has(phone)) {
            errors.push({
                row:    rowOffset + r.index + 2,
                reason: "A patient with this phone number is already registered.",
            });
            continue;
        }
        kept.push(r);
    }
    return kept;
}

// ─── Upload one chunk ─────────────────────────────────────────────────────────
// rowOffset = file row number of the first item in this chunk (for error reporting).

export async function bulkUploadChunk(
    type:      UploadType,
    rows:      Record<string, string>[],
    rowOffset: number,
): Promise<ChunkResult> {
    // Wall-clock budget for this request. Everything after this point is
    // bounded by it so the action always answers the browser instead of being
    // killed by the platform's request timeout.
    const deadline = Date.now() + CHUNK_BUDGET_MS;

    try {
        // Role check
        const roleByType: Record<UploadType, UserRole> = {
            patients: UserRole.FrontDesk,
            drug_inventory: UserRole.Pharmacist,
            lab_test_catalog: UserRole.LabTechnician,
        };
        try {
            await requireStaff([roleByType[type]]);
        } catch (authErr: any) {
            const authReason = formatFriendlyDbError(authErr, "You do not have permission to import these records.");
            return {
                success: 0,
                failed: rows.length,
                errors: rows.map((_, i) => ({
                    row: rowOffset + i + 2,
                    reason: authReason,
                })),
            };
        }

        const sb     = await createClient();
        const errors:   { row: number; reason: string }[] = [];
        // Non-blocking notes about a row: values that could not be read and
        // were left blank, empty rows that were passed over. The row itself is
        // still imported whenever the database can accept it, so these never
        // count as failures.
        const warnings: { row: number; reason: string }[] = [];
        let success  = 0;
        let failed   = 0;

        // Map raw rows → DB objects, catching per-row mapping errors
        const mapped: Array<{ index: number; data: Record<string, any> }> = [];
        for (let i = 0; i < rows.length; i++) {
            const fileRow = rowOffset + i + 2;
            // Nothing is required, so a row whose every cell is blank would
            // create an anonymous record. That is a stray line in the
            // spreadsheet, not a patient: pass it over and say so.
            if (isBlankCsvRow(rows[i])) {
                warnings.push({ row: fileRow, reason: "This row is empty, so there was nothing to import." });
                continue;
            }
            try {
                const { data, notes } = mapRow(type, rows[i]);
                if (type === "patients" && !hasPatientData(data)) {
                    warnings.push({
                        row: fileRow,
                        reason: "No column in this row matched a patient field. The first line of the file must be a header row (name, date_of_birth, gender, phone, …).",
                    });
                    continue;
                }
                for (const note of notes) warnings.push({ row: fileRow, reason: note });
                mapped.push({ index: i, data });
            } catch (e: any) {
                failed++;
                errors.push({
                    row: fileRow,
                    reason: formatFriendlyDbError(e, "Invalid data in this row"),
                });
            }
        }

        if (!mapped.length) return { success, failed, errors, warnings };

        // Hospital numbers for patients (one shared NVH-XXXXX series)
        if (type === "patients") {
            const explicitMax = mapped.reduce((max, m) => {
                const n = hospitalNumberSuffix(String(m.data.hospital_number ?? "").trim());
                return n !== null && n > max ? n : max;
            }, 0);
            if (explicitMax > 0) {
                try {
                    const { error } = await sb.rpc("advance_hospital_number_seq", {
                        p_prefix: "NVH",
                        p_number: formatHospitalNumber(explicitMax),
                    });
                    if (error) console.error("[bulk-upload] advance_hospital_number_seq:", error);
                } catch (e) {
                    console.error("[bulk-upload] advance_hospital_number_seq:", e);
                }
            }

            const blanks = mapped.filter((m) => !String(m.data.hospital_number ?? "").trim());
            if (blanks.length) {
                const numbers = await allocateHospitalNumbers(sb, blanks.length);
                blanks.forEach((m, i) => {
                    if (numbers[i]) m.data.hospital_number = numbers[i];
                });
            }
        }

        // Screen out records that already exist. A re-upload (or paper-record
        // hospital numbers already in the system) would otherwise fail the
        // whole batch insert on a unique index and force row-by-row isolation.
        let toInsert = mapped;
        if (type === "patients" && Date.now() < deadline) {
            toInsert = await removeExistingPatients(sb, mapped, rowOffset, errors);
            failed  += mapped.length - toInsert.length;
        }

        // Insert rows, isolating individual failures within the time budget
        if (toInsert.length) {
            const inserted = await insertResilient(sb, TABLES[type], toInsert, rowOffset, errors, deadline);
            success += inserted.success;
            failed  += inserted.failed;
        }

        // Errors are collected out of order (parallel isolation) — sort them so
        // the downloadable report reads top-to-bottom like the CSV.
        errors.sort((a, b) => a.row - b.row);
        warnings.sort((a, b) => a.row - b.row);

        return { success, failed, errors, warnings };
    } catch (e: any) {
        // Never throw raw uncaught exceptions to the client — always return a structured result
        const msg = formatFriendlyDbError(e, "Failed to upload this chunk of records. Please try again.");
        console.error("[bulk-upload] bulkUploadChunk outer:", e);
        return {
            success: 0,
            failed: rows.length,
            errors: rows.map((_, i) => ({
                row: rowOffset + i + 2,
                reason: msg,
            })),
        };
    }
}
