"use server";

import { createClient } from "@/utils/supabase/server";
import { Payment, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import {
    computeDiscountKobo,
    resolvePayerFromPatient,
    PAYER_CONFIG,
    type PaymentType,
    type PayerType,
} from "@/lib/utils/billing";

export type PaymentStatus = "pending" | "partial" | "paid" | "waived" | "refunded" | "failed";
export type PaymentMethod = "cash" | "card" | "transfer" | "cheque" | "hmo" | "company";
export type PaymentCategory =
    | "consultation"
    | "lab"
    | "radiology"
    | "pharmacy"
    | "procedure"
    | "admission"
    | "deposit"
    | "other";

export interface CreatePaymentInput {
    patient_id: string;
    amount: number;
    description: string;
    category?: PaymentCategory;
    status?: PaymentStatus;
    method?: PaymentMethod | string;
    processed_by?: string;
    invoice_no?: string;
    notes?: string;
    payment_type?: PaymentType;
    payer?: PayerType | string;
    payer_reference?: string;
    payer_code?: string;
}

export interface ConfirmPaymentInput {
    id: string;
    method?: PaymentMethod | string;
    cashierId?: string;
    /** Naira collected now. Ignored for "full" (computed); required for "partial"/"deposit". */
    amountPaid?: number;
    /**
     * full | partial | deposit.
     * Defaults to "partial" when amountPaid does not cover the balance, else "full".
     */
    paymentType?: PaymentType;
    /** Percentage discount (0–100) applied to the bill total. */
    discountPercent?: number;
    /** Flat discount in Naira. Can be combined with discountPercent. */
    discountAmount?: number;
    /** Explicit price correction — new bill total (clamped to never drop below what's paid). */
    correctedAmount?: number;
    /** private | hmo | company — when omitted it is auto-identified from registration. */
    payer?: PayerType | string;
    payerReference?: string;
    /** HMO authorization / company reference code. */
    payerCode?: string;
    /** Apply the patient's existing deposit credit toward this bill before collecting. */
    useDepositCredit?: boolean;
    notes?: string;
}

const OUTSTANDING_STATUSES = new Set(["pending", "partial"]);
const FINAL_STATUSES = new Set(["paid", "waived", "refunded"]);

type Sb = Awaited<ReturnType<typeof createClient>>;

// ─── Normalizers ──────────────────────────────────────────────────────────────

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
    if (value.includes("hmo")) return "hmo";
    if (value.includes("company") || value.includes("corporate")) return "company";
    if (value.includes("card")) return "card";
    if (value.includes("transfer")) return "transfer";
    if (value.includes("cheque") || value.includes("check")) return "cheque";
    if (value.includes("cash")) return "cash";
    return undefined;
}

function methodLabel(method?: string | null): string | undefined {
    const normalized = normalizeMethod(method);
    if (!normalized) return undefined;
    if (normalized === "hmo") return "HMO";
    if (normalized === "company") return "Company";
    return normalized[0].toUpperCase() + normalized.slice(1);
}

function normalizePayer(payer?: string | null): PayerType | undefined {
    const value = String(payer ?? "").toLowerCase();
    if (value.includes("hmo")) return "hmo";
    if (value.includes("company") || value.includes("corporate")) return "company";
    if (value.includes("private") || value.includes("self") || value.includes("cash")) return "private";
    return undefined;
}

function normalizePaymentType(type?: string | null): PaymentType | undefined {
    const value = String(type ?? "").toLowerCase();
    if (value === "partial" || value === "part") return "partial";
    if (value === "deposit" || value === "advance") return "deposit";
    if (value === "full" || value === "paid") return "full";
    return undefined;
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

function appliedToKobo(row: any): number {
    return typeof row?.applied_kobo === "number" ? row.applied_kobo : 0;
}

function normalizePayment(row: any): Payment {
    const status = normalizeStatus(row?.status);
    const method = normalizeMethod(row?.method ?? row?.payment_method ?? row?.paymentMethod);
    const amountKobo = amountToKobo(row);
    const paidKobo = paidToKobo(row);
    const payer = normalizePayer(row?.payer);

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
        payment_type: normalizePaymentType(row?.payment_type ?? row?.paymentType),
        paymentType: normalizePaymentType(row?.payment_type ?? row?.paymentType),
        discount_kobo: typeof row?.discount_kobo === "number" ? row.discount_kobo : 0,
        discount_percent: typeof row?.discount_percent === "number" ? row.discount_percent : null,
        discount_amount_kobo:
            typeof row?.discount_amount_kobo === "number" ? row.discount_amount_kobo : null,
        payer: payer ?? row?.payer ?? null,
        payer_reference: row?.payer_reference ?? null,
        payer_code: row?.payer_code ?? null,
        applied_kobo: appliedToKobo(row),
        processedBy: row?.processedBy ?? row?.processed_by,
        processed_by: row?.processed_by ?? row?.processedBy,
        processedDate: row?.processedDate ?? row?.processed_date ?? row?.paid_at,
        processed_date: row?.processed_date ?? row?.processedDate ?? row?.paid_at,
    } as Payment;
}

