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
}

// ─── Check which records already exist ───────────────────────────────────────

// PostgREST turns .in(field, values) into a query-string filter, so a lookup
// for thousands of values (a 5k-patient import) would blow the URL length
// limit. The lookup is split into small value batches instead.
const EXISTING_CHECK_BATCH = 200;

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

function mapRow(type: UploadType, row: Record<string, string>): Record<string, any> {
    const str = (k: string, fb = "") => (row[k] ?? fb).trim();
    const clean = (k: string) => {
        const v = (row[k] ?? "").trim();
        return v.length > 0 ? v : null;
    };
    const num = (k: string, fb = 0) => parseFloat(row[k] ?? "") || fb;

    switch (type) {
        case "patients": {
            // Accept legacy NVHE-*/NVH* values too, but always store them in the
            // canonical shared series (NVH- + zero-padded number).
            const explicitHospitalNumber = normalizeHospitalNumber(str("hospital_number")) ?? "";
            const rawGender = clean("gender");
            const normalizedGender = rawGender
                ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase())
                : "Male";

            return {
                name:                     str("name"),
                birth_date:               clean("date_of_birth"),
                gender:                   normalizedGender,
                phone:                    str("phone"),
                address:                  clean("address"),
                blood_group:              clean("blood_group"),
                geno_type:                clean("genotype") || clean("geno_type"),
                emergency_contact_name:   clean("next_of_kin_name") || clean("emergency_contact_name"),
                emergency_contact_number: clean("next_of_kin_phone") || clean("emergency_contact_number"),
                email:                    clean("email"),
                // Only include an explicit number; blank rows are auto-assigned
                // in bulkUploadChunk (kept absent so pre-migration uploads work).
                ...(explicitHospitalNumber ? { hospital_number: explicitHospitalNumber } : {}),
                status:                   "registered",
            };
        }

        case "drug_inventory":
            return {
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
            };

        case "lab_test_catalog":
            return {
                test_name:    str("test_name"),
                test_code:    str("test_code"),
                category:     clean("category"),
                normal_range: clean("normal_range"),
                unit:         clean("unit"),
                price:        num("price", 0),
                is_active:    true,
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
 * Inserts rows as one batch (fast path). On failure the batch is bisected and
 * retried recursively so one bad row doesn't block the rest; only genuinely failing
 * rows are isolated and reported with human-friendly messages.
 */
async function insertResilient(
    sb: any,
    table: string,
    rows: Array<{ index: number; data: Record<string, any> }>,
    rowOffset: number,
    errors: { row: number; reason: string }[],
): Promise<{ success: number; failed: number }> {
    try {
        const { error } = await sb.from(table).insert(rows.map((r) => r.data));
        if (!error) return { success: rows.length, failed: 0 };

        // If it's a table-level error, don't recursively bisect 1,000 times
        if (isTableLevelError(error)) {
            const reason = formatFriendlyDbError(error);
            for (const r of rows) {
                errors.push({
                    row: rowOffset + r.index + 2,
                    reason,
                });
            }
            return { success: 0, failed: rows.length };
        }

        if (rows.length === 1) {
            errors.push({
                row:    rowOffset + rows[0].index + 2,
                reason: formatFriendlyDbError(error),
            });
            return { success: 0, failed: 1 };
        }

        const mid   = Math.ceil(rows.length / 2);
        const left  = await insertResilient(sb, table, rows.slice(0, mid), rowOffset, errors);
        const right = await insertResilient(sb, table, rows.slice(mid), rowOffset, errors);
        return { success: left.success + right.success, failed: left.failed + right.failed };
    } catch (e: any) {
        if (isTableLevelError(e)) {
            const reason = formatFriendlyDbError(e);
            for (const r of rows) {
                errors.push({
                    row: rowOffset + r.index + 2,
                    reason,
                });
            }
            return { success: 0, failed: rows.length };
        }

        if (rows.length === 1) {
            errors.push({
                row:    rowOffset + rows[0].index + 2,
                reason: formatFriendlyDbError(e),
            });
            return { success: 0, failed: 1 };
        }

        const mid   = Math.ceil(rows.length / 2);
        const left  = await insertResilient(sb, table, rows.slice(0, mid), rowOffset, errors);
        const right = await insertResilient(sb, table, rows.slice(mid), rowOffset, errors);
        return { success: left.success + right.success, failed: left.failed + right.failed };
    }
}

// ─── Upload one chunk ─────────────────────────────────────────────────────────
// rowOffset = file row number of the first item in this chunk (for error reporting).

export async function bulkUploadChunk(
    type:      UploadType,
    rows:      Record<string, string>[],
    rowOffset: number,
): Promise<ChunkResult> {
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
        const errors: { row: number; reason: string }[] = [];
        let success  = 0;
        let failed   = 0;

        // Map raw rows → DB objects, catching per-row mapping errors
        const mapped: Array<{ index: number; data: Record<string, any> }> = [];
        for (let i = 0; i < rows.length; i++) {
            try {
                mapped.push({ index: i, data: mapRow(type, rows[i]) });
            } catch (e: any) {
                failed++;
                errors.push({
                    row: rowOffset + i + 2,
                    reason: formatFriendlyDbError(e, "Invalid data in this row"),
                });
            }
        }

        if (!mapped.length) return { success, failed, errors };

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

        // Insert rows with resilient bisection for individual error isolation
        const inserted = await insertResilient(sb, TABLES[type], mapped, rowOffset, errors);
        success += inserted.success;
        failed  += inserted.failed;

        return { success, failed, errors };
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
