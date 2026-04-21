"use client";

import { useState, useEffect, useCallback } from "react";
import * as NS from "@/lib/services/nursing.service";
import * as PS from "@/lib/services/payment.service";
import * as SS from "@/lib/services/staff.service";
import { Payment } from "@/types/models";


interface S<T> { data: T; loading: boolean; error: Error | null; }

export function usePendingNursingActions() {
    const [s, set] = useState<S<any[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        NS.listPendingNursingActions()
            .then(d => set({ data: d ?? [], loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useNursingActionsByPatient(
    patientId: string,
    opts?: { enabled?: boolean }
) {
    const [s, set] = useState<S<any[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        if (!patientId || opts?.enabled === false) {
            set({ data: [], loading: false, error: null });
            return;
        }
        set({ data: [], loading: true, error: null });
        NS.listNursingActionsByPatient(patientId)
            .then(d => set({ data: d ?? [], loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId, opts?.enabled]);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useCreateNursingAction() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: NS.CreateNursingActionInput) => {
        setLoading(true);
        try { return await NS.createNursingAction(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useUpdateNursingAction() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, updates: NS.UpdateNursingActionInput) => {
        setLoading(true);
        try { return await NS.updateNursingAction(id, updates); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}




