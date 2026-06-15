"use server";

import { createClient } from "@/utils/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadmissionType = "followup" | "emergency" | "readmission" | "pharmacy";

export interface ReadmissionInput {
    patientId:    string;
    visitType:    ReadmissionType;
    reason:       string;
    priority:     "routine" | "urgent" | "emergency";
    notes?:       string;
    registeredBy: string;
}

export interface PatientEncounterHistory {
    totalVisits:      number;
    lastDischargedAt: string | null;   // ISO string
    lastReason:       string | null;
    lastDiagnosis:    string | null;
    lastWard:         string | null;
}

const STATUS_MAP: Record<ReadmissionType, string> = {
    followup:    "awaiting-consultation",
    emergency:   "awaiting-consultation",
    readmission: "admitted",
    pharmacy:    "sent-to-pharmacy",
};

// ─── Get encounter history (shown in the re-encounter form) ───────────────────

export async function getPatientEncounterHistory(
    patientId: string
): Promise<PatientEncounterHistory> {
    const sb = await createClient();

    // Count all past readmissions
    const { count } = await sb
        .from("patient_readmissions")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientId);

    // Last readmission record
    const { data: lastVisit } = await sb
        .from("patient_readmissions")
        .select("reason, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // Last discharge note for diagnosis
    const { data: lastDischarge } = await sb
        .from("discharge_notes")
        .select("final_diagnosis, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    // Last ward assignment
    const { data: lastAdmission } = await sb
        .from("patient_admissions")
        .select("ward_name, discharged_at")
        .eq("patient_id", patientId)
        .order("admitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        totalVisits:      count ?? 0,
        lastDischargedAt: lastAdmission?.discharged_at ?? lastVisit?.created_at ?? null,
        lastReason:       lastVisit?.reason             ?? null,
        lastDiagnosis:    lastDischarge?.final_diagnosis ?? null,
        lastWard:         lastAdmission?.ward_name       ?? null,
    };
}

// ─── Process re-encounter ─────────────────────────────────────────────────────

export async function processReturnVisit(
    input: ReadmissionInput
): Promise<{ success: boolean }> {
    const sb        = await createClient();
    const newStatus = STATUS_MAP[input.visitType];

    const { error: patientError } = await sb
        .from("patients")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", input.patientId);

    if (patientError) throw new Error(`Failed to update patient: ${patientError.message}`);

    // Log for encounter history + readmission rate analytics
    const { error: logError } = await sb
        .from("patient_readmissions")
        .insert([{
            patient_id:    input.patientId,
            visit_type:    input.visitType,
            reason:        input.reason,
            priority:      input.priority,
            notes:         input.notes     ?? null,
            registered_by: input.registeredBy,
            status_routed: newStatus,
        }]);

    if (logError) console.error("Re-encounter log failed (non-fatal):", logError.message);

    return { success: true };
}