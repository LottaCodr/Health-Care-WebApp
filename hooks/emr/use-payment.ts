"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentKeys, patientKeys } from "../query-keys";
import * as PS from "@/lib/services/payment.service";
import type { Payment } from "@/types/models";

const LIST_STALE = 30_000;
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePendingPayments() {
    return useQuery({
        queryKey: paymentKeys.pending(),
        queryFn: PS.listPendingPayments,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: 60_000,
    });
}

export function usePaymentsByPatient(patientId: string) {
    return useQuery({
        queryKey: paymentKeys.byPatient(patientId),
        queryFn: () => PS.listPaymentsByPatient(patientId),
        enabled: !!patientId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** Available deposit credit (advance payments) for a patient, in kobo. */
export function usePatientDepositCredit(patientId: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: paymentKeys.depositCredit(patientId),
        queryFn: () => PS.getPatientDepositCredit(patientId),
        enabled: !!patientId && opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function invalidatePaymentCaches(qc: ReturnType<typeof useQueryClient>, patientId?: string | null) {
    qc.invalidateQueries({ queryKey: paymentKeys.all() });
    qc.invalidateQueries({ queryKey: paymentKeys.pending() });
    if (patientId) {
        qc.invalidateQueries({ queryKey: paymentKeys.byPatient(patientId) });
        qc.invalidateQueries({ queryKey: paymentKeys.depositCredit(patientId) });
        qc.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
        qc.invalidateQueries({ queryKey: patientKeys.lists() });
    }
}

export function useCreatePayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof PS.createPayment>[0]) =>
            PS.createPayment(data),

        onSuccess: (payment) => {
            invalidatePaymentCaches(qc, payment.patient_id);
        },
    });
}

/**
 * Edits an outstanding bill (price, description, category) while it is still
 * pending — front desk can correct invoices before settling them.
 */
export function useUpdatePayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: PS.UpdatePendingBillInput) =>
            PS.updatePendingBill(input),

        onSuccess: (payment) => {
            invalidatePaymentCaches(qc, payment.patient_id);
        },
    });
}

/**
 * Confirms a pending payment. Supports full / part payment, deposit
 * (advance), percentage and/or flat discounts, deposit-credit application,
 * and payer auto-identification (HMO / Company / Private).
 */
export function useConfirmPayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: PS.ConfirmPaymentInput) =>
            PS.confirmPayment(input),

        onMutate: async ({ id }) => {
            await qc.cancelQueries({ queryKey: paymentKeys.pending() });
            const previous = qc.getQueryData<Payment[]>(paymentKeys.pending());
            qc.setQueryData<Payment[]>(paymentKeys.pending(),
                (old = []) => old.filter(p => p.id !== id)
            );
            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(paymentKeys.pending(), ctx.previous);
        },

        onSettled: (data) => {
            invalidatePaymentCaches(qc, data?.patient_id ?? null);
        },
    });
}

/** Records an advance deposit (credit on the patient's account). */
export function useRecordDeposit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: PS.RecordDepositInput) => PS.recordDeposit(input),
        onSuccess: (payment) => {
            invalidatePaymentCaches(qc, payment.patient_id);
        },
    });
}

/** Settles ALL accumulated outstanding bills for a single patient. */
export function useSettleAllPatientBills() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: PS.SettleAllPatientBillsInput) =>
            PS.settleAllPatientBills(input),
        onSuccess: (result) => {
            invalidatePaymentCaches(qc, result.patientId);
        },
    });
}

/** Settles every pending bill in the checkout queue (payer-aware). */
export function useSettleAllPendingBills() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: PS.SettleQueueBillsInput) =>
            PS.settleAllPendingBills(input),
        onSuccess: () => {
            invalidatePaymentCaches(qc, null);
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}
