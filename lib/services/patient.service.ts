"use server";

import { createClient } from "@/utils/supabase/server";
import { Patient, PatientStatus, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { normalizeHospitalNumber } from "@/lib/hospital-number";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";

/**
 * Roles that may advance a patient through the workflow state machine
 * (QueueSuite/front desk, nurse vitals, lab results, radiology reports,
 * discharge notes — all call updatePatientStatus in this codebase).
 */
const STATUS_CHANGE_ROLES: UserRole[] = [
    UserRole.FrontDesk,
    UserRole.Doctor,
    UserRole.Nurse,
    UserRole.LabTechnician,
    UserRole.Pharmacist,
    UserRole.Radiologist,
];

/** Convert empty/whitespace strings to null so they never violate constraints or store empty text */
function cleanPatientPayload(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            cleaned[key] = trimmed.length > 0 ? trimmed : null;
        } else {
            cleaned[key] = value ?? null;
        }
    }
    return cleaned;
}

export async function createPatient(
    data: Omit<Patient, "id" | "created_at" | "updated_at">
): Promise<Patient> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();

    // Hospital number: every patient — EMR-registered or bulk-imported — uses
    // the same shared NVH-XXXXX series.
    // Degrades gracefully if the hospital_number migration hasn't been applied.
    let hospital_number: string | null = null;
    try {
        const { data: hn, error: hnError } = await supabase
            .rpc("next_hospital_number", { p_prefix: "NVH" });
        if (!hnError && typeof hn === "string") hospital_number = normalizeHospitalNumber(hn) ?? hn;
        else if (hnError) console.error("[patient] next_hospital_number:", hnError);
    } catch (e) {
        console.error("[patient] hospital number generation skipped:", e);
    }

    const payload = cleanPatientPayload({
        ...data,
        ...(hospital_number ? { hospital_number } : {}),
        status: data.status || "registered",
    });

    const { data: result, error } = await supabase
        .from("patients")
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("[patient] createPatient:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to register patient. Please check the entered details."));
    }

    await logAction("PATIENT_REGISTERED", "patients", result.id, {
        name: result.name,
        registered_by: actor.userId,
    });

    return result as unknown as Patient;
}

export async function getPatientById(id: string): Promise<Patient | null> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[patient] getPatientById:", error); return null; }
    return data as unknown as Patient;
}

export async function updatePatient(
    id: string,
    updates: Partial<Patient>
): Promise<Patient> {
    await requireStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
    const supabase = await createClient();
    const payload = cleanPatientPayload(updates);

    const { data, error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("[patient] updatePatient:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to update patient record."));
    }
    return data as unknown as Patient;
}

export async function updatePatientStatus(
    id: string,
    status: PatientStatus
): Promise<Patient> {
    const actor = await requireStaff(STATUS_CHANGE_ROLES);

    const supabase = await createClient();
    const { data: before } = await supabase
        .from("patients")
        .select("status")
        .eq("id", id)
        .maybeSingle();

    const { data, error } = await supabase
        .from("patients")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("[patient] updatePatientStatus:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to update patient status."));
    }

    await logAction("PATIENT_STATUS_CHANGED", "patients", id, {
        from: before?.status ?? null,
        to: status,
        changed_by: actor.userId,
    });

    return data as Patient;
}

export async function listPatientsByStatus(
    status: PatientStatus
): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();
    const allData: Patient[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("status", status)
            // FIFO: earliest arrivals first. `id` as a stable tie-breaker keeps
            // range() pagination deterministic when timestamps collide.
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + batchSize - 1);

        if (error) { console.error("[patient] listPatientsByStatus:", error); break; }
        if (!data || data.length === 0) break;
        allData.push(...(data as Patient[]));
        if (data.length < 100) break;
        from += data.length;
    }

    return allData;
}

export async function searchPatients(query: string): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,hospital_number.ilike.%${query}%`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(100);

    if (error) { console.error("[patient] searchPatients:", error); return []; }
    return data as Patient[];
}

export async function getAllPatients(
    page = 0,
    limit?: number
): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();

    if (limit && limit <= 500) {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            // FIFO: earliest arrivals first (see listPatientsByStatus).
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(page * limit, (page + 1) * limit - 1);

        if (error) { console.error("[patient] getAllPatients:", error); return []; }
        return data as Patient[];
    }

    const allData: Patient[] = [];
    let from = page * (limit ?? 0);
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            // FIFO: earliest arrivals first (see listPatientsByStatus).
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + batchSize - 1);

        if (error) { console.error("[patient] getAllPatients:", error); break; }
        if (!data || data.length === 0) break;
        allData.push(...(data as Patient[]));
        if (data.length < 100) break;
        from += data.length;
        if (limit && allData.length >= limit) break;
    }

    return allData;
}
