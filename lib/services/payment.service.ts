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

/**
 * Confirms a pending payment.
 *
 * FIXED — two issues from the previous version:
 *
 * 1. Patient was unconditionally discharged on ANY single payment
 * confirmation, including mid-treatment payments (e.g. paying for one
 * prescription while still admitted). Now only auto-discharges if the
 * patient's CURRENT status is already "awaiting-payment" (i.e. they were
 * already at the billing/discharge stage) AND no other pending/partial
 * payments remain outstanding for them.
 *
 * 2. The payment `method` selected in the UI (cash/card/transfer) was never
 * persisted — the confirm call only ever took an `id`. Now accepts and
 * saves `method`.
 *
 * Also adds a guard against double-confirmation: the UPDATE only matches
 * rows still in "pending" status, so a second confirm attempt on an
 * already-settled payment (e.g. two staff clicking simultaneously) is a
 * no-op that returns the existing record rather than re-running side effects.
 */
export async function confirmPayment(id: string, method?: string): Promise<Payment> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            ...(method ? { method } : {}),
        })
        .eq("id", id)
        .eq("status", "pending") // guard: only confirm if still pending
        .select()
        .single();

    if (error) {
        // No rows matched — likely already confirmed by someone else.
        // Return the existing record instead of throwing, so a second
        // click (race condition) doesn't surface as an error to the user.
        if (error.code === "PGRST116") {
            const existing = await getPaymentById(id);
            if (existing) return existing;
        }
        console.error("[payment] confirm:", error);
        throw error;
    }

    // ── Conditional discharge ───────────────────────────────────────────────
    if (data?.patient_id) {
        const { data: patient } = await supabase
            .from("patients")
            .select("status")
            .eq("id", data.patient_id)
            .single();

        const { count: outstandingCount } = await supabase
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", data.patient_id)
            .in("status", ["pending", "partial"]);

        const onlyAutoDischargeWhen =
            patient?.status === "awaiting-payment" && (outstandingCount ?? 0) === 0;

        if (onlyAutoDischargeWhen) {
            await supabase
                .from("patients")
                .update({ status: "discharged" })
                .eq("id", data.patient_id);
        }
        // Otherwise: patient status is left untouched. A pharmacy/lab payment
        // confirmed mid-treatment no longer discharges anyone.
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

    const ids = [...new Set(data.map(p => p.patient_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone")
        .in("id", ids);

    const map = Object.fromEntries((patients ?? []).map(p => [p.id, p]));
    return data.map(p => ({ ...p, patients: map[p.patient_id] ?? null })) as unknown as Payment[];
}