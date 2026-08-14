"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import type {
    PatientAllergy,
    Immunization,
    Surgery,
    Referral,
    MedReconciliation,
} from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/** Roles allowed to author clinical records (write) — Admin always passes. */
const CLINICAL_WRITE: UserRole[] = [UserRole.Doctor, UserRole.Nurse];

// ═══════════════════════════════════ ALLERGIES ═════════════════════════════════

export async function listAllergies(patientId: string): Promise<PatientAllergy[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patient_allergies")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
    if (error) { console.error("[allergy] list:", error); return []; }
    return data as unknown as PatientAllergy[];
}

export async function createAllergy(
    input: Omit<PatientAllergy, "id" | "created_at" | "updated_at">
): Promise<PatientAllergy> {
    const actor = await requireStaff([...CLINICAL_WRITE, UserRole.FrontDesk]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patient_allergies")
        .insert([{ ...input, recorded_by: actor.userId }])
        .select()
        .single();
    if (error) throw error;
    await logAction("ALLERGY_ADDED", "patient_allergies", data.id, {
        patient_id: input.patient_id,
        allergen: input.allergen,
        severity: input.severity,
    });
    return data as unknown as PatientAllergy;
}

export async function updateAllergy(
    id: string,
    updates: Partial<PatientAllergy>
): Promise<PatientAllergy> {
    await requireStaff(CLINICAL_WRITE);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patient_allergies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    return data as unknown as PatientAllergy;
}

export async function deleteAllergy(id: string): Promise<void> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { error } = await supabase.from("patient_allergies").delete().eq("id", id);
    if (error) throw error;
    await logAction("ALLERGY_DELETED", "patient_allergies", id);
}

// ═══════════════════════════════ IMMUNIZATIONS ════════════════════════════════

export async function listImmunizations(patientId: string): Promise<Immunization[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("immunizations")
        .select("*")
        .eq("patient_id", patientId)
        .order("administered_date", { ascending: false });
    if (error) { console.error("[immunization] list:", error); return []; }
    return data as unknown as Immunization[];
}

export async function createImmunization(
    input: Omit<Immunization, "id" | "created_at">
): Promise<Immunization> {
    const actor = await requireStaff(CLINICAL_WRITE);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("immunizations")
        .insert([{ ...input, administered_by: actor.userId }])
        .select()
        .single();
    if (error) throw error;
    await logAction("IMMUNIZATION_RECORDED", "immunizations", data.id, {
        patient_id: input.patient_id,
        vaccine: input.vaccine,
        dose_number: input.dose_number,
    });
    return data as unknown as Immunization;
}

export async function deleteImmunization(id: string): Promise<void> {
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { error } = await supabase.from("immunizations").delete().eq("id", id);
    if (error) throw error;
}

// ═══════════════════════════════════ SURGERY ══════════════════════════════════

export async function listSurgeries(patientId: string): Promise<Surgery[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("surgeries")
        .select("*, staffs!surgeries_surgeon_id_fkey(name), surgeon:staffs!surgeries_surgeon_id_fkey(name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
    if (error) {
        // FK hint may not exist yet — plain fallback
        const plain = await supabase.from("surgeries").select("*").eq("patient_id", patientId).order("created_at", { ascending: false });
        if (plain.error) { console.error("[surgery] list:", plain.error); return []; }
        return plain.data as unknown as Surgery[];
    }
    return data as unknown as Surgery[];
}

export async function listSurgerySchedule(): Promise<Surgery[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("surgeries")
        .select("*, patients(name, gender, birth_date)")
        .in("status", ["scheduled", "in-progress"])
        .order("scheduled_at", { ascending: true });
    if (error) { console.error("[surgery] schedule:", error); return []; }
    return data as unknown as Surgery[];
}

export async function createSurgery(
    input: Omit<Surgery, "id" | "created_at" | "updated_at">
): Promise<Surgery> {
    await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("surgeries")
        .insert([input])
        .select()
        .single();
    if (error) throw error;
    await logAction("SURGERY_SCHEDULED", "surgeries", data.id, {
        patient_id: input.patient_id,
        procedure: input.procedure_name,
        urgency: input.urgency,
    });
    return data as unknown as Surgery;
}

export async function updateSurgery(
    id: string,
    updates: Partial<Surgery>
): Promise<Surgery> {
    await requireStaff([...CLINICAL_WRITE]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("surgeries")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    if (updates.status === "completed") {
        await logAction("SURGERY_COMPLETED", "surgeries", id, { patient_id: data.patient_id });
    }
    return data as unknown as Surgery;
}

// ═══════════════════════════════════ REFERRALS ════════════════════════════════

export async function listReferrals(patientId: string): Promise<Referral[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
    if (error) { console.error("[referral] list:", error); return []; }
    return data as unknown as Referral[];
}

export async function createReferral(
    input: Omit<Referral, "id" | "created_at" | "status" | "sent_at">
): Promise<Referral> {
    const actor = await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("referrals")
        .insert([{ ...input, referred_by: actor.userId, status: "pending" }])
        .select()
        .single();
    if (error) throw error;
    await logAction("REFERRAL_CREATED", "referrals", data.id, {
        patient_id: input.patient_id,
        facility: input.referred_to_facility,
    });
    return data as unknown as Referral;
}

export async function updateReferral(
    id: string,
    updates: Partial<Referral>
): Promise<Referral> {
    await requireStaff([UserRole.Doctor, UserRole.FrontDesk]);
    const supabase = await createClient();
    const patch: Partial<Referral> = { ...updates };
    if (updates.status === "sent" && !updates.sent_at) patch.sent_at = new Date().toISOString();
    const { data, error } = await supabase
        .from("referrals")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
    if (error) throw error;
    await logAction("REFERRAL_UPDATED", "referrals", id, { status: updates.status ?? null });
    return data as unknown as Referral;
}

// ══════════════════════════════ MED RECONCILIATION ════════════════════════════

export async function listReconciliations(patientId: string): Promise<MedReconciliation[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("med_reconciliations")
        .select("*")
        .eq("patient_id", patientId)
        .order("performed_at", { ascending: false });
    if (error) { console.error("[reconciliation] list:", error); return []; }
    return data as unknown as MedReconciliation[];
}

export async function createReconciliation(
    input: Omit<MedReconciliation, "id" | "created_at" | "performed_at">
): Promise<MedReconciliation> {
    const actor = await requireStaff([...CLINICAL_WRITE, UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("med_reconciliations")
        .insert([{ ...input, performed_by: actor.userId, performed_at: new Date().toISOString() }])
        .select()
        .single();
    if (error) throw error;
    await logAction("MED_RECONCILIATION", "med_reconciliations", data.id, {
        patient_id: input.patient_id,
        encounter_type: input.encounter_type,
        medication_count: (input.medications ?? []).length,
    });
    return data as unknown as MedReconciliation;
}