function isDepositRow(row: any): boolean {
    const category = String(row?.category ?? "").toLowerCase();
    const type = String(row?.payment_type ?? "").toLowerCase();
    return category === "deposit" || type === "deposit" || type === "advance";
}

function isOutstanding(row: any): boolean {
    if (isDepositRow(row)) return false;
    const status = normalizeStatus(row?.status);
    if (!OUTSTANDING_STATUSES.has(status)) return false;
    return amountToKobo(row) - paidToKobo(row) > 0;
}

/**
 * Open bills — pending or partially paid, regardless of balance. Superset of
 * `isOutstanding`: also covers zero-amount bills (e.g. lab tests auto-billed
 * at ₦0 before the lab tech sets a price). Sweeping an open zero-amount bill
 * closes it as paid at ₦0 instead of leaving it open forever.
 */
function isOpenBill(row: any): boolean {
    if (isDepositRow(row)) return false;
    return OUTSTANDING_STATUSES.has(normalizeStatus(row?.status));
}

function outstandingKobo(row: any): number {
    return Math.max(0, amountToKobo(row) - paidToKobo(row));
}

// ─── Defensive insert / update (schema differences tolerated) ────────────────

async function tryInsertPayment(supabase: Sb, candidates: any[]) {
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
    supabase: Sb,
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

        // PGRST116 = no rows changed. Two very different causes:
        //
        // 1. Concurrent modification — another cashier settled the bill a
        //    moment ago, so the status guard no longer matches. The live
        //    record reflects the newer state and is safe to return.
        // 2. The write did not APPLY at all (e.g. an RLS policy quietly
        //    filtered the update — PostgREST reports 0 changed rows, no
        //    error). If the row is still in exactly the state we targeted,
        //    returning it would fake success: the UI toasts "updated" and
        //    then shows the same stale data forever. That must fail loudly.
        if (error.code === "PGRST116") {
            const existing = await getPaymentById(id);
            if (existing) {
                const liveStatus = String((existing as any).raw_status ?? existing.status);
                if (normalizeStatus(liveStatus) === normalizeStatus(currentStatus)) {
                    console.error(
                        `[payment] tryUpdatePayment: write did not apply for id=${id} ` +
                        `(status filter="${currentStatus}"). The row is unchanged — ` +
                        `a database policy (RLS) or schema is blocking updates to \`payments\`. ` +
                        `Apply supabase/migrations/20260829_fix_staff_role_matching_casing.sql.`
                    );
                    throw new Error(
                        "The bill could not be saved — the database rejected the write " +
                        "(row-level security). Ask an admin to apply the staff-role RLS fix " +
                        "migration (20260829_fix_staff_role_matching_casing.sql), then retry."
                    );
                }
                console.warn(
                    `[payment] tryUpdatePayment: no row updated for id=${id} ` +
                    `(status filter="${currentStatus}" — row was modified concurrently ` +
                    `(now "${liveStatus}")). Returning live record.`
                );
                return existing;
            }
        }
    }

    throw lastError;
}

// ─── Payer auto-identification ────────────────────────────────────────────────

/**
 * Resolve how a patient pays (HMO / Company / Private) from the flags captured
 * at registration. This is the single source of truth used by the billing UI
 * and every settlement path, so the payer is never guessed by hand.
 */
export async function getPatientPayer(patientId: string) {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("hmo, hmo_name, policy_number, company, company_name, private_client")
        .eq("id", patientId)
        .maybeSingle();

    if (error || !data) {
        console.warn("[payment] getPatientPayer: patient not found or fetch failed:", error?.message);
        return resolvePayerFromPatient(null);
    }

    return resolvePayerFromPatient(data);
}

