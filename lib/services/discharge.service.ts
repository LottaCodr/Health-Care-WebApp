"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { assertRecordAmendable } from "./record-lock";

const SELECT = `
    *,
    patients!discharge_notes_patient_id_fkey(id, name, phone, gender, birth_date),
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
    await requireStaff([UserRole.Doctor]);
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

/**
 * Amend a discharge note inside the 24-hour window (author only).
 *
 * Discharge paperwork is the record most likely to be re-read months later, so
 * the freeze matters most here: after 24 hours the note is fixed and anything
 * the doctor needs to add goes in as an append-only correction note.
 */
export async function updateDischargeNote(
    id: string,
    updates: Partial<Record<keyof CreateDischargeNoteInput, any>>
): Promise<any> {
    const actor = await requireStaff([UserRole.Doctor]);
    const mapped = toDbColumns(updates);

    await assertRecordAmendable("discharge_note", id, mapped, { roles: false, actor });

    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .update(mapped)
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired This discharge note is past its 24-hour amendment window. Attach a correction note instead.");
        }
        console.error("[discharge] update:", error);
        throw error;
    }

    await logAction("DISCHARGE_NOTE_UPDATED", "discharge_notes", id, {
        patient_id: (data as any)?.patient_id ?? null,
        updated_by: actor.userId,
        fields: Object.keys(mapped),
    });
    return data;
}

/** camelCase input → the snake_case columns the note owns. */
function toDbColumns(updates: Record<string, any>): Record<string, any> {
    const map: Record<string, string> = {
        finalDiagnosis: "final_diagnosis",
        conditionOnDischarge: "condition_on_discharge",
        hospitalCourse: "hospital_course",
        medicationsOnDischarge: "medications_on_discharge",
        followUpDate: "follow_up_date",
        followUpInstructions: "follow_up_instructions",
        activityRestrictions: "activity_restrictions",
        dietInstructions: "diet_instructions",
        emergencyReturnCriteria: "emergency_return_criteria",
        dischargeType: "discharge_type",
        transferredTo: "transferred_to",
    };
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates ?? {})) {
        if (value === undefined) continue;
        out[map[key] ?? key] = value;
    }
    return out;
}

export async function getDischargeNoteById(id: string) {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .select(SELECT)
        .eq("id", id)
        .maybeSingle();
    if (error) { console.error("[discharge] getById:", error); return null; }
    return data ?? null;
}

export async function getDischargeNoteByPatient(patientId: string) {
    await requireStaff();
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
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("discharge_notes")
        .select(SELECT)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}