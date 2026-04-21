import { useState, useEffect, useCallback } from "react";
import * as PS from "@/lib/services/payment.service";
import { Payment } from "@/types/models";


interface S<T> { data: T; loading: boolean; error: Error | null; }


export function usePendingPayments() {
    const [s, set] = useState<S<Payment[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        PS.listPendingPayments()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function usePaymentsByPatient(patientId: string) {
    const [s, set] = useState<S<Payment[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        if (!patientId) return;
        set({ data: [], loading: true, error: null });
        PS.listPaymentsByPatient(patientId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId]);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useCreatePayment() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: Parameters<typeof PS.createPayment>[0]) => {
        setLoading(true);
        try { return await PS.createPayment(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useConfirmPayment() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string) => {
        setLoading(true);
        try { return await PS.confirmPayment(id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}