// ─── Create / read / edit ─────────────────────────────────────────────────────

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
    // Bills may be auto-created by doctors (pharmacy dispense / lab orders) in
    // addition to front desk. Only Front Desk may set a payment to "paid" —
    // auto-generated bills are always "pending" until the desk confirms them.
    const actor = await requireStaff([
        UserRole.FrontDesk,
        UserRole.Doctor,
        UserRole.Pharmacist,
        UserRole.LabTechnician,
    ]);

    if (!input.patient_id) throw new Error("patient_id is required to create a payment.");
    if (!input.description?.trim()) throw new Error("description is required to create a payment.");
    if (!Number.isFinite(input.amount) || input.amount < 0) {
        throw new Error("amount must be a valid non-negative number.");
    }

    const supabase = await createClient();
    // The person who recorded the bill is the signed-in staff member — never
    // a value supplied by the caller.
    const processedBy = actor.userId;
    // Only Front Desk can book money as received at creation time.
    const status =
        actor.role === UserRole.FrontDesk
            ? (input.status ?? "pending")
            : "pending";
    const method = normalizeMethod(input.method);
    const amountKobo = Math.round(input.amount * 100);
    const now = new Date().toISOString();
    const invoiceNo =
        input.invoice_no ??
        (String(input.category ?? "").toLowerCase() === "deposit"
            ? `DEP-${Date.now().toString(36).toUpperCase()}`
            : `INV-${Date.now().toString(36).toUpperCase()}`);

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
        payment_type: input.payment_type ?? null,
        payer: input.payer ?? null,
        payer_reference: input.payer_reference ?? null,
        payer_code: input.payer_code ?? null,
        processed_by: processedBy,
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
        processed_by: processedBy,
    };

    const minimalPayload = {
        patient_id: input.patient_id,
        amount: input.amount,
        description: input.description,
        status,
    };

    try {
        const data = await tryInsertPayment(supabase, [fullPayload, compatiblePayload, minimalPayload]);
        const created = normalizePayment(data);
        await logAction("PAYMENT_CREATED", "payments", created.id, {
            patient_id: created.patient_id,
            amount: created.amount,
            status,
            category: input.category ?? "other",
            created_by: processedBy,
        });
        return created;
    } catch (error) {
        console.error("[payment] create:", error);
        throw error;
    }
}

