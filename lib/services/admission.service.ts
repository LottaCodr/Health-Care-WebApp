"use server";

import { createClient } from "@/utils/supabase/server";
import type {
    PatientAdmission,
    CreateAdmissionInput,
    AssignWardInput,
} from "@/types/admission.types";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";

const SELECT_FIELDS = `
    *,
    patients ( name, gender, birth_date, phone ),
    staffs   ( name )
`.trim();

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all active admission records from patient_admissions.
 * This covers:
 *  - Patients routed via the consultation "Front Desk" option
 *  - Patients re-encountered as "readmission"
 * Both paths now create a patient_admissions record, so this is the
 * single source of truth for the admissions queue.
 */
export async function getActiveAdmissions(): Promise<PatientAdmission[]> {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .select(SELECT_FIELDS)
        .eq("status", "active")
        .order("admitted_at", { ascending: true });   // longest waiting first

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PatientAdmission[];
}

export async function getAdmissionById(admissionId: string): Promise<PatientAdmission | null> {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .select(SELECT_FIELDS)
        .eq("id", admissionId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    return data as unknown as PatientAdmission | null;
}

export async function getAdmissionsByPatient(patientId: string): Promise<PatientAdmission[]> {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("patient_admissions")
        .select(SELECT_FIELDS)
        .eq("patient_id", patientId)
        .order("admitted_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PatientAdmission[];
}

/**
 * Called from the consultation form when a doctor routes a patient to "admitted".
 * Creates a pending admission record so it appears in the front-desk queue.
 */
export async function createAdmission(input: CreateAdmissionInput): Promise<PatientAdmission> {
    await requireStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
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
    await requireStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
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
    await requireStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
    const sb = await createClient();

    // Get patient_id first so we can update patient status
    const { data: admission } = await sb
        .from("patient_admissions")
        .select("patient_id")
        .eq("id", admissionId)
        .single();

    const { error } = await sb
        .from("patient_admissions")
        .update({ status: "discharged", discharged_at: new Date().toISOString() })
        .eq("id", admissionId);

    if (error) throw new Error(error.message);

    // Update patient status to awaiting-payment on ward discharge
    if (admission?.patient_id) {
        await sb
            .from("patients")
            .update({ status: "awaiting-payment", updated_at: new Date().toISOString() })
            .eq("id", admission.patient_id);
    }
}