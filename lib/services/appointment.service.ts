"use server";

import { createClient } from "@/utils/supabase/server";
import { normalizeUserRole } from "@/lib/roles";
import { UserRole } from "@/types/models";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";

// ─── Supabase SELECT fragment ─────────────────────────────────────────────────
// patient_id is now nullable (external/walk-in patients have no row in patients).
// Supabase automatically does a LEFT JOIN for nullable FKs so this is safe.

const SELECT = `
    *,
    patients!appointments_patient_id_fkey(id, name, phone, gender, birth_date),
    staffs!appointments_doctor_id_fkey(id, name, role)
`.trim();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateAppointmentInput {
    // Patient — one of these two must be supplied
    patientId?:           string | null;   // set when patient exists in DB
    patientNameOverride?: string | null;   // set when patient is a walk-in / not registered

    scheduledBy?:         string; // legacy client field; server derives this from auth
    doctorId?:            string | null;
    appointmentDate:      string;
    appointmentTime:      string;
    reason:               string;
    department?:          string;
    priority?:            string;
    notes?:               string;
}

const APPOINTMENT_STATUSES = new Set([
    "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show",
]);
const APPOINTMENT_PRIORITIES = new Set(["routine", "urgent", "emergency"]);

function validateDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
}

function validateTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
}

function validateAppointmentInput(input: Partial<CreateAppointmentInput>, partial = false) {
    if (!partial && !input.patientId && !input.patientNameOverride?.trim()) {
        throw new Error("Select a registered patient or enter a walk-in patient name.");
    }
    if (input.patientNameOverride !== undefined && input.patientNameOverride !== null && !input.patientNameOverride.trim()) {
        throw new Error("Walk-in patient name cannot be empty.");
    }
    if ((!partial || input.appointmentDate !== undefined) && !validateDate(input.appointmentDate ?? "")) {
        throw new Error("Enter a valid appointment date.");
    }
    if (input.appointmentDate && input.appointmentDate < toHospitalISODate()) {
        throw new Error("Appointments cannot be scheduled in the past.");
    }
    if ((!partial || input.appointmentTime !== undefined) && !validateTime(input.appointmentTime ?? "")) {
        throw new Error("Enter a valid appointment time.");
    }
    if ((!partial || input.reason !== undefined) && !input.reason?.trim()) {
        throw new Error("Appointment reason is required.");
    }
    if (input.priority && !APPOINTMENT_PRIORITIES.has(input.priority)) {
        throw new Error("Invalid appointment priority.");
    }
}

async function requireAppointmentManager(sb: any) {
    const { data: authData, error: authError } = await sb.auth.getUser();
    if (authError || !authData?.user) throw new Error("You must be signed in to manage appointments.");

    const { data: staff, error: staffError } = await sb
        .from("staffs")
        .select("role")
        .eq("id", authData.user.id)
        .single();
    const role = normalizeUserRole(staff?.role);
    if (staffError || (role !== UserRole.FrontDesk && role !== UserRole.Admin)) {
        throw new Error("Only Front Desk or Admin staff can manage appointments.");
    }
    return authData.user.id as string;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createAppointment(input: CreateAppointmentInput) {
    const sb = await createClient();
    const managerId = await requireAppointmentManager(sb);
    validateAppointmentInput(input);

    const { data, error } = await sb
        .from("appointments")
        .insert([{
            patient_id:             input.patientId            ?? null,
            patient_name_override:  input.patientNameOverride  ?? null,
            scheduled_by:           managerId,
            doctor_id:              input.doctorId             ?? null,
            appointment_date:       input.appointmentDate,
            appointment_time:       input.appointmentTime,
            reason:                 input.reason,
            department:             input.department           ?? "Doctor",
            priority:               input.priority             ?? "routine",
            notes:                  input.notes                ?? null,
            status:                 "scheduled",
        }])
        .select(SELECT)
        .single();

    if (error) throw error;
    return data;
}

export async function updateAppointment(
    id:      string,
    updates: Partial<CreateAppointmentInput>,
) {
    const sb = await createClient();
    await requireAppointmentManager(sb);
    validateAppointmentInput(updates, true);

    const mapped: Record<string, any> = { updated_at: new Date().toISOString() };

    if (updates.patientId           !== undefined) mapped.patient_id             = updates.patientId           ?? null;
    if (updates.patientNameOverride !== undefined) mapped.patient_name_override  = updates.patientNameOverride ?? null;
    if (updates.doctorId            !== undefined) mapped.doctor_id              = updates.doctorId            ?? null;
    if (updates.appointmentDate)                   mapped.appointment_date        = updates.appointmentDate;
    if (updates.appointmentTime)                   mapped.appointment_time        = updates.appointmentTime;
    if (updates.reason)                            mapped.reason                  = updates.reason;
    if (updates.department)                        mapped.department              = updates.department;
    if (updates.priority)                          mapped.priority                = updates.priority;
    if (updates.notes !== undefined)               mapped.notes                   = updates.notes;

    const { data, error } = await sb
        .from("appointments")
        .update(mapped)
        .eq("id", id)
        .select(SELECT)
        .single();

    if (error) throw error;
    return data;
}

export async function updateAppointmentStatus(
    id:                  string,
    status:              string,
    cancellationReason?: string,
) {
    const sb = await createClient();
    await requireAppointmentManager(sb);
    if (!APPOINTMENT_STATUSES.has(status)) throw new Error("Invalid appointment status.");

    const { data, error } = await sb
        .from("appointments")
        .update({
            status,
            cancellation_reason: cancellationReason ?? null,
            updated_at:          new Date().toISOString(),
        })
        .eq("id", id)
        .select(SELECT)
        .single();

    if (error) throw error;

    // Checking in a registered patient must also place them in the doctor's
    // consultation queue. Walk-in appointments have no linked patient row.
    const updatedAppointment = data as any;
    if (status === "in_progress" && updatedAppointment?.patient_id) {
        const { error: patientError } = await sb
            .from("patients")
            .update({ status: "awaiting-consultation", updated_at: new Date().toISOString() })
            .eq("id", updatedAppointment.patient_id);
        if (patientError) throw new Error("Appointment checked in, but the patient queue could not be updated.");
    }

    return data;
}

export async function deleteAppointment(id: string) {
    const sb = await createClient();
    await requireAppointmentManager(sb);
    const { error } = await sb.from("appointments").delete().eq("id", id);
    if (error) throw error;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

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
    const sb    = await createClient();
    const today = toHospitalISODate();

    const { data, error } = await sb
        .from("appointments")
        .select(SELECT)
        .gte("appointment_date", today)
        .not("status", "in", "(cancelled,completed,no_show)")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

    if (error) throw error;
    return data ?? [];
}