export async function getPaymentById(id: string): Promise<Payment | null> {
    await requireStaff();
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
 */
export async function updatePendingBill(input: UpdatePendingBillInput): Promise<Payment> {
    await requireStaff([UserRole.FrontDesk]);

    if (!input.id) throw new Error("id is required to update a bill.");

    const supabase = await createClient();
    const existing = await getPaymentById(input.id);
    if (!existing) throw new Error("Bill was not found.");

    // Open bills (pending / partially paid) are editable regardless of their
    // balance — a ₦0 lab bill that is waiting for the lab tech's price is
    // exactly the bill the front desk needs to correct. Only final bills
    // (paid / waived / refunded) and deposits are locked.
    const existingStatus = normalizeStatus((existing as any).raw_status ?? existing.status);
    if (isDepositRow(existing) || !OUTSTANDING_STATUSES.has(existingStatus)) {
        throw new Error("Only open bills (pending / partially paid) can be edited. This bill is already settled.");
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

// ─── Deposit credit engine ────────────────────────────────────────────────────

async function listDepositRows(supabase: Sb, patientId: string): Promise<any[]> {
    // payment_type column may not exist on older schemas — fall back to category.
    try {
        const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("patient_id", patientId)
            .or(`category.eq.deposit,payment_type.eq.deposit`);

        if (!error) return data ?? [];
    } catch (err) {
        console.warn("[payment] deposit query with payment_type failed, falling back to category:", err);
    }

    const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId)
        .eq("category", "deposit");
    return data ?? [];
}

/**
 * Available deposit credit for a patient (in kobo):
 * deposits collected minus the part already applied to bills.
 */
export async function getPatientDepositCredit(patientId: string) {
    await requireStaff();
    const supabase = await createClient();
    const deposits = await listDepositRows(supabase, patientId);

    let totalKobo = 0;
    let appliedKobo = 0;
    for (const row of deposits) {
        if (normalizeStatus(row?.status) !== "paid" && normalizeStatus(row?.status) !== "partial") continue;
        totalKobo += paidToKobo(row);
        appliedKobo += appliedToKobo(row);
    }

    return {
        totalKobo,
        appliedKobo,
        availableKobo: Math.max(0, totalKobo - appliedKobo),
    };
}

async function updateRowPaidKobo(supabase: Sb, id: string, statusNow: string, payload: Record<string, any>) {
    // Verify the write actually landed: with RLS (or a schema mismatch) a
    // failing update reports ZERO changed rows and NO error — treating that
    // as success is how "Settle All" ended up reporting bills as settled
    // while every row stayed pending on the UI.
    const { error, count } = await supabase
        .from("payments")
        .update(payload, { count: "exact" })
        .eq("id", id)
        .eq("status", statusNow);

    if (!error && (count ?? 0) > 0) return;

    // Retry without the newest columns (older schemas).
    const { applied_kobo, payment_type, ...rest } = payload as any;
    void applied_kobo;
    void payment_type;
    const { error: retryError, count: retryCount } = await supabase
        .from("payments")
        .update(rest, { count: "exact" })
        .eq("id", id)
        .eq("status", statusNow);

    if (!retryError && (retryCount ?? 0) > 0) return;

    console.error(
        `[payment] updateRowPaidKobo: write did not apply for id=${id} ` +
        `(status filter="${statusNow}").`,
        retryError ?? error ?? `0 rows matched`
    );
    throw new Error(
        "A bill could not be updated — the database rejected the write " +
        "(row-level security). Ask an admin to apply the staff-role RLS fix " +
        "migration (20260829_fix_staff_role_matching_casing.sql), then retry."
    );
}

/**
 * Apply a patient's deposit credit to their outstanding bills (oldest first,
 * optionally a specific bill first). Updates both the bills and the deposit
 * rows' applied_kobo. Returns how much credit was used.
 */
async function applyDepositCreditInternal(
    supabase: Sb,
    patientId: string,
    targetBillId?: string
) {
    const deposits = await listDepositRows(supabase, patientId);
    const creditByDeposit = new Map<string, number>();

    let creditPool = 0;
    for (const row of deposits) {
        const status = normalizeStatus(row?.status);
        if (status !== "paid" && status !== "partial") continue;
        const available = Math.max(0, paidToKobo(row) - appliedToKobo(row));
        creditByDeposit.set(row.id, available);
        creditPool += available;
    }
    if (creditPool <= 0) return { usedKobo: 0, appliedToTargetKobo: 0, settledBillIds: [] as string[] };

    const { data: billRows } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", patientId);
    const bills = (billRows ?? []).filter(isOutstanding).sort((a: any, b: any) => {
        // Target bill first, then oldest first.
        if (a.id === targetBillId) return -1;
        if (b.id === targetBillId) return 1;
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
    });

    let usedKobo = 0;
    let appliedToTargetKobo = 0;
    const settledBillIds: string[] = [];

    for (const bill of bills) {
        if (creditPool <= 0) break;
        const outstanding = outstandingKobo(bill);
        const pay = Math.min(outstanding, creditPool);
        if (pay <= 0) continue;

        const newPaid = Math.min(amountToKobo(bill), paidToKobo(bill) + pay);
        const nextStatus = newPaid >= amountToKobo(bill) ? "paid" : "partial";
        await updateRowPaidKobo(supabase, bill.id, String((bill as any).raw_status ?? bill.status), {
            amount_paid_kobo: newPaid,
            status: nextStatus,
            paid_at: nextStatus === "paid" ? new Date().toISOString() : bill.paid_at ?? null,
            processed_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });

        // Consume from deposit rows FIFO.
        let remaining = pay;
        for (const [depositId, available] of creditByDeposit.entries()) {
            if (remaining <= 0) break;
            if (available <= 0) continue;
            const take = Math.min(remaining, available);
            creditByDeposit.set(depositId, available - take);
            remaining -= take;
            const row = deposits.find((d: any) => d.id === depositId);
            const newApplied = appliedToKobo(row) + take;
            await updateRowPaidKobo(supabase, depositId, String((row as any).raw_status ?? row.status), {
                applied_kobo: newApplied,
                payment_type: "deposit",
                updated_at: new Date().toISOString(),
            });
        }

        usedKobo += pay;
        if (bill.id === targetBillId) appliedToTargetKobo = pay;
        if (nextStatus === "paid") settledBillIds.push(bill.id);
        creditPool -= pay;
    }

    return { usedKobo, appliedToTargetKobo, settledBillIds };
}

// ─── Confirm / settle a single bill ───────────────────────────────────────────

export async function confirmPayment(inputOrId: ConfirmPaymentInput | string, methodArg?: string): Promise<Payment> {
    const input: ConfirmPaymentInput =
        typeof inputOrId === "string" ? { id: inputOrId, method: methodArg } : inputOrId;

    // Settling bills = booking money. Front Desk (or Admin) only — and the
    // cashier recorded in the ledger is the signed-in user, never the caller.
    const actor = await requireStaff([UserRole.FrontDesk]);
    input.cashierId = actor.userId;

    const supabase = await createClient();
    const existing = await getPaymentById(input.id);

    if (!existing) throw new Error("Payment record was not found.");

    // Any bill still OPEN (pending / partially paid) can be settled — including
    // zero-amount bills. Lab tests that are not in the catalogue are auto-billed
    // at ₦0 when the doctor orders them; if the lab tech's price never lands on
    // that row, the front desk must still be able to close the bill instead of
    // hitting a dead end. Only already-final bills are rejected.
    const existingStatus = normalizeStatus((existing as any).raw_status ?? existing.status);
    if (isDepositRow(existing) || !OUTSTANDING_STATUSES.has(existingStatus)) {
        throw new Error(
            `This payment cannot be settled — its current status is "${existing.status ?? "unknown"}". ` +
            `It may already be paid, waived, or fully refunded.`
        );
    }

    const now = new Date().toISOString();
    let totalKobo = amountToKobo(existing);
    const paidKobo = paidToKobo(existing);

    // ── 1. Payer auto-identification (HMO / Company / Private from registration) ──
    let payer = normalizePayer(input.payer);
    let payerReference = input.payerReference ?? (existing as any).payer_reference ?? null;
    let payerCode = input.payerCode ?? (existing as any).payer_code ?? null;
    if (!payer) {
        const resolved = await getPatientPayer(existing.patient_id!);
        payer = resolved.type;
        payerReference = payerReference ?? (resolved.reference || null);
    }
    const method = payer === "hmo" || payer === "company"
        ? payer
        : normalizeMethod(input.method ?? existing.method ?? existing.payment_method) ?? "cash";

    // ── 2. Optional price correction (front-desk edit before settling) ──
    if (
        typeof input.correctedAmount === "number" &&
        Number.isFinite(input.correctedAmount) &&
        input.correctedAmount >= 0
    ) {
        totalKobo = Math.max(paidKobo, Math.round(input.correctedAmount * 100));
    }

    // ── 3. Discount (percentage and/or flat amount) ──
    const discount = computeDiscountKobo({
        totalKobo,
        paidKobo,
        discountPercent: input.discountPercent,
        discountAmount: input.discountAmount,
    });
    const effectiveTotalKobo = Math.max(paidKobo, totalKobo - discount.discountKobo);
    const outstandingAfterDiscount = Math.max(0, effectiveTotalKobo - paidKobo);

    // ── 4. Payment type resolution ──
    let paymentType = normalizePaymentType(input.paymentType);
    if (!paymentType) {
        const offered = Math.max(0, Math.round((input.amountPaid ?? NaN) * 100));
        paymentType =
            Number.isFinite(offered) && offered + paidKobo < effectiveTotalKobo ? "partial" : "full";
    }

    // ── 5. Deposit: record the advance, then apply credit to outstanding bills ──
    if (paymentType === "deposit") {
        const depositKobo = Math.max(0, Math.round((input.amountPaid ?? 0) * 100));
        if (depositKobo <= 0) throw new Error("Deposit amount must be greater than zero.");

        const depositRow = await tryInsertPayment(supabase, [
            {
                patient_id: existing.patient_id,
                amount: depositKobo / 100,
                amount_kobo: depositKobo,
                amount_paid_kobo: depositKobo,
                description: "Advance deposit (credit on account)",
                category: "deposit",
                payment_type: "deposit",
                status: "paid",
                method,
                payment_method: methodLabel(method),
                payer,
                payer_reference: payerReference,
                payer_code: payerCode,
                processed_by: input.cashierId ?? existing.processed_by ?? null,
                processed_date: now,
                paid_at: now,
                invoice_no: `DEP-${Date.now().toString(36).toUpperCase()}`,
                notes: input.notes ?? "Deposit collected in advance against future bills.",
            },
            {
                patient_id: existing.patient_id,
                amount: depositKobo / 100,
                amount_kobo: depositKobo,
                amount_paid_kobo: depositKobo,
                description: "Advance deposit (credit on account)",
                category: "deposit",
                status: "paid",
                method,
                processed_by: input.cashierId ?? existing.processed_by ?? null,
                processed_date: now,
                paid_at: now,
            },
        ]);

        await applyDepositCreditInternal(supabase, existing.patient_id!, existing.id);
        await dischargeIfBillingCleared(supabase, normalizePayment(depositRow));
        await logAction("PAYMENT_CONFIRMED", "payments", input.id, {
            type: "deposit_applied",
            confirmed_by: actor.userId,
        });
        return normalizePayment(depositRow);
    }

    // ── 5. Optional existing deposit credit applied toward this bill first ──
    let creditAppliedToTarget = 0;
    if (input.useDepositCredit) {
        const applied = await applyDepositCreditInternal(supabase, existing.patient_id!, existing.id);
        creditAppliedToTarget = applied.appliedToTargetKobo;
    }

    // ── 6. Incoming cash / card / transfer ──
    let incomingKobo = 0;
    if (paymentType === "full") {
        incomingKobo = Math.max(0, effectiveTotalKobo - paidKobo - creditAppliedToTarget);
    } else {
        incomingKobo = Math.min(
            Math.max(0, effectiveTotalKobo - paidKobo - creditAppliedToTarget),
            Math.max(0, Math.round((input.amountPaid ?? 0) * 100))
        );
    }

    const newPaidKobo = Math.min(effectiveTotalKobo, paidKobo + creditAppliedToTarget + incomingKobo);
    const nextStatus: PaymentStatus = newPaidKobo >= effectiveTotalKobo ? "paid" : "partial";
    const editedAmount = effectiveTotalKobo / 100;

    const fullPayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        processed_date: now,
        processed_by: input.cashierId ?? existing.processed_by ?? null,
        method,
        payment_method: methodLabel(method),
        amount_paid_kobo: newPaidKobo,
        amount: editedAmount,
        amount_kobo: effectiveTotalKobo,
        payment_type: nextStatus === "paid" ? "full" : "partial",
        payer,
        payer_reference: payerReference,
        payer_code: payerCode,
        discount_kobo: discount.discountKobo,
        discount_percent: discount.percent || null,
        discount_amount_kobo: discount.flatKobo || null,
        updated_at: now,
    };

    const compatiblePayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        processed_date: now,
        processed_by: input.cashierId ?? existing.processed_by ?? null,
        method,
        amount_paid_kobo: newPaidKobo,
        amount: editedAmount,
    };

    const minimalPayload: Record<string, any> = {
        status: nextStatus,
        paid_at: nextStatus === "paid" ? now : existing.paid_at ?? null,
        method,
    };

    try {
        const updated = normalizePayment(
            await tryUpdatePayment(supabase, input.id, String((existing as any).raw_status ?? existing.status), [
                fullPayload,
                compatiblePayload,
                minimalPayload,
            ])
        );

        await dischargeIfBillingCleared(supabase, updated);
        await logAction("PAYMENT_CONFIRMED", "payments", input.id, {
            amount_paid_kobo: updated.amount_paid_kobo,
            method: updated.method ?? updated.payment_method,
            confirmed_by: actor.userId,
        });
        return updated;
    } catch (error) {
        console.error("[payment] confirm:", error);
        throw error;
    }
}

