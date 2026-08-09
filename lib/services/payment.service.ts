"use server";

import { createClient } from "@/utils/supabase/server";
import { Payment } from "@/types/models";

export type PaymentStatus = "pending" | "partial" | "paid" | "waived" | "refunded" | "failed";
export type PaymentMethod = "cash" | "card" | "transfer" | "cheque";
export type PaymentCategory =
    | "consultation"
    | "lab"
    | "radiology"
    | "pharmacy"
    | "procedure"
    | "admission"
    | "other";

export interface CreatePaymentInput {
    patient_id: string;
    amount: number;
    description: string;
    category?: PaymentCategory;
    status?: PaymentStatus;
    method?: PaymentMethod;
    processed_by?: string;
    invoice_no?: string;
    notes?: string;
}

export interface ConfirmPaymentInput {
    id: string;
    method?: PaymentMethod | string;
    cashierId?: string;
    amountPaid?: number;
}

const OUTSTANDING_STATUSES = new Set(["pending", "partial"]);
const FINAL_STATUSES = new Set(["paid", "waived", "refunded"]);

function normalizeStatus(status?: string | null): PaymentStatus {
    const value = String(status ?? "").toLowerCase();
    if (value === "completed") return "paid";
    if (value === "failed") return "failed";
    if (value === "refunded") return "refunded";
    if (value === "waived") return "waived";
    if (value === "partial") return "partial";
    if (value === "paid") return "paid";
    return "pending";
}

function normalizeMethod(method?: string | null): PaymentMethod | undefined {
    const value = String(method ?? "").toLowerCase();
    if (value.includes("card")) return "card";
    if (value.includes("transfer")) return "transfer";
    if (value.includes("cheque") || value.includes("check")) return "cheque";
    if (value.includes("cash")) return "cash";
    return undefined;
}

function methodLabel(method?: string | null): string | undefined {
    const normalized = normalizeMethod(method);
    if (!normalized) return undefined;
    return normalized[0].toUpperCase() + normalized.slice(1);
}

function amountToKobo(row: any): number {
    if (typeof row?.amount_kobo === "number") return row.amount_kobo;
    if (typeof row?.amount === "number") return Math.round(row.amount * 100);
    return 0;
}

function paidToKobo(row: any): number {
    if (typeof row?.amount_paid_kobo === "number") return row.amount_paid_kobo;
    return FINAL_STATUSES.has(normalizeStatus(row?.status)) ? amountToKobo(row) : 0;
}

function normalizePayment(row: any): Payment {
    const status = normalizeStatus(row?.status);
    const method = normalizeMethod(row?.method ?? row?.payment_method ?? row?.paymentMethod);
    const amountKobo = amountToKobo(row);
    const paidKobo = paidToKobo(row);

    return {
        ...row,
        raw_status: row?.status,
        patientId: row?.patientId ?? row?.patient_id,
        patient_id: row?.patient_id ?? row?.patientId,
        amount: typeof row?.amount === "number" ? row.amount : amountKobo / 100,
        amount_kobo: amountKobo,
        amount_paid_kobo: paidKobo,
        paymentMethod: row?.paymentMethod ?? methodLabel(method),
        payment_method: row?.payment_method ?? methodLabel(method),
        method: method ?? row?.method,
        status,
        processedBy: row?.processedBy ?? row?.processed_by,
        processed_by: row?.processed_by ?? row?.processedBy,
        processedDate: row?.processedDate ?? row?.processed_date ?? row?.paid_at,
        processed_date: row?.processed_date ?? row?.processedDate ?? row?.paid_at,
    } as Payment;
}

function isOutstanding(row: any): boolean {
    const status = normalizeStatus(row?.status);
    if (!OUTSTANDING_STATUSES.has(status)) return false;
    return amountToKobo(row) - paidToKobo(row) > 0;
}

async function tryInsertPayment(supabase: Awaited<ReturnType<typeof createClient>>, candidates: any[]) {
    let lastError: any = null;

    for (const candidate of candidates) {
        const { data, error } = await supabase
            .from("payments")
            .insert([candidate])
            .select()
            .single();

        if (!error) return data;
        lastError = error;
    }

    throw lastError;
}

