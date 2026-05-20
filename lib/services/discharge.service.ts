"use server";

import { createClient } from "@/utils/supabase/server";

const SELECT = `
    *,
    patients!discharge_notes_patient_id_fkey(id, name, phone, gender, date_of_birth),
    staffs!discharge_notes_doctor_id_fkey(id, name, role)
`.trim();

export interface CreateDischargeNoteInput {
    patientId:               string;
    consultationId?:         string;
    doctorId:                string;
    finalDiagnosis:          string;
    conditionOnDischarge:    string;
    hospitalCourse?:         string;
    medicationsOnDischarge?: string;
    followUpDate?:           string;
    followUpInstructions?:   string;
    activityRestrictions?:   string;
    dietInstructions?:       string;
    emergencyReturnCriteria?:string;
    dischargeType?:          string;
    transferredTo?:          string;
}

export async function createDischargeNote(input: CreateDischargeNoteInput) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .insert([{
            patient_id:                input.patientId,
            consultation_id:           input.consultationId          ?? null,
            doctor_id:                 input.doctorId,
            final_diagnosis:           input.finalDiagnosis,
            condition_on_discharge:    input.conditionOnDischarge,
            hospital_course:           input.hospitalCourse           ?? null,
            medications_on_discharge:  input.medicationsOnDischarge   ?? null,
            follow_up_date:            input.followUpDate             ?? null,
            follow_up_instructions:    input.followUpInstructions     ?? null,
            activity_restrictions:     input.activityRestrictions     ?? null,
            diet_instructions:         input.dietInstructions         ?? null,
            emergency_return_criteria: input.emergencyReturnCriteria  ?? null,
            discharge_type:            input.dischargeType            ?? "regular",
            transferred_to:            input.transferredTo            ?? null,
        }])
        .select(SELECT)
        .single();
    if (error) throw error;
    return data;
}

export async function getDischargeNoteByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .select(SELECT)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
}

export async function listDischargeNotes() {
    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .select(SELECT)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}