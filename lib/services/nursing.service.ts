"use server";

import { createClient } from "@/utils/supabase/server";
import { createNotification } from "./notification.service";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";


// PostgREST join — requires nursing_actions_patient_id_fkey to exist (see migration)
const SELECT_WITH_PATIENT = `
    *,
    patients!nursing_actions_patient_id_fkey(
        id, name, phone, gender, birth_date, blood_group, allergies, hospital_number
    )
`.trim();

export interface CreateNursingActionInput {
    patientId: string;
    actionType: string;
    description?: string;
    status: string;
    assignedNurse?: string;
    completedBy?: string;
    completionTime?: string;
}

export interface UpdateNursingActionInput {
    status?: string;
    description?: string;
    completedBy?: string;
    completionTime?: string;
}

export async function createNursingAction(input: CreateNursingActionInput){
    await requireStaff([UserRole.Nurse]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .insert([{
            patient_id: input.patientId,
            action_type: input.actionType,
            description: input.description ?? null,
            status: input.status,
            assigned_nurse: input.assignedNurse ?? null,
            completed_by: input.completedBy ?? null,
            completion_time: input.completionTime ?? null,
        }])
        .select()
        .single();

    if (error) { console.error("[nursing] create:", error); throw error; }

    // Notify the assigned nurse, or the nursing team when unassigned.
    await createNotification({
        recipient_id: input.assignedNurse ?? undefined,
        role: input.assignedNurse ? undefined : "Nurse",
        title: "New Nursing Task",
        message: `Nursing task (${input.actionType ?? "care"}) assigned${input.description ? ` — ${input.description}` : ""}.`,
        type: "info",
        link: "/nurse/queue",
    });

    return data;
}

/** Attach staff display names so UIs never have to expose staff IDs. */
async function enrichNursingStaff(rows: any[]): Promise<any[]> {
    if (!rows.length) return rows;
    const supabase = await createClient();
    const staffIds = [...new Set(
        rows.map((r) => r.completed_by ?? r.assigned_nurse).filter(Boolean)
    )];
    if (staffIds.length) {
        const { data: staff } = await supabase
            .from("staffs")
            .select("id, name, role")
            .in("id", staffIds);
        const staffMap = Object.fromEntries((staff ?? []).map((s: any) => [s.id, s]));
        rows.forEach((r) => {
            r.completed_by_name = staffMap[r.completed_by]?.name ?? null;
            r.assigned_nurse_name = staffMap[r.assigned_nurse]?.name ?? null;
        });
    }
    return rows;
}

export async function getNursingActionById(id: string){
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select(SELECT_WITH_PATIENT)
        .eq("id", id)
        .single();

    if (error) { console.error("[nursing] getById:", error); return null; }
    const [row] = await enrichNursingStaff(data ? [data] : []);
    return row ?? null;
}

export async function listNursingActionsByPatient(patientId: string){
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[nursing] listByPatient:", error); return []; }
    return enrichNursingStaff(data ?? []);
}

export async function listPendingNursingActions(){
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select(SELECT_WITH_PATIENT)          // ← includes patient name/phone
        .in("status", ["Pending", "InProgress"])
        .order("created_at", { ascending: true });   // oldest first → FIFO

    if (error) { console.error("[nursing] listPending:", error); return []; }
    return enrichNursingStaff(data ?? []);
}

export async function listCompletedNursingActions(){
    await requireStaff();
    const supabase = await createClient();
    const startOfToday = new Date(`${toHospitalISODate()}T00:00:00+01:00`);
    const { data, error } = await supabase
        .from("nursing_actions")
        .select(SELECT_WITH_PATIENT)
        .eq("status", "Completed")
        .gte("completion_time", startOfToday.toISOString())
        .order("completion_time", { ascending: false });

    if (error) { console.error("[nursing] listCompleted:", error); return []; }
    return enrichNursingStaff(data ?? []);
}

export async function updateNursingAction(id: string, input: UpdateNursingActionInput){
    await requireStaff([UserRole.Nurse]);
    const supabase = await createClient();
    const mapped: Record<string, any> = {};
    if (input.status !== undefined) mapped.status = input.status;
    if (input.description !== undefined) mapped.description = input.description;
    if (input.completedBy !== undefined) mapped.completed_by = input.completedBy;
    if (input.completionTime !== undefined) mapped.completion_time = input.completionTime;

    const { data, error } = await supabase
        .from("nursing_actions")
        .update(mapped)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[nursing] update:", error); throw error; }
    return data;
}