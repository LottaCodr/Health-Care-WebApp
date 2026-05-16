"use server";

import { createClient } from "@/utils/supabase/server";
import { Consultation } from "@/types/models";

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
}

export async function createConsultation(
    input: CreateConsultationInput
): Promise<Consultation> {
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
        }])
        .select()
        .single();

    if (error) { console.error("[consultation] create:", error); throw error; }
    return data as unknown as Consultation;
}

export async function getConsultationById(id: string): Promise<Consultation | null> {
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
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[consultation] listByPatient:", error); return []; }
    return data as unknown as Consultation[];
}

export async function listConsultationsByDoctor(
    doctorId: string
): Promise<Consultation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[consultation] listByDoctor:", error); return []; }
    return data as unknown as Consultation[];
}

export async function updateConsultation(
    id: string,
    updates: Partial<Consultation>
): Promise<Consultation> {
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
    const supabase = await createClient();
    const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", id);

    if (error) { console.error("[consultation] delete:", error); throw error; }
}