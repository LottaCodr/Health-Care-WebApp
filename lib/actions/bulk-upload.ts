"use server";

import { createClient } from "@/utils/supabase/server";

// ── Table names — update if your schema differs ───────────────────────────────
const TABLES = {
    patients:  "patients",
    drug_inventory:     "drug_inventory",       // pharmacy drug catalog
    lab_test_catalog: "lab_test_catalog",   // lab test catalog
} as const;

export type UploadType = "patients" | "drug_inventory" | "lab_test_catalog";

export interface ChunkResult {
    success: number;
    failed:  number;
    errors:  { row: number; reason: string }[];
}

// ─── Check which records already exist ───────────────────────────────────────

export async function checkExistingRecords(
    type: UploadType,
    values: string[],
): Promise<string[]> {
    if (!values.length) return [];
    const sb    = await createClient();
    const field = type === "patients" ? "phone" : type === "drug_inventory" ? "drug_name" : "test_code";

    const { data } = await sb
        .from(TABLES[type])
        .select(field)
        .in(field, values);

    return (data ?? []).map((r: any) => String(r[field] ?? "").toLowerCase().trim());
}

// ─── Map raw CSV row → DB shape ───────────────────────────────────────────────

function mapRow(type: UploadType, row: Record<string, string>): Record<string, any> {
    const str = (k: string, fb = "") => (row[k] ?? fb).trim();
    const num = (k: string, fb = 0)  => parseFloat(row[k] ?? "") || fb;

    switch (type) {
        case "patients":
            return {
                name:                     str("name"),
                date_of_birth:            str("date_of_birth") || null,
                gender:                   str("gender").toLowerCase(),
                phone:                    str("phone"),
                address:                  str("address") || null,
                blood_group:              str("blood_group") || null,
                geno_type:                str("genotype")   || null,
                emergency_contact_name:   str("next_of_kin_name")  || null,
                emergency_contact_number: str("next_of_kin_phone") || null,
                status:                   "registered",
            };

        case "drug_inventory":
            return {
                drug_name:     str("drug_name"),
                generic_name:  str("generic_name") || null,
                category:      str("category").toUpperCase(),
                unit:          str("unit") || "Pack",
                reorder_level: num("reorder_level", 3),
                price:    num("price", 0),
                is_active:     str("status", "TRUE").toUpperCase() !== "FALSE",
            };

        case "lab_test_catalog":
            return {
                test_name:    str("test_name"),
                test_code:    str("test_code"),
                category:     str("category")     || null,
                normal_range: str("normal_range") || null,
                unit:         str("unit")         || null,
                price:        num("price", 0),
                is_active:    true,
            };

        default:
            throw new Error(`Unknown upload type: ${type}`);
    }
}

// ─── Upload one chunk ─────────────────────────────────────────────────────────
// rowOffset = file row number of the first item in this chunk (for error reporting).

export async function bulkUploadChunk(
    type:      UploadType,
    rows:      Record<string, string>[],
    rowOffset: number,
): Promise<ChunkResult> {
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
            errors.push({ row: rowOffset + i + 2, reason: e.message });
        }
    }

    if (!mapped.length) return { success, failed, errors };

    // Try batch insert first (fast path)
    const { error: batchError } = await sb
        .from(TABLES[type])
        .insert(mapped.map(m => m.data));

    if (!batchError) {
        return { success: success + mapped.length, failed, errors };
    }

    // Batch failed — fall back to individual inserts to isolate failures
    for (const { index, data } of mapped) {
        const { error: rowError } = await sb.from(TABLES[type]).insert([data]);
        if (rowError) {
            failed++;
            const isDupe = rowError.code === "23505" || rowError.message.toLowerCase().includes("duplicate");
            errors.push({
                row:    rowOffset + index + 2,
                reason: isDupe ? "Already exists — duplicate record" : rowError.message,
            });
        } else {
            success++;
        }
    }

    return { success, failed, errors };
}