async function tryUpdatePayment(
    supabase: Awaited<ReturnType<typeof createClient>>,
    id: string,
    currentStatus: string,
    candidates: any[]
) {
    let lastError: any = null;

    for (const candidate of candidates) {
        const { data, error } = await supabase
            .from("payments")
            .update(candidate)
            .eq("id", id)
            .eq("status", currentStatus)
            .select()
            .single();

        if (!error) return data;
        lastError = error;

        // PGRST116 = no rows changed. This happens when the status column
        // no longer matches `currentStatus` (e.g. the row was already
        // settled by another request). Fetch the live row so the caller
        // gets the up-to-date state instead of a stale snapshot.
        if (error.code === "PGRST116") {
            const existing = await getPaymentById(id);
            if (existing) {
                console.warn(
                    `[payment] tryUpdatePayment: no row updated for id=${id} ` +
                    `(status filter="${currentStatus}" — row may have been modified concurrently). ` +
                    `Returning live record.`
                );
                return existing;
            }
        }
    }

    throw lastError;
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
    if (!input.patient_id) throw new Error("patient_id is required to create a payment.");
    if (!input.description?.trim()) throw new Error("description is required to create a payment.");
    if (!Number.isFinite(input.amount) || input.amount < 0) {
        throw new Error("amount must be a valid non-negative number.");
    }

    const supabase = await createClient();
    const status = input.status ?? "pending";
    const method = normalizeMethod(input.method);
    const amountKobo = Math.round(input.amount * 100);
    const now = new Date().toISOString();
    const invoiceNo = input.invoice_no ?? `INV-${Date.now().toString(36).toUpperCase()}`;

    const fullPayload = {
        patient_id: input.patient_id,
        amount: input.amount,
        amount_kobo: amountKobo,
        amount_paid_kobo: status === "paid" ? amountKobo : 0,
        description: input.description,
        category: input.category ?? "other",
        status,
        method,
        payment_method: methodLabel(method),
        processed_by: input.processed_by ?? null,
        processed_date: status === "paid" ? now : null,
        paid_at: status === "paid" ? now : null,
        invoice_no: invoiceNo,
        notes: input.notes ?? null,
    };

    const compatiblePayload = {
        patient_id: input.patient_id,
        amount: input.amount,
        description: input.description,
        status,
        method,
        processed_by: input.processed_by ?? null,
    };

    const minimalPayload = {
        patient_id: input.patient_id,
        amount: input.amount,
        description: input.description,
        status,
    };

    try {
        const data = await tryInsertPayment(supabase, [fullPayload, compatiblePayload, minimalPayload]);
        return normalizePayment(data);
    } catch (error) {
        console.error("[payment] create:", error);
        throw error;
    }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error("[payment] getById:", error);
        return null;
    }

    return data ? normalizePayment(data) : null;
}

export interface UpdatePendingBillInput {
    id: string;
    description?: string;
    amount?: number;
    category?: PaymentCategory;
    notes?: string;
}

/**
 * Edit an outstanding (pending / partially paid) bill *before* it is settled.
 * Front desk uses this to correct prices, descriptions or categories while the
 * invoice is still open, so the settled amount always reflects the latest edit.
 */
export async function updatePendingBill(input: UpdatePendingBillInput): Promise<Payment> {
    if (!input.id) throw new Error("id is required to update a bill.");

    const supabase = await createClient();
    const existing = await getPaymentById(input.id);
    if (!existing) throw new Error("Bill was not found.");
    if (!isOutstanding(existing)) {
        throw new Error("Only outstanding bills can be edited. This bill is already settled.");
    }

    const now = new Date().toISOString();
    const nextDescription =
        typeof input.description === "string" && input.description.trim()
            ? input.description.trim()
            : existing.description;
    const nextCategory = input.category ?? (existing.category as PaymentCategory | undefined) ?? "other";

    let nextAmount = existing.amount;
    if (typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount >= 0) {
        nextAmount = input.amount;
    }

    const paidKobo = paidToKobo(existing);
    const nextAmountKobo = Math.max(0, Math.round(nextAmount * 100));
    // Guard: never drop the bill below what has already been paid toward it.
    const effectiveKobo = Math.max(nextAmountKobo, paidKobo);
    nextAmount = effectiveKobo / 100;

    const fullPayload: Record<string, any> = {
        description: nextDescription,
        category: nextCategory,
        amount: nextAmount,
        amount_kobo: effectiveKobo,
        updated_at: now,
        notes: input.notes !== undefined ? input.notes : existing.notes ?? null,
    };

    const compatiblePayload: Record<string, any> = {
        description: nextDescription,
        category: nextCategory,
        amount: nextAmount,
        updated_at: now,
    };

    const minimalPayload: Record<string, any> = {
        description: nextDescription,
        amount: nextAmount,
    };

    try {
        return normalizePayment(
            await tryUpdatePayment(supabase, input.id, String((existing as any).raw_status ?? existing.status), [
                fullPayload,
                compatiblePayload,
                minimalPayload,
            ])
        );
    } catch (error) {
        console.error("[payment] updatePendingBill:", error);
        throw error;
    }
}

export async function confirmPayment(inputOrId: ConfirmPaymentInput | string, methodArg?: string): Promise<Payment> {
    const input: ConfirmPaymentInput =
        typeof inputOrId === "string" ? { id: inputOrId, method: methodArg } : inputOrId;

    const supabase = await createClient();
    const existing = await getPaymentById(input.id);

    if (!existing) throw new Error("Payment record was not found.");
    if (!isOutstanding(existing)) {
        throw new Error(
            `This payment cannot be settled — its current status is "${existing.status ?? "unknown"}". ` +
            `It may already be paid, waived, or fully refunded.`
        );
    }

    const now = new Date().toISOString();
    const method = normalizeMethod(input.method ?? existing.method ?? existing.payment_method) ?? "cash";
    const totalKobo = amountToKobo(existing);
    const paidKobo = paidToKobo(existing);
    // Handle front-desk price edit: if amountPaid is provided and differs from current total, treat it as a price correction
    let effectiveTotalKobo = totalKobo;
    let isPriceEdit = false;
    if (typeof input.amountPaid === "number" && Number.isFinite(input.amountPaid) && input.amountPaid >= 0) {
        // Never drop the bill total below what has already been collected.
        const editedKobo = Math.max(paidKobo, Math.max(0, Math.round(input.amountPaid * 100)));
        if (editedKobo !== totalKobo) {
            effectiveTotalKobo = editedKobo;
            isPriceEdit = true;
        }
    }
    // If price was edited, the edited amount becomes the new total and is fully paid on confirm
    // Otherwise, treat amountPaid as incoming payment toward existing total
    const incomingKobo = isPriceEdit
        ? effectiveTotalKobo - paidKobo
        : typeof input.amountPaid === "number"
            ? Math.max(0, Math.round(input.amountPaid * 100))
            : totalKobo - paidKobo;
    const nextPaidKobo = isPriceEdit
        ? effectiveTotalKobo
        : Math.min(effectiveTotalKobo, paidKobo + incomingKobo);
    const nextStatus: PaymentStatus = nextPaidKobo >= effectiveTotalKobo ? "paid" : "partial";
    const editedAmount = effectiveTotalKobo / 100;

    const fullPayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        processed_date: now,
        processed_by: input.cashierId ?? existing.processed_by ?? null,
        method,
        payment_method: methodLabel(method),
        amount_paid_kobo: nextPaidKobo,
    };
    // Include corrected amount if price was edited
    if (isPriceEdit) {
        fullPayload.amount = editedAmount;
        fullPayload.amount_kobo = effectiveTotalKobo;
    }

    const compatiblePayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        processed_date: now,
        processed_by: input.cashierId ?? existing.processed_by ?? null,
        method,
    };
    if (isPriceEdit) {
        compatiblePayload.amount = editedAmount;
    }

    const minimalPayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        method,
    };
    if (isPriceEdit) {
        minimalPayload.amount = editedAmount;
    }

    try {
        const updated = normalizePayment(
            await tryUpdatePayment(supabase, input.id, String((existing as any).raw_status ?? existing.status), [
                fullPayload,
                compatiblePayload,
                minimalPayload,
            ])
        );

        await dischargeIfBillingCleared(supabase, updated);
        return updated;
    } catch (error) {
        console.error("[payment] confirm:", error);
        throw error;
    }
}

async function dischargeIfBillingCleared(
    supabase: Awaited<ReturnType<typeof createClient>>,
    payment: Payment
) {
    if (!payment.patient_id) return;

    const { data: patient } = await supabase
        .from("patients")
        .select("status")
        .eq("id", payment.patient_id)
        .single();

    if (patient?.status !== "awaiting-payment") return;

    const { data: rows, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", payment.patient_id);

    if (error) {
        console.error("[payment] outstanding check:", error);
        return;
    }

    const hasOutstanding = (rows ?? []).some(isOutstanding);
    if (hasOutstanding) return;

    await supabase
        .from("patients")
        .update({ status: "discharged", updated_at: new Date().toISOString() })
        .eq("id", payment.patient_id);
}

export async function listPaymentsByPatient(patientId: string): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[payment] listByPatient:", error);
        return [];
    }

    return (data ?? []).map(normalizePayment);
}

export async function listPendingPayments(): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[payment] listPending:", error);
        return [];
    }

    const outstanding = (data ?? []).filter(isOutstanding);
    if (!outstanding.length) return [];

    const ids = [...new Set(outstanding.map((payment: any) => payment.patient_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone")
        .in("id", ids);

    const patientMap = Object.fromEntries((patients ?? []).map((patient: any) => [patient.id, patient]));

    return outstanding.map((payment: any) =>
        normalizePayment({ ...payment, patients: patientMap[payment.patient_id] ?? null })
    );
}
