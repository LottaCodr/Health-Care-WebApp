"use server";

import { createClient } from "@/utils/supabase/server";
import { Payment } from "@/types/models";

export async function createPayment(
    data: Omit<Payment, "id" | "created_at">
): Promise<Payment> {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("payments")
        .insert([data])
        .select()
        .single();

    if (error) { console.error("[payment] create:", error); throw error; }
    return result as unknown as Payment;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[payment] getById:", error); return null; }
    return data as unknown as Payment;
}

export async function confirmPayment(id: string, method: string): Promise<Payment> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[payment] confirm:", error); throw error; }

    // Discharge patient after payment
    if (data?.patient_id) {
        await supabase
            .from("patients")
            .update({ status: "discharged" })
            .eq("id", data.patient_id);
    }

    return data as unknown as Payment;
}

export async function listPaymentsByPatient(patientId: string): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) { console.error("[payment] listByPatient:", error); return []; }
    return data as unknown as Payment[];
}

export async function listPendingPayments(): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) { console.error("[payment] listPending:", error); return []; }
    if (!data?.length) return [];

    // Hydrate patient names in one query
    const ids = [...new Set(data.map(p => p.patient_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone")
        .in("id", ids);

    const map = Object.fromEntries((patients ?? []).map(p => [p.id, p]));
    return data.map(p => ({ ...p, patients: map[p.patient_id] ?? null })) as unknown as Payment[];
}