"use server";

import { createClient } from "@/utils/supabase/server";
import { Prescription, DrugInventoryItem } from "@/types/models";

// ─── Prescriptions ────────────────────────────────────────────────────────────

export interface CreatePrescriptionInput {
    patientId: string;
    pharmacistId?: string;
    drugName: string;
    dosage: string;
    duration?: string;
    price: number;
    notes?: string;
    dispensed?: boolean;
}

export async function createPrescription(
    input: CreatePrescriptionInput
): Promise<Prescription> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .insert([{
            patient_id: input.patientId,
            pharmacist_id: input.pharmacistId ?? null,
            drug_name: input.drugName,
            dosage: input.dosage,
            duration: input.duration ?? null,
            price: input.price,
            notes: input.notes ?? null,
            status: "Active",
            dispensed: input.dispensed ?? false,
            dispensed_at: input.dispensed ? new Date().toISOString() : null,
        }])
        .select()
        .single();

    if (error) { console.error("[pharmacy] createPrescription:", error); throw error; }
    return data as unknown as Prescription;
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[pharmacy] getPrescriptionById:", error); return null; }
    return data as unknown as Prescription;
}

export async function listPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[pharmacy] listByPatient:", error); return []; }
    return data as unknown as Prescription[];
}

export async function listPendingPrescriptions(): Promise<Prescription[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(name, phone, gender)")
        .eq("status", "Active")
        .eq("dispensed", false)
        .order("created_at", { ascending: false });

    if (error) { console.error("[pharmacy] listPending:", error); return []; }
    return data as unknown as Prescription[];
}

export async function updatePrescription(
    id: string,
    updates: Partial<Prescription>
): Promise<Prescription> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[pharmacy] updatePrescription:", error); throw error; }
    return data as unknown as Prescription;
}

// ─── Drug Dispensing ──────────────────────────────────────────────────────────

export async function createDispensingRecord(dispensingData: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_dispensing")
        .insert([dispensingData])
        .select()
        .single();

    if (error) { console.error("[pharmacy] createDispensingRecord:", error); throw error; }
    return data;
}

export async function listDispensingByPatient(patientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_dispensing")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[pharmacy] listDispensingByPatient:", error); return []; }
    return data;
}

// ─── Drug Inventory ───────────────────────────────────────────────────────────

export async function listDrugInventory(): Promise<DrugInventoryItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_inventory")
        .select("*")
        .eq("is_active", true)
        .order("drug_name");

    if (error) { console.error("[pharmacy] listInventory:", error); return []; }
    return data as DrugInventoryItem[];
}

export async function listAllDrugs(): Promise<DrugInventoryItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_inventory")
        .select("*")
        .order("drug_name");

    if (error) { console.error("[pharmacy] listAllDrugs:", error); return []; }
    return data as DrugInventoryItem[];
}

export async function upsertDrug(
    drug: Partial<DrugInventoryItem>,
    id?: string
): Promise<DrugInventoryItem> {
    const supabase = await createClient();
    const { data, error } = id
        ? await supabase.from("drug_inventory").update(drug).eq("id", id).select().single()
        : await supabase.from("drug_inventory").insert([drug]).select().single();

    if (error) { console.error("[pharmacy] upsertDrug:", error); throw error; }
    return data as DrugInventoryItem;
}

export async function deleteDrug(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("drug_inventory").delete().eq("id", id);
    if (error) { console.error("[pharmacy] deleteDrug:", error); throw error; }
}

export async function restockDrug(id: string, addQty: number): Promise<DrugInventoryItem> {
    const supabase = await createClient();
    // Fetch then update (RPC not always available)
    const { data: current } = await supabase
        .from("drug_inventory").select("quantity").eq("id", id).single();

    const { data, error } = await supabase
        .from("drug_inventory")
        .update({ quantity: (current?.quantity ?? 0) + addQty })
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[pharmacy] restock:", error); throw error; }
    return data as DrugInventoryItem;
}

export async function toggleDrugActive(id: string, current: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from("drug_inventory")
        .update({ is_active: !current })
        .eq("id", id);

    if (error) { console.error("[pharmacy] toggleActive:", error); throw error; }
}