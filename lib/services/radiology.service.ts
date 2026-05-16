"use server";

// ══════════════════════════════════════════════════════════════════════════════
// lib/services/radiology.service.ts
//
// All DB operations for radiology investigations.
// Requires the FK lab_requests_visit_id_fkey to exist (see migration).
// PostgREST uses the FK name as a hint to resolve the patients join.
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@/utils/supabase/server";

const PREFIX = "[RADIOLOGY]";

// PostgREST join syntax: table!fk_constraint_name(columns)
// The FK name comes from the migration: lab_requests_visit_id_fkey
const SELECT = `
    *,
    patients!lab_requests_visit_id_fkey(
        id, name, phone, gender, date_of_birth,
        allergies, significant_medication_history
    )
`.trim();

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listPendingRadiologyRequests() {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
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
        .order("completed_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function listRadiologyRequestsByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("visit_id", patientId)
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateRadiologyRequestInput {
    patientId: string;
    requestedBy: string;
    testType: string;
    priority?: "routine" | "urgent" | "stat";
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

export async function stripRadiologyPrefix(testType: string): Promise<string> {
    return  testType.replace(/^\[RADIOLOGY\]\s*/, "");
}