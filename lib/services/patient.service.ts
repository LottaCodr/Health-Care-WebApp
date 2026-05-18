"use server";

import { createClient } from "@/utils/supabase/server";
import { Patient, PatientStatus } from "@/types/models";

export async function createPatient(
    data: Omit<Patient, "id" | "created_at" | "updated_at">
): Promise<Patient> {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("patients")
        .insert([data])
        .select()
        .single();

    if (error) { console.error("[patient] createPatient:", error); throw error; }
    return result as unknown as Patient;
}

export async function getPatientById(id: string): Promise<Patient | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[patient] getPatientById:", error); return null; }
    return data as unknown as Patient;
}

export async function updatePatient(
    id: string,
    updates: Partial<Patient>
): Promise<Patient> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[patient] updatePatient:", error); throw error; }
    return data as unknown as Patient;
}

export async function updatePatientStatus(
    id: string,
    status: PatientStatus
): Promise<Patient> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[patient] updatePatientStatus:", error); throw error; }
    return data  as Patient;
}

export async function listPatientsByStatus(
    status: PatientStatus
): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

    if (error) { console.error("[patient] listPatientsByStatus:", error); return []; }
    return data  as Patient[];
}

export async function searchPatients(query: string): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(50);

    if (error) { console.error("[patient] searchPatients:", error); return []; }
    return data as Patient[];
}

export async function getAllPatients(
    page = 0,
    limit = 100
): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

    if (error) { console.error("[patient] getAllPatients:", error); return []; }
    return data as Patient[];
}