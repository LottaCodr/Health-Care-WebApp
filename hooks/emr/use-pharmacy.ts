"use client";

import { useState, useEffect, useCallback } from "react";
import { Prescription, DrugInventoryItem } from "@/types/models";
import * as PH from "@/lib/services/pharmacy.service";

interface S<T> { data: T; loading: boolean; error: Error | null; }

// ─── Prescriptions ────────────────────────────────────────────────────────────

export function usePrescriptionsByPatient(patientId: string) {
    const [s, set] = useState<S<Prescription[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        if (!patientId) { set({ data: [], loading: false, error: null }); return; }
        set({ data: [], loading: true, error: null });
        PH.listPrescriptionsByPatient(patientId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId]);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function usePendingPrescriptions() {
    const [s, set] = useState<S<Prescription[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        PH.listPendingPrescriptions()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

export function useCreatePrescription() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: PH.CreatePrescriptionInput) => {
        setLoading(true);
        try { return await PH.createPrescription(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useUpdatePrescription() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, updates: Partial<Prescription>) => {
        setLoading(true);
        try { return await PH.updatePrescription(id, updates); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useCreateDispensingRecord() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (data: any) => {
        setLoading(true);
        try { return await PH.createDispensingRecord(data); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useDispensingRecordsByPatient(patientId: string) {
    const [s, set] = useState<S<any[]>>({ data: [], loading: true, error: null });
    useEffect(() => {
        if (!patientId) return;
        set({ data: [], loading: true, error: null });
        PH.listDispensingByPatient(patientId)
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, [patientId]);
    return s;
}

// ─── Drug Inventory — stock view (pharmacist daily use) ───────────────────────

export function useDrugInventory() {
    const [s, set] = useState<S<DrugInventoryItem[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        PH.listDrugInventory()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

// ─── Drug Catalog — full catalog with pricing (Admin + Pharmacist manage) ────

export function useDrugCatalog() {
    const [s, set] = useState<S<DrugInventoryItem[]>>({ data: [], loading: true, error: null });
    const refetch = useCallback(() => {
        set({ data: [], loading: true, error: null });
        PH.listAllDrugs()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    useEffect(() => { refetch(); }, [refetch]);
    return { ...s, refetch };
}

// ─── Active drugs — autocomplete for pharmacist prescription form ─────────────

export function useActiveDrugs() {
    const [s, set] = useState<S<Partial<DrugInventoryItem>[]>>({ data: [], loading: false, error: null });
    useEffect(() => {
        set({ data: [], loading: true, error: null });
        PH.listDrugInventory()
            .then(d => set({ data: d, loading: false, error: null }))
            .catch(e => set({ data: [], loading: false, error: e }));
    }, []);
    return s;
}

export function useUpsertDrug() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (drug: Partial<DrugInventoryItem>, id?: string) => {
        setLoading(true);
        try { return await PH.upsertDrug(drug, id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useDeleteDrug() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string) => {
        setLoading(true);
        try { return await PH.deleteDrug(id); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useRestockDrug() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, qty: number) => {
        setLoading(true);
        try { return await PH.restockDrug(id, qty); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}

export function useToggleDrugActive() {
    const [loading, setLoading] = useState(false);
    const mutate = useCallback(async (id: string, current: boolean) => {
        setLoading(true);
        try { return await PH.toggleDrugActive(id, current); }
        finally { setLoading(false); }
    }, []);
    return { mutate, loading };
}