// ─── Record a standalone deposit (advance payment) ────────────────────────────

export interface RecordDepositInput {
    patient_id: string;
    amount: number;
    method?: PaymentMethod | string;
    cashierId?: string;
    payer?: PayerType | string;
    payerReference?: string;
    payerCode?: string;
    notes?: string;
    /** Apply the new credit to the patient's outstanding bills immediately (default true). */
    applyToOutstanding?: boolean;
}

export async function recordDeposit(input: RecordDepositInput): Promise<Payment> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    input.cashierId = actor.userId;

    if (!input.patient_id) throw new Error("patient_id is required to record a deposit.");
    const amountKobo = Math.round((input.amount ?? 0) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
        throw new Error("Deposit amount must be greater than zero.");
    }

    const supabase = await createClient();

    let payer = normalizePayer(input.payer);
    let payerReference = input.payerReference ?? null;
    if (!payer) {
        const resolved = await getPatientPayer(input.patient_id);
        payer = resolved.type;
        payerReference = payerReference ?? (resolved.reference || null);
    }
    const method = payer === "hmo" || payer === "company"
        ? payer
        : normalizeMethod(input.method) ?? "cash";

    const now = new Date().toISOString();
    const row = await tryInsertPayment(supabase, [
        {
            patient_id: input.patient_id,
            amount: amountKobo / 100,
            amount_kobo: amountKobo,
            amount_paid_kobo: amountKobo,
            description: "Advance deposit (credit on account)",
            category: "deposit",
            payment_type: "deposit",
            status: "paid",
            method,
            payment_method: methodLabel(method),
            payer,
            payer_reference: payerReference,
            payer_code: input.payerCode ?? null,
            processed_by: input.cashierId ?? null,
            processed_date: now,
            paid_at: now,
            invoice_no: `DEP-${Date.now().toString(36).toUpperCase()}`,
            notes: input.notes ?? null,
        },
        {
            patient_id: input.patient_id,
            amount: amountKobo / 100,
            amount_kobo: amountKobo,
            amount_paid_kobo: amountKobo,
            description: "Advance deposit (credit on account)",
            category: "deposit",
            status: "paid",
            method,
            processed_by: input.cashierId ?? null,
            processed_date: now,
            paid_at: now,
        },
    ]);

    if (input.applyToOutstanding !== false) {
        await applyDepositCreditInternal(supabase, input.patient_id);
    }

    await dischargeIfBillingCleared(supabase, normalizePayment(row));
    return normalizePayment(row);
}

