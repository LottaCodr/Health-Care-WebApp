"use server";

import { createClient } from "@/utils/supabase/server";
import { Prescription, DrugInventoryItem } from "@/types/models";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";
import { createPayment } from "./payment.service";
import { createNotification } from "./notification.service";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";


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
    await requireStaff([UserRole.Doctor]);
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

    // Notify pharmacy so the queue is picked up immediately.
    await createNotification({
        role: "Pharmacist",
        title: "New Prescription",
        message: `Prescription for ${input.drugName} (${input.dosage}${input.duration ? ` — ${input.duration}` : ""}) is ready for dispensing.`,
        type: "info",
        link: "/pharmacist/dispense",
    });

    // ── Billing: when a prescription is dispensed at creation time, create a
    // pending payment so the front-desk billing queue picks it up immediately.
    // (PrescriptionDetails.tsx submits `dispensed: true` inline.)
    if (
        input.dispensed === true &&
        input.patientId &&
        typeof input.price === "number" &&
        input.price > 0
    ) {
        try {
            await createPayment({
                patient_id: input.patientId,
                amount: input.price,
                description: `Pharmacy: ${input.drugName}`,
                category: "pharmacy",
                status: "pending",
                processed_by: input.pharmacistId ?? undefined,
                notes: input.notes ?? undefined,
            });
        } catch (payErr) {
            console.error("[pharmacy] auto-create payment on dispense failed:", payErr);
        }
    }

    return data as unknown as Prescription;
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
    await requireStaff();
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
    await requireStaff();
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
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(name, phone, gender, hospital_number)")
        .eq("status", "Active")
        .eq("dispensed", false)
        .order("created_at", { ascending: false });

    if (error) { console.error("[pharmacy] listPending:", error); return []; }
    return data as unknown as Prescription[];
}

export async function listCompletedPrescriptionsToday(): Promise<Prescription[]> {
    await requireStaff();
    const supabase = await createClient();
    const startOfToday = new Date(`${toHospitalISODate()}T00:00:00+01:00`);

    const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(name, phone, gender, hospital_number)")
        .eq("dispensed", true)
        .gte("dispensed_at", startOfToday.toISOString())
        .order("dispensed_at", { ascending: false });

    if (error) { console.error("[pharmacy] listCompletedToday:", error); return []; }
    return data as unknown as Prescription[];
}

export async function updatePrescription(
    id: string,
    updates: Partial<Prescription>
): Promise<Prescription> {
    // Dispensing (marking dispensed) is done by the pharmacist; doctors edit
    // their own prescriptions. Both roles are allowed.
    await requireStaff([UserRole.Doctor, UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[pharmacy] updatePrescription:", error); throw error; }

    // ── Billing: create a pending payment when drugs are dispensed ─────────────
    // This ensures the front-desk billing queue (PaymentSuite pending payments)
    // reflects pharmacy charges as soon as the pharmacist dispenses.
    if (
        updates.dispensed === true &&
        data?.patient_id &&
        typeof data.price === "number" &&
        data.price > 0
    ) {
        try {
            await createPayment({
                patient_id: data.patient_id,
                amount: data.price,
                description: `Pharmacy: ${data.drug_name}`,
                category: "pharmacy",
                status: "pending",
                processed_by: updates.pharmacist_id ?? data.pharmacist_id ?? undefined,
            });
        } catch (payErr) {
            console.error("[pharmacy] auto-create payment on dispense failed:", payErr);
        }
    }

    // Auto-route patient to front desk when dispensed
    if (updates.dispensed === true && data?.patient_id) {
         await supabase.from("patients").update({ status: "awaiting-payment" }).eq("id", data.patient_id);
    }

    return data as unknown as Prescription;
}

// ─── Drug Dispensing ──────────────────────────────────────────────────────────

export async function createDispensingRecord(dispensingData: any) {
    await requireStaff([UserRole.Pharmacist]);
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
    await requireStaff();
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
    await requireStaff();
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
    await requireStaff();
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
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { data, error } = id
        ? await supabase.from("drug_inventory").update(drug).eq("id", id).select().single()
        : await supabase.from("drug_inventory").insert([drug]).select().single();

    if (error) { console.error("[pharmacy] upsertDrug:", error); throw error; }
    return data as DrugInventoryItem;
}

export async function deleteDrug(id: string): Promise<void> {
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { error } = await supabase.from("drug_inventory").delete().eq("id", id);
    if (error) { console.error("[pharmacy] deleteDrug:", error); throw error; }
}

export async function restockDrug(id: string, addQty: number): Promise<DrugInventoryItem> {
    await requireStaff([UserRole.Pharmacist]);
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
    await requireStaff([UserRole.Pharmacist]);
    const supabase = await createClient();
    const { error } = await supabase
        .from("drug_inventory")
        .update({ is_active: !current })
        .eq("id", id);

    if (error) { console.error("[pharmacy] toggleActive:", error); throw error; }
}