"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "@/lib/services/auth-guard";
import { normalizeLabTestName } from "@/lib/utils/lab-catalog";
import { normalizeHospitalNumber } from "@/lib/hospital-number";

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
    await requireStaff();
    if (!values.length) return [];
    const sb    = await createClient();

    // Lab tests are keyed by NAME (the business key the billing lookup uses),
    // not by code — otherwise the same test uploaded under a different code
    // slips through and creates duplicates.
    if (type === "lab_test_catalog") {
        const { data } = await sb
            .from(TABLES[type])
            .select("test_name, test_code");

        const incoming = new Set(values.map((v) => normalizeLabTestName(v)));
        const existing = (data ?? []).flatMap((r: any) => [
            normalizeLabTestName(r.test_name),
            String(r.test_code ?? "").trim().toLowerCase(),
        ]);

        return [...new Set(existing)].filter((v) => v && incoming.has(v));
    }

    const field = type === "patients" ? "phone" : "drug_name";
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
        case "patients": {
            // Accept legacy NVHE-*/NVH-* values too, but always store them in the
            // canonical shared series (NVH + zero-padded number, no hyphen/E).
            const explicitHospitalNumber = normalizeHospitalNumber(str("hospital_number")) ?? "";
            return {
                name:                     str("name"),
                birth_date:               str("date_of_birth") || null,
                gender:                   str("gender").toLowerCase(),
                phone:                    str("phone"),
                address:                  str("address") || null,
                blood_group:              str("blood_group") || null,
                geno_type:                str("genotype")   || null,
                emergency_contact_name:   str("next_of_kin_name")  || null,
                emergency_contact_number: str("next_of_kin_phone") || null,
                // Only include an explicit number; blank rows are auto-assigned
                // in bulkUploadChunk (kept absent so pre-migration uploads work).
                ...(explicitHospitalNumber ? { hospital_number: explicitHospitalNumber } : {}),
                status:                   "registered",
            };
        }

        case "drug_inventory":
            return {
                drug_name:     str("drug_name"),
                generic_name:  str("generic_name") || null,
                category:      str("category").toUpperCase(),
                unit:          str("unit") || "Pack",
                reorder_level: num("reorder_level", 3),
                price:    num("price", 0),
                is_active:     (() => {
                    const v = (row["is_active"] ?? "TRUE").trim().toUpperCase();
                    return v !== "FALSE" && v !== "INACTIVE";
                })(),
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
    // Only the role that owns each catalog may bulk-load into it.
    const roleByType: Record<UploadType, UserRole> = {
        patients: UserRole.FrontDesk,
        drug_inventory: UserRole.Pharmacist,
        lab_test_catalog: UserRole.LabTechnician,
    };
    await requireStaff([roleByType[type]]);

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

    // Hospital numbers for patients (one shared NVHXXXXX series):
    //  • an explicit number in the CSV (e.g. NVH00001 or a legacy NVH-000001)
    //    is normalized and kept, and the counter is advanced past it so
    //    auto-assignment never collides;
    //  • a blank hospital_number gets a fresh NVHXXXXX assigned server-side.
    if (type === "patients") {
        for (const m of mapped) {
            const explicit = String(m.data.hospital_number ?? "").trim();
            if (!explicit) continue;
            try {
                await sb.rpc("advance_hospital_number_seq", { p_prefix: "NVH", p_number: explicit });
            } catch (e) {
                // Function may be missing pre-migration — keep the explicit value.
                console.error("[bulk-upload] advance_hospital_number_seq:", e);
            }
        }
        for (const m of mapped) {
            if (String(m.data.hospital_number ?? "").trim()) continue;
            try {
                const { data: hn, error: hnError } = await sb.rpc("next_hospital_number", { p_prefix: "NVH" });
                if (!hnError && typeof hn === "string") m.data.hospital_number = normalizeHospitalNumber(hn) ?? hn;
            } catch (e) {
                console.error("[bulk-upload] next_hospital_number:", e);
            }
        }
    }

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