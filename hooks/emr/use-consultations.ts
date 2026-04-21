"use client";
import { useState, useEffect, useCallback } from "react";
import { Consultation } from "@/types/models";
import * as CS from "@/lib/services/consultation.service";



interface S<T> { data: T; loading: boolean; error: Error | null; }

export function useConsultationsByPatient(patientId: string) {
    const [s, set] = useState<S<Consultation[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        if (!patientId) return;
        set({ data: [], loading: true, error: null });
        CS.listConsultationsByPatient(patientId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId]);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useConsultationsByDoctor(doctorId: string) {
    const [s, set] = useState<S<Consultation[]>>({ data: [], loading: true, error: null });
    useEffect(() => {
        if (!doctorId) return;
        set({ data: [], loading: true, error: null });
        CS.listConsultationsByDoctor(doctorId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [doctorId]);
    return s;
}

export function useCreateConsultation() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: CS.CreateConsultationInput) => {
        setLoading(true);
        try { return await CS.createConsultation(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useUpdateConsultation() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, updates: Partial<Consultation>) => {
        setLoading(true);
        try { return await CS.updateConsultation(id, updates); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useDeleteConsultation() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string) => {
        setLoading(true);
        try { return await CS.deleteConsultation(id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}