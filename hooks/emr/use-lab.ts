"use client";

import { useState, useEffect, useCallback } from "react";
import { LabRequest } from "@/types/models";
import * as LS from "@/lib/services/lab.service";

interface S<T> { data: T; loading: boolean; error: Error | null; }

// ─── Lab Requests ─────────────────────────────────────────────────────────────

export function useLabRequestsByPatient(patientId: string) {
    const [s, set] = useState<S<LabRequest[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        if (!patientId) return;
        set({ data: [], loading: true, error: null });
        LS.listLabRequestsByPatient(patientId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId]);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function usePendingLabRequests() {
    const [s, set] = useState<S<LabRequest[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        LS.listPendingLabRequests()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useCompletedLabRequests() {
    const [s, set] = useState<S<LabRequest[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        LS.listCompletedLabRequests()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useCreateLabRequest() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: LS.CreateLabRequestInput) => {
        setLoading(true);
        try { return await LS.createLabRequest(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useUpdateLabRequest() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, updates: Parameters<typeof LS.updateLabRequest>[1]) => {
        setLoading(true);
        try { return await LS.updateLabRequest(id, updates); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

// ─── Lab Test Catalog ─────────────────────────────────────────────────────────

export function useActiveLabTests() {
    const [s, set] = useState<S<LS.LabTestCatalogItem[]>>({ data: [], loading: true, error: null });
    useEffect(() => {
        set({ data: [], loading: true, error: null });
        LS.listActiveLabTests()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    return s;
}

export function useLabTestCatalog() {
    const [s, set] = useState<S<LS.LabTestCatalogItem[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        LS.listAllLabTests()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useUpsertLabTest() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (test: Partial<LS.LabTestCatalogItem>, id?: string) => {
        setLoading(true);
        try { return await LS.upsertLabTest(test, id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useDeleteLabTest() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string) => {
        setLoading(true);
        try { return await LS.deleteLabTest(id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useToggleLabTestActive() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, current: boolean) => {
        setLoading(true);
        try { return await LS.toggleLabTestActive(id, current); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}