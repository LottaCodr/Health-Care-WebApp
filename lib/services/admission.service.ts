"use server";

import { createClient } from "@/utils/supabase/server";
import type {
    PatientAdmission,
    CreateAdmissionInput,
    AssignWardInput,
} from "@/types/admission.types";

const SELECT_FIELDS = `
    *,
    patients ( name, gender, birth_date, phone ),
    staffs   ( name )
`.trim();

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getActiveAdmissions(): Promise<PatientAdmission[]> {
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .select(SELECT_FIELDS)
        .eq("status", "pending")
        .order("admitted_at", { ascending: true });   // longest waiting first

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PatientAdmission[];
}

export async function getAdmissionsByPatient(patientId: string): Promise<PatientAdmission[]> {
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .select(SELECT_FIELDS)
        .eq("patient_id", patientId)
        .order("admitted_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PatientAdmission[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createAdmission(input: CreateAdmissionInput): Promise<PatientAdmission> {
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .insert([{
            patient_id:     input.patient_id,
            admission_type: input.admission_type,
            urgency:        input.urgency,
            ward_name:      input.ward_name    ?? null,
            bed_number:     input.bed_number   ?? null,
            indication:     input.indication   ?? null,
            notes:          input.notes        ?? null,
            assigned_by:    input.assigned_by,
            status:         "active",
            admitted_at:    new Date().toISOString(),
        }])
        .select(SELECT_FIELDS)
        .single();

    if (error) throw new Error(error.message);
    return data as unknown as PatientAdmission;
}

export async function assignWard(input: AssignWardInput): Promise<PatientAdmission> {
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .update({
            ward_name:   input.ward_name,
            bed_number:  input.bed_number  ?? null,
            notes:       input.notes       ?? null,
            assigned_by: input.assigned_by,
        })
        .eq("id", input.id)
        .select(SELECT_FIELDS)
        .single();

    if (error) throw new Error(error.message);
    return data as unknown as PatientAdmission;
}

export async function dischargeFromWard(admissionId: string): Promise<void> {
    const sb = await createClient();
    const { error } = await sb
        .from("patient_admissions")
        .update({ status: "discharged", discharged_at: new Date().toISOString() })
        .eq("id", admissionId);

    if (error) throw new Error(error.message);
}