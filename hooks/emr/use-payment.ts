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
        refetchInterval: 60_000,   // cashier desk needs fresh data
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

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof PS.createPayment>[0]) =>
            PS.createPayment(data),

        onSuccess: (payment) => {
            qc.invalidateQueries({ queryKey: paymentKeys.pending() });
            qc.invalidateQueries({ queryKey: paymentKeys.byPatient(payment.id) });
        },
    });
}

export function useConfirmPayment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => PS.confirmPayment(id),

        // Optimistic: remove from pending list immediately
        onMutate: async (id) => {
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
            qc.invalidateQueries({ queryKey: paymentKeys.pending() });
            if (data?.patient_id) {
                // Patient is now discharged — bust their detail cache
                qc.invalidateQueries({ queryKey: patientKeys.detail(data.patient_id) });
                qc.invalidateQueries({ queryKey: paymentKeys.byPatient(data.patient_id) });
                qc.invalidateQueries({ queryKey: patientKeys.lists() });
            }
        },
    });
}