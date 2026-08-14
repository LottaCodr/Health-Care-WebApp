"use server";

import { createClient } from "@/utils/supabase/server";
import { Consultation, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

export interface CreateConsultationInput {
    patientId: string;
    doctorId: string;
    symptoms: string;
    diagnosis: string;
    prescriptions?: string;
    recommendations?: string;
    referredTo?: string;
    assignedStaffId?: string;
    status?: string;
    /** ICD-10 codes assigned to the diagnosis. */
    icd10Codes?: string[];
}

export async function createConsultation(
    input: CreateConsultationInput
): Promise<Consultation> {
    const actor = await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .insert([{
            patient_id: input.patientId,
            doctor_id: input.doctorId,
            symptoms: input.symptoms,
            diagnosis: input.diagnosis,
            prescriptions: input.prescriptions ?? null,
            recommendations: input.recommendations ?? null,
            referred_to: input.referredTo ?? null,
            assigned_staff_id: input.assignedStaffId ?? null,
            status: input.status ?? "underConsultation",
            icd10_codes: input.icd10Codes ?? [],
        }])
        .select()
        .single();

    if (error) { console.error("[consultation] create:", error); throw error; }

    await logAction("CONSULTATION_CREATED", "consultations", data.id, {
        patient_id: input.patientId,
        doctor_id: input.doctorId,
        created_by: actor.userId,
    });

    return data as unknown as Consultation;
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[consultation] getById:", error); return null; }
    return data as unknown as Consultation;
}

export async function listConsultationsByPatient(
    patientId: string
): Promise<Consultation[]> {
    await requireStaff();
    const supabase = await createClient();
    // Join the staff record so cards can show real doctor names instead of ids.
    const withDoctor = await supabase
        .from("consultations")
        .select("*, staffs:doctor_id(name)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    let data = withDoctor.data;

    if (withDoctor.error) {
        // Relationship may be missing in some schemas — fall back to plain rows.
        // Without this fallback the whole list fails and the consultation
        // history appears empty even though records exist (PostgREST rejects
        // the entire query when it can't resolve the doctor_id -> staffs FK).
        console.warn("[consultation] listByPatient doctor join failed, using plain rows:", withDoctor.error.message);
        const plain = await supabase
            .from("consultations")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });
        if (plain.error) { console.error("[consultation] listByPatient:", plain.error); return []; }
        data = plain.data;
    }

    return data as unknown as Consultation[];
}

export async function listConsultationsByDoctor(
    doctorId: string
): Promise<Consultation[]> {
    await requireStaff();
    const supabase = await createClient();
    // Join the patient record so dashboards can show real names instead of ids.
    const withPatient = await supabase
        .from("consultations")
        .select("*, patients(name, gender, birth_date, phone)")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false });

    let data = withPatient.data;

    if (withPatient.error) {
        // Relationship may be missing in some schemas — fall back to plain rows.
        console.warn("[consultation] listByDoctor patient join failed, using plain rows:", withPatient.error.message);
        const plain = await supabase
            .from("consultations")
            .select("*")
            .eq("doctor_id", doctorId)
            .order("created_at", { ascending: false });
        if (plain.error) { console.error("[consultation] listByDoctor:", plain.error); return []; }
        data = plain.data;
    }

    return (data ?? []).map((row: any) => ({
        ...row,
        patient_name: row?.patient_name ?? row?.patients?.name ?? null,
        patient_gender: row?.patient_gender ?? row?.patients?.gender ?? null,
        patient_birth_date: row?.patient_birth_date ?? row?.patients?.birth_date ?? null,
        patient_phone: row?.patient_phone ?? row?.patients?.phone ?? null,
    })) as unknown as Consultation[];
}

export async function updateConsultation(
    id: string,
    updates: Partial<Consultation>
): Promise<Consultation> {
    await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[consultation] update:", error); throw error; }
    return data as unknown as Consultation;
}

export async function deleteConsultation(id: string): Promise<void> {
    await requireStaff([UserRole.Doctor]);
    const supabase = await createClient();
    const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", id);

    if (error) { console.error("[consultation] delete:", error); throw error; }

    await logAction("CONSULTATION_DELETED", "consultations", id);
}