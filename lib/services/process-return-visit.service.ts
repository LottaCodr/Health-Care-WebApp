"use server";

import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";

import { createClient } from "@/utils/supabase/server";

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
    lastDischargedAt: string | null;
    lastReason:       string | null;
    lastDiagnosis:    string | null;
    lastWard:         string | null;
}

// ─── Routing ──────────────────────────────────────────────────────────────────
// Every re-encounter starts at the nurse for triage + vitals first.
// Readmission goes to admitted (ward assignment), pharmacy goes direct.

const STATUS_MAP: Record<ReadmissionType, string> = {
    followup:    "sent-to-nurse",      // nurse triage → doctor
    emergency:   "sent-to-nurse",      // nurse triage → doctor (urgent)
    readmission: "admitted",           // front desk assigns ward
    pharmacy:    "sent-to-pharmacy",   // collect repeat prescription
};

// ─── Encounter history ────────────────────────────────────────────────────────

export async function getPatientEncounterHistory(
    patientId: string
): Promise<PatientEncounterHistory> {
    await requireStaff();
    const sb = await createClient();

    const [{ count }, { data: lastVisit }, { data: lastDischarge }, { data: lastAdmission }] =
        await Promise.all([
            sb.from("patient_readmissions").select("id", { count: "exact", head: true }).eq("patient_id", patientId),
            sb.from("patient_readmissions").select("reason, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            sb.from("discharge_notes").select("final_diagnosis, created_at").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            sb.from("patient_admissions").select("ward_name, discharged_at").eq("patient_id", patientId).order("admitted_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

    return {
        totalVisits:      count     ?? 0,
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
    await requireStaff([UserRole.FrontDesk]);
    const sb        = await createClient();
    const newStatus = STATUS_MAP[input.visitType];

    // 1 — Reactivate patient with new status
    const { error: patientError } = await sb
        .from("patients")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", input.patientId);

    if (patientError) throw new Error(`Failed to update patient: ${patientError.message}`);

    // 2 — If readmission, create a pending admission record so the queue sees it immediately
    if (input.visitType === "readmission") {
        const { error: admissionError } = await sb
            .from("patient_admissions")
            .insert([{
                patient_id:     input.patientId,
                admission_type: "readmission",
                urgency:        input.priority,
                indication:     input.reason,
                notes:          input.notes ?? null,
                assigned_by:    input.registeredBy,
                status:         "active",
                admitted_at:    new Date().toISOString(),
            }]);

        if (admissionError) console.error("Admission record creation failed (non-fatal):", admissionError.message);
    }

    // 3 — Log re-encounter episode
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