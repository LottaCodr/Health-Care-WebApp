
"use server";

import { createClient } from "@/utils/supabase/server";

// ─── Shared select ────────────────────────────────────────────────────────────
// Join patients so the radiologist can see who the request belongs to.

const SELECT = "*, patients(id, name, phone, gender, date_of_birth, allergies, significant_medication_history)";
const PREFIX = "[RADIOLOGY]";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listPendingRadiologyRequests() {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });   // oldest first → FIFO queue
    if (error) throw error;
    return data ?? [];
}

export async function listCompletedRadiologyRequests() {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "completed")
        .order("completed_at", { ascending: false }); // newest completed first
    if (error) throw error;
    return data ?? [];
}

export async function listRadiologyRequestsByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("visit_id", patientId)                   // visit_id stores the patient_id
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function getRadiologyRequestById(id: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export interface CreateRadiologyRequestInput {
    patientId: string;
    requestedBy: string;
    testType: string;   // will be stored as "[RADIOLOGY] <testType>"
    priority?: string;
    notes?: string;
}

export async function createRadiologyRequest(input: CreateRadiologyRequestInput) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .insert([{
            visit_id: input.patientId,
            requested_by: input.requestedBy,
            test_type: input.testType.startsWith(PREFIX)
                ? input.testType
                : `${PREFIX} ${input.testType}`,
            priority: input.priority ?? "routine",
            notes: input.notes ?? null,
            status: "pending",
        }])
        .select(SELECT)
        .single();
    if (error) throw error;
    return data;
}

export interface SubmitRadiologyReportInput {
    status: "completed";
    result: string;
    completed_by: string;
    completed_at: string;
}

export async function submitRadiologyReport(
    id: string,
    report: SubmitRadiologyReportInput
) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .update(report)
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) throw error;
    return data;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Strip the "[RADIOLOGY] " prefix for display purposes */
export async function stripRadiologyPrefix(testType: string): Promise<string> {
    return testType.replace(/^\[RADIOLOGY\]\s*/, "");
}