"use client";


import { useState, useEffect, useCallback } from "react";
import { Patient, PatientStatus } from "@/types/models";
import * as PatientService from "@/lib/services/patient.service";

interface S<T> { data: T; loading: boolean; error: Error | null; }

export function usePatient(id: string, opts?: { enabled?: boolean }) {
    const [s, set] = useState<S<Patient | null>>({ data: null, loading: true, error: null });

    useEffect(() => {
        if (!id || opts?.enabled === false) { set({ data: null, loading: false, error: null }); return; }
        set({ data: null, loading: true, error: null });
        PatientService.getPatientById(id)
            .then(d => set({ data: d, loading: false, error: d ? null : new Error("Not found") }))
            .catch(e => set({ data: null, loading: false, error: e }));
    }, [id, opts?.enabled]);

    return s;
}

export function usePatientsByStatus(status: PatientStatus) {
    const [s, set] = useState<S<Patient[]>>({ data: [], loading: true, error: null });

    useEffect(() => {
        set({ data: [], loading: true, error: null });
        PatientService.listPatientsByStatus(status)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [status]);

    return s;
}

export function useSearchPatients(query: string) {
    const [s, set] = useState<S<Patient[]>>({ data: [], loading: false, error: null });

    useEffect(() => {
        if (!query.trim()) { set({ data: [], loading: false, error: null }); return; }
        set({ data: [], loading: true, error: null });
        const t = setTimeout(() =>
            PatientService.searchPatients(query)
                .then(d => set({ data: d, loading: false, error: null }))
                .catch(e => set({ data: [], loading: false, error: e }))
            , 300);
        return () => clearTimeout(t);
    }, [query]);

    return s;
}

export function useAllPatients() {
    const [s, set] = useState<S<Patient[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        PatientService.getAllPatients()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useUpdatePatientStatus() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, status: PatientStatus) => {
        setLoading(true);
        try { return await PatientService.updatePatientStatus(id, status); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useCreatePatient() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: Parameters<typeof PatientService.createPatient>[0]) => {
        setLoading(true);
        try { return await PatientService.createPatient(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}