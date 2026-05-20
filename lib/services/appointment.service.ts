"use server";

import { createClient } from "@/utils/supabase/server";

const SELECT = `
    *,
    patients!appointments_patient_id_fkey(id, name, phone, gender, date_of_birth),
    staffs!appointments_doctor_id_fkey(id, name, role)
`.trim();

export interface CreateAppointmentInput {
    patientId:       string;
    scheduledBy:     string;
    doctorId?:       string;
    appointmentDate: string;
    appointmentTime: string;
    reason:          string;
    department?:     string;
    priority?:       string;
    notes?:          string;
}

export async function createAppointment(input: CreateAppointmentInput) {
    const sb = await createClient();
    const { data, error } = await sb.from("appointments").insert([{
        patient_id:       input.patientId,
        scheduled_by:     input.scheduledBy,
        doctor_id:        input.doctorId        ?? null,
        appointment_date: input.appointmentDate,
        appointment_time: input.appointmentTime,
        reason:           input.reason,
        department:       input.department      ?? "Doctor",
        priority:         input.priority        ?? "routine",
        notes:            input.notes           ?? null,
        status:           "scheduled",
    }]).select(SELECT).single();
    if (error) throw error;
    return data;
}

export async function listAppointmentsByDate(date: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .eq("appointment_date", date)
        .order("appointment_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function listAppointmentsByPatient(patientId: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

export async function listUpcomingAppointments() {
    const sb   = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .gte("appointment_date", today)
        .not("status", "in", '("cancelled","completed","no_show")')
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });
    if (error) throw error;
    return data ?? [];
}

export async function updateAppointmentStatus(id: string, status: string, cancellationReason?: string) {
    const sb = await createClient();
    const { data, error } = await sb
        .from("appointments")
        .update({ status, cancellation_reason: cancellationReason ?? null, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) throw error;
    return data;
}

export async function updateAppointment(id: string, updates: Partial<CreateAppointmentInput>) {
    const sb = await createClient();
    const mapped: Record<string, any> = {};
    if (updates.doctorId)        mapped.doctor_id        = updates.doctorId;
    if (updates.appointmentDate) mapped.appointment_date = updates.appointmentDate;
    if (updates.appointmentTime) mapped.appointment_time = updates.appointmentTime;
    if (updates.reason)          mapped.reason           = updates.reason;
    if (updates.department)      mapped.department       = updates.department;
    if (updates.priority)        mapped.priority         = updates.priority;
    if (updates.notes !== undefined) mapped.notes        = updates.notes;
    mapped.updated_at = new Date().toISOString();
    const { data, error } = await sb
        .from("appointments").update(mapped).eq("id", id).select(SELECT).single();
    if (error) throw error;
    return data;
}

export async function deleteAppointment(id: string) {
    const sb = await createClient();
    const { error } = await sb.from("appointments").delete().eq("id", id);
    if (error) throw error;
}