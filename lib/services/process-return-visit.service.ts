"use server";

import { createClient } from "@/utils/supabase/server";
import { PatientStatus }  from "@/types/models";

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

// ─── Status mapping ───────────────────────────────────────────────────────────

const STATUS_MAP: Record<ReadmissionType, string> = {
    followup:    "awaiting-consultation",
    emergency:   "awaiting-consultation",
    readmission: "sent-to-nurse",
    pharmacy:    "sent-to-pharmacy",
};

// ─── Action ───────────────────────────────────────────────────────────────────

export async function processReturnVisit(
    input: ReadmissionInput
): Promise<{ success: boolean }> {
    const sb        = await createClient();
    const newStatus = STATUS_MAP[input.visitType];

    // 1 — Reactivate patient status
    const { error: patientError } = await sb
        .from("patients")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", input.patientId);

    if (patientError) throw new Error(`Failed to update patient: ${patientError.message}`);

    // 2 — Log readmission episode (non-fatal if table doesn't exist yet)
    const { error: logError } = await sb
        .from("patient_readmissions")
        .insert([{
            patient_id:    input.patientId,
            visit_type:    input.visitType,
            reason:        input.reason,
            priority:      input.priority,
            notes:         input.notes ?? null,
            registered_by: input.registeredBy,
            status_routed: newStatus,
        }]);

    if (logError) console.error("Readmission log failed (non-fatal):", logError.message);

    return { success: true };
}