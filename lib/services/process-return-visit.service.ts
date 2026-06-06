"use server";
 
import { createClient } from "@/utils/supabase/server";
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
export type ReadmissionType = "followup" | "emergency" | "readmission" | "pharmacy";
 
export interface ReadmissionInput {
    patientId:      string;
    visitType:      ReadmissionType;
    reason:         string;
    priority:       "routine" | "urgent" | "emergency";
    notes?:         string;
    registeredBy:   string;
}
 
// Status each visit type maps to
const STATUS_MAP: Record<ReadmissionType, string> = {
    followup:    "awaiting-consultation",
    emergency:   "awaiting-consultation",
    readmission: "admitted",
    pharmacy:    "sent-to-pharmacy",
};
 
// ─── Action ───────────────────────────────────────────────────────────────────
 
export async function processReturnVisit(input: ReadmissionInput): Promise<void> {
    const sb        = await createClient();
    const newStatus = STATUS_MAP[input.visitType];
 
    // 1 — Reactivate patient with new status
    const { error: patientError } = await sb
        .from("patients")
        .update({
            status:     newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq("id", input.patientId);
 
    if (patientError) throw new Error(`Failed to update patient status: ${patientError.message}`);
 
    // 2 — Log the readmission episode
    //     Uses a lightweight insert so the history is traceable.
    //     Table: patient_readmissions — see SQL below.
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
 
    // Non-fatal — don't throw if log fails, patient is already reactivated
    if (logError) console.error("Readmission log failed (non-fatal):", logError.message);
}