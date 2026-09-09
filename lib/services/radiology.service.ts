"use server";

// ══════════════════════════════════════════════════════════════════════════════
// lib/services/radiology.service.ts
//
// All DB operations for radiology investigations.
// Requires the FK lab_requests_visit_id_fkey to exist (see migration).
// PostgREST uses the FK name as a hint to resolve the patients join.
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { assertRecordAmendable } from "./record-lock";

const PREFIX = "[RADIOLOGY]";

// PostgREST join syntax: table!fk_constraint_name(columns)
// The FK name comes from the migration: lab_requests_visit_id_fkey
const SELECT = `
    *,
    patients!lab_requests_visit_id_fkey(
        id, name, phone, gender, birth_date,
        allergies, significant_medication_history, hospital_number
    )
`.trim();

// Shape of a radiology row (a `[RADIOLOGY]`-prefixed lab_request).
export interface RadiologyRequest {
    id: string;
    visit_id: string;
    test_type?: string;
    priority?: string | null;
    notes?: string | null;
    result?: string | null;
    status: string;
    requested_by?: string;
    completed_by?: string;
    completed_at?: string;
    created_at?: string;
    patients?: unknown;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listPendingRadiologyRequests() {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
    if (error) throw error;
    return (data as unknown as RadiologyRequest[]) ?? [];
}

export async function listCompletedRadiologyRequests() {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as RadiologyRequest[]) ?? [];
}

export async function listRadiologyRequestsByPatient(patientId: string) {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("visit_id", patientId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as RadiologyRequest[]) ?? [];
}

export async function getRadiologyRequestById(id: string) {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .eq("id", id)
        .single();
    if (error) throw error;
    return data as unknown as RadiologyRequest;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateRadiologyRequestInput {
    patientId: string;
    requestedBy: string;
    testType: string;
    priority?: "routine" | "urgent" | "stat";
    notes?: string;
}

export async function createRadiologyRequest(input: CreateRadiologyRequestInput) {
    await requireStaff([UserRole.Doctor]);
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
    return data as unknown as RadiologyRequest;
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
    const actor = await requireStaff([UserRole.Radiologist]);

    // Filing a report for the first time is never blocked; OVERWRITING one is
    // an amendment and must happen within 24 hours, by the reporting
    // radiologist only. After that the report is frozen and corrections go in
    // as an append-only note (see lib/records/amendment-policy.ts).
    const ctx = await assertRecordAmendable("radiology_report", id, report as Record<string, any>, {
        roles: false,
        actor,
    });

    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .update({ ...report, ...(ctx?.patch ?? {}) })
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired This report is past its 24-hour amendment window. Attach a correction note instead.");
        }
        console.error("[radiology] submitReport:", error);
        throw error;
    }

    const result = data as unknown as RadiologyRequest;

    // Auto-route patient back to doctor queue when report submitted
    if (report.status === "completed" && result.visit_id) {
        const { error: patientError } = await sb
            .from("patients")
            .update({ status: "awaiting-consultation" })
            .eq("id", result.visit_id);
        if (patientError) {
            throw new Error("Report was filed, but the patient could not be returned to the doctor queue.");
        }
    }

    return result;
}