// ─── Settle ALL accumulated bills for one patient ─────────────────────────────

export interface SettleAllPatientBillsInput {
    patientId: string;
    method?: PaymentMethod | string;
    cashierId?: string;
    /** full (default) or partial (requires amountPaid). */
    paymentType?: "full" | "partial";
    amountPaid?: number;
    discountPercent?: number;
    discountAmount?: number;
    payer?: PayerType | string;
    payerReference?: string;
    payerCode?: string;
    useDepositCredit?: boolean;
}

export interface SettleAllResult {
    patientId: string;
    billsSettled: number;
    billsPartiallyPaid: number;
    totalOutstandingKobo: number;
    discountKobo: number;
    creditUsedKobo: number;
    collectedKobo: number;
    remainingKobo: number;
}

export async function settleAllPatientBills(input: SettleAllPatientBillsInput): Promise<SettleAllResult> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    if (typeof (input as any).cashierId === "string") (input as any).cashierId = actor.userId;

    if (!input.patientId) throw new Error("patientId is required.");

    const supabase = await createClient();
    const { data: rows, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", input.patientId)
        .order("created_at", { ascending: true });

    if (error) throw error;

    const bills = (rows ?? []).filter(isOpenBill);
    if (bills.length === 0) {
        return {
            patientId: input.patientId,
            billsSettled: 0,
            billsPartiallyPaid: 0,
            totalOutstandingKobo: 0,
            discountKobo: 0,
            creditUsedKobo: 0,
            collectedKobo: 0,
            remainingKobo: 0,
        };
    }

    const now = new Date().toISOString();
    const totalOutstandingKobo = bills.reduce((s, b) => s + outstandingKobo(b), 0);

    // ── Payer auto-identification ──
    let payer = normalizePayer(input.payer);
    let payerReference = input.payerReference ?? null;
    if (!payer) {
        const resolved = await getPatientPayer(input.patientId);
        payer = resolved.type;
        payerReference = payerReference ?? (resolved.reference || null);
    }
    const method = payer === "hmo" || payer === "company"
        ? payer
        : normalizeMethod(input.method) ?? "cash";

    // ── Discount across the accumulated bills ──
    const discount = computeDiscountKobo({
        totalKobo: totalOutstandingKobo,
        paidKobo: 0,
        discountPercent: input.discountPercent,
        discountAmount: input.discountAmount,
    });

    // Distribute the discount proportionally across bills (remainder on first).
    let remainingDiscount = discount.discountKobo;
    const perBillDiscount = bills.map((b, i) => {
        const out = outstandingKobo(b);
        if (remainingDiscount <= 0) return 0;
        let share = i === 0
            ? Math.min(out, remainingDiscount)
            : Math.min(out, Math.round((discount.discountKobo * out) / Math.max(1, totalOutstandingKobo)));
        share = Math.min(share, remainingDiscount);
        remainingDiscount -= share;
        return share;
    });

    // ── Deposit credit first ──
    let creditUsedKobo = 0;
    if (input.useDepositCredit) {
        const applied = await applyDepositCreditInternal(supabase, input.patientId);
        creditUsedKobo = applied.usedKobo;
    }

    // Recompute each bill's outstanding after credit + discount.
    const billPlans = bills.map((b, i) => {
        const totalKobo = Math.max(paidToKobo(b), amountToKobo(b) - perBillDiscount[i]);
        return { bill: b, discountKobo: perBillDiscount[i], totalKobo, outstanding: Math.max(0, totalKobo - paidToKobo(b)) };
    });

    const afterCreditOutstanding = billPlans.reduce((s, p) => s + p.outstanding, 0);

    // ── Cash / card / transfer to collect ──
    const paymentType = input.paymentType ?? "full";
    let collectKobo = afterCreditOutstanding;
    if (paymentType === "partial") {
        collectKobo = Math.min(afterCreditOutstanding, Math.max(0, Math.round((input.amountPaid ?? 0) * 100)));
    }
    let incomingPool = collectKobo;
    let collectedKobo = 0;
    let settled = 0;
    let partiallyPaid = 0;

    for (const plan of billPlans) {
        // Bills already fully covered by deposit credit, earlier payments — or
        // with nothing left to collect (₦0 bills waiting to be closed).
        if (paidToKobo(plan.bill) >= plan.totalKobo) {
            // Zero-amount open bills still need their status closed in the DB,
            // otherwise they linger as "pending" forever.
            if (isOpenBill(plan.bill)) {
                await updateRowPaidKobo(supabase, plan.bill.id, String((plan.bill as any).raw_status ?? plan.bill.status), {
                    status: "paid" as PaymentStatus,
                    amount_paid_kobo: paidToKobo(plan.bill),
                    paid_at: now,
                    processed_date: now,
                    processed_by: input.cashierId ?? null,
                    method,
                    payment_method: methodLabel(method),
                    payment_type: "full",
                    payer,
                    payer_reference: payerReference,
                    payer_code: input.payerCode ?? null,
                    updated_at: now,
                });
            }
            settled++;
            continue;
        }
        if (incomingPool <= 0) {
            // Collection ran out — this bill stays outstanding, untouched.
            partiallyPaid++;
            continue;
        }
        const payNow = Math.min(plan.outstanding, incomingPool);
        incomingPool -= payNow;

        const newPaid = Math.min(plan.totalKobo, paidToKobo(plan.bill) + payNow);
        const nextStatus: PaymentStatus = newPaid >= plan.totalKobo ? "paid" : "partial";
        if (nextStatus === "paid") settled++; else partiallyPaid++;

        const isThisBillFullyCoveredNow = payNow >= plan.outstanding;

        await updateRowPaidKobo(supabase, plan.bill.id, String((plan.bill as any).raw_status ?? plan.bill.status), {
            status: nextStatus,
            amount_paid_kobo: newPaid,
            paid_at: nextStatus === "paid" ? now : plan.bill.paid_at ?? null,
            processed_date: now,
            processed_by: input.cashierId ?? null,
            method,
            payment_method: methodLabel(method),
            amount: plan.totalKobo / 100,
            amount_kobo: plan.totalKobo,
            payment_type: isThisBillFullyCoveredNow ? "full" : "partial",
            payer,
            payer_reference: payerReference,
            payer_code: input.payerCode ?? null,
            discount_kobo: plan.discountKobo,
            discount_percent: discount.percent || null,
            discount_amount_kobo: discount.flatKobo || null,
            updated_at: now,
        });

        collectedKobo += payNow;
    }

    const remainingKobo = Math.max(0, afterCreditOutstanding - collectKobo);
    const summary: SettleAllResult = {
        patientId: input.patientId,
        billsSettled: settled,
        billsPartiallyPaid: partiallyPaid,
        totalOutstandingKobo,
        discountKobo: discount.discountKobo,
        creditUsedKobo,
        collectedKobo,
        remainingKobo,
    };

    await dischargeIfBillingCleared(supabase, { patient_id: input.patientId } as any);
    return summary;
}

// ─── Settle ALL pending bills in the checkout queue ───────────────────────────

export interface SettleQueueBillsInput {
    /** Default method used for private-payer bills (HMO/Company resolve automatically). */
    method?: PaymentMethod | string;
    cashierId?: string;
}

export interface SettleQueueResult {
    settled: number;
    patientsCleared: number;
    byPayer: { hmo: number; company: number; private: number };
}

export async function settleAllPendingBills(input: SettleQueueBillsInput): Promise<SettleQueueResult> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    if (typeof (input as any).cashierId === "string") (input as any).cashierId = actor.userId;

    const supabase = await createClient();
    const { data: rows, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) throw error;

    const bills = (rows ?? []).filter(isOpenBill);
    if (bills.length === 0) {
        return { settled: 0, patientsCleared: 0, byPayer: { hmo: 0, company: 0, private: 0 } };
    }

    const patientIds = [...new Set(bills.map((b: any) => b.patient_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, hmo, hmo_name, policy_number, company, company_name, private_client")
        .in("id", patientIds);
    const patientMap = new Map((patients ?? []).map((p: any) => [p.id, p]));

    const defaultMethod = normalizeMethod(input.method) ?? "cash";
    const now = new Date().toISOString();
    const byPayer = { hmo: 0, company: 0, private: 0 };

    for (const bill of bills) {
        const resolved = resolvePayerFromPatient(patientMap.get(bill.patient_id));
        const method = resolved.type === "private" ? defaultMethod : resolved.type;
        byPayer[resolved.type as keyof typeof byPayer] = (byPayer[resolved.type as keyof typeof byPayer] ?? 0) + 1;

        const totalKobo = amountToKobo(bill);
        await updateRowPaidKobo(supabase, bill.id, String((bill as any).raw_status ?? bill.status), {
            status: "paid",
            amount_paid_kobo: totalKobo,
            paid_at: now,
            processed_date: now,
            processed_by: input.cashierId ?? null,
            method,
            payment_method: methodLabel(method),
            payment_type: "full",
            payer: resolved.type,
            payer_reference: resolved.reference || null,
            updated_at: now,
        });
    }

    let patientsCleared = 0;
    for (const patientId of patientIds) {
        const { data: remaining } = await supabase
            .from("payments")
            .select("*")
            .eq("patient_id", patientId);
        if ((remaining ?? []).some(isOutstanding)) continue;

        // Only auto-discharge patients that were actually awaiting payment —
        // e.g. someone mid-lab-work keeps their status even if a single
        // outstanding bill of theirs was settled here.
        const { data: patient } = await supabase
            .from("patients")
            .select("status")
            .eq("id", patientId)
            .maybeSingle();
        if (patient?.status !== "awaiting-payment") continue;

        patientsCleared++;
        await supabase
            .from("patients")
            .update({ status: "discharged", updated_at: now })
            .eq("id", patientId);
    }

    return { settled: bills.length, patientsCleared, byPayer };
}

// ─── Discharge when billing is fully cleared ──────────────────────────────────

async function dischargeIfBillingCleared(
    supabase: Sb,
    payment: Payment | { patient_id?: string }
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

// ─── Listing ──────────────────────────────────────────────────────────────────

export async function listPaymentsByPatient(patientId: string): Promise<Payment[]> {
    await requireStaff();
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
    await requireStaff();
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
        .select("id, name, phone, hmo, hmo_name, policy_number, company, company_name, private_client")
        .in("id", ids);

    const patientMap = Object.fromEntries((patients ?? []).map((patient: any) => [patient.id, patient]));

    return outstanding.map((payment: any) =>
        normalizePayment({ ...payment, patients: patientMap[payment.patient_id] ?? null })
    );
}
