"use server";

import supabase from "@/utils/supabase/client";

export type PaymentRecord = {
    patient_id: string;
    amount: number;
    payment_method: "Cash" | "Card" | "Transfer" | "Cheque";
    status: "Pending" | "Completed" | "Failed" | "Refunded";
    description: string;
    processed_by: string; // Staff ID (Front Desk)
    processed_date?: string;
};

/**
 * Create a new payment record
 * Called by Front Desk when a patient pays
 */
export async function createPayment(data: PaymentRecord) {
    const { data: payment, error } = await supabase
        .from("payments")
        .insert({
            ...data,
            processed_date: data.processed_date ?? new Date().toISOString(),
            status: data.status ?? "Completed",
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating payment:", error);
        return { success: false, message: error.message };
    }

    return { success: true, payment };
}

/**
 * Get all payments for a specific patient (history view)
 */
export async function getPaymentsByPatient(patientId: string) {
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId)
        .order("processed_date", { ascending: false });

    if (error) {
        console.error("Error fetching patient payments:", error);
        return [];
    }

    return data ?? [];
}

/**
 * Get all pending payments (billing queue for Front Desk)
 */
export async function getPendingPayments() {
    const { data, error } = await supabase
        .from("payments")
        .select("*, patients(name, status)")
        .eq("status", "Pending")
        .order("processed_date", { ascending: true });

    if (error) {
        console.error("Error fetching pending payments:", error);
        return [];
    }

    return data ?? [];
}

/**
 * Mark a payment as completed
 */
export async function completePayment(paymentId: string, processedBy: string) {
    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "Completed",
            processed_by: processedBy,
            processed_date: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .select()
        .single();

    if (error) {
        console.error("Error completing payment:", error);
        return { success: false, message: error.message };
    }

    return { success: true, payment: data };
}

/**
 * Get total revenue summary (for admin/doctor analytics)
 */
export async function getPaymentSummary() {
    const { data, error } = await supabase
        .from("payments")
        .select("amount, status, payment_method");

    if (error) {
        console.error("Error fetching payment summary:", error);
        return { total: 0, completed: 0, pending: 0 };
    }

    const completed = data
        ?.filter((p) => p.status === "Completed")
        .reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

    const pending = data
        ?.filter((p) => p.status === "Pending")
        .reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0;

    return {
        total: completed + pending,
        completed,
        pending,
        count: data?.length ?? 0,
    };
}
