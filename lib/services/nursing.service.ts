"use server";


import { createClient } from "@/utils/supabase/server";

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

export async function createNursingAction(
    input: CreateNursingActionInput
) {
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
    return data;
}

export async function getNursingActionById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[nursing] getById:", error); return null; }
    return data;
}

export async function listNursingActionsByPatient(patientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[nursing] listByPatient:", error); return []; }
    return data;
}

export async function listPendingNursingActions() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select("*")
        .in("status", ["Pending", "InProgress"])
        .order("created_at", { ascending: false });

    if (error) { console.error("[nursing] listPending:", error); return []; }
    return data;
}

export async function updateNursingAction(
    id: string,
    input: UpdateNursingActionInput
) {
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