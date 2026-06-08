"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pharmacyKeys, patientKeys } from "../query-keys";
import * as PH from "@/lib/services/pharmacy.service";
import type { Prescription, DrugInventoryItem } from "@/types/models";

const LIST_STALE = 30_000;
const CATALOG_STALE = 5 * 60_000;  // drug catalog changes rarely
const GC_TIME = 10 * 60_000;

// ─── Prescription Queries ─────────────────────────────────────────────────────

export function usePrescriptionsByPatient(patientId: string) {
    return useQuery({
        queryKey: pharmacyKeys.prescriptionsByPatient(patientId),
        queryFn: () => PH.listPrescriptionsByPatient(patientId),
        enabled: !!patientId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function usePendingPrescriptions() {
    return useQuery({
        queryKey: pharmacyKeys.prescriptionsPending(),
        queryFn: PH.listPendingPrescriptions,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: 60_000,   // pharmacist queue auto-refreshes
    });
}

export function usePrescription(id: string) {
    return useQuery({
        queryKey: pharmacyKeys.prescription(id),
        queryFn: () => PH.getPrescriptionById(id),
        enabled: !!id,
        staleTime: 60_000,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Prescription Mutations ───────────────────────────────────────────────────

export function useCreatePrescription() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: PH.CreatePrescriptionInput) => PH.createPrescription(data),

        onSuccess: (prescription) => {
            qc.setQueryData(pharmacyKeys.prescription(prescription.id), prescription);
            qc.invalidateQueries({
                queryKey: pharmacyKeys.prescriptionsByPatient(prescription.id),
            });
            qc.invalidateQueries({ queryKey: pharmacyKeys.prescriptionsPending() });
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdatePrescription() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Prescription> }) =>
            PH.updatePrescription(id, updates),

        // Optimistic — dispensed badge flips instantly
        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: pharmacyKeys.prescription(id) });
            const previous = qc.getQueryData<Prescription>(pharmacyKeys.prescription(id));
            if (previous) qc.setQueryData(pharmacyKeys.prescription(id), { ...previous, ...updates });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(pharmacyKeys.prescription(ctx.id), ctx.previous);
        },

        onSuccess: (updated) => {
            qc.setQueryData(pharmacyKeys.prescription(updated.id), updated);
            qc.invalidateQueries({
                queryKey: pharmacyKeys.prescriptionsByPatient(updated.id),
            });
            qc.invalidateQueries({ queryKey: pharmacyKeys.prescriptionsPending() });
            // After dispensing the DB trigger creates a payment → bust payment cache too
            if (updated.id) {
                qc.invalidateQueries({ queryKey: ["payments"] });
                qc.invalidateQueries({ queryKey: patientKeys.lists() });
            }
        },
    });
}

// ─── Dispensing Records ───────────────────────────────────────────────────────

export function useDispensingRecordsByPatient(patientId: string) {
    return useQuery({
        queryKey: pharmacyKeys.dispensing(patientId),
        queryFn: () => PH.listDispensingByPatient(patientId),
        enabled: !!patientId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useCreateDispensingRecord() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => PH.createDispensingRecord(data),

        onSuccess: (_record, variables) => {
            if (variables.patient_id) {
                qc.invalidateQueries({ queryKey: pharmacyKeys.dispensing(variables.patient_id) });
            }
        },
    });
}

// ─── Drug Inventory Queries ───────────────────────────────────────────────────

/** Active drugs only — for stock view and prescription autocomplete */
export function useDrugInventory() {
    return useQuery({
        queryKey: pharmacyKeys.inventoryActive(),
        queryFn: PH.listDrugInventory,
        staleTime: CATALOG_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** All drugs including inactive — for management/catalog page */
export function useDrugCatalog() {
    return useQuery({
        queryKey: pharmacyKeys.catalog(),
        queryFn: PH.listAllDrugs,
        staleTime: CATALOG_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** Active in-stock drugs — for prescription drug name autocomplete */
export function useActiveDrugs() {
    return useQuery({
        queryKey: pharmacyKeys.inventoryActive(),
        queryFn: PH.listDrugInventory,
        staleTime: CATALOG_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        select: (data) => data.filter(d => d.quantity > 0),
    });
}

// ─── Drug Catalog Mutations ───────────────────────────────────────────────────

export function useUpsertDrug() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ drug, id }: { drug: Partial<DrugInventoryItem>; id?: string }) =>
            PH.upsertDrug(drug, id),

        onSuccess: (upserted) => {
            // Update both catalog caches inline — no full refetch needed
            const updater = (old: DrugInventoryItem[] = []) => {
                const idx = old.findIndex(d => d.id === upserted.id);
                return idx >= 0
                    ? old.map(d => d.id === upserted.id ? upserted : d)
                    : [upserted, ...old];
            };
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog(), updater);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive(), updater);
        },
    });
}

export function useDeleteDrug() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => PH.deleteDrug(id),

        // Optimistic remove from both caches
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: pharmacyKeys.catalog() });
            const previousCatalog = qc.getQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog());
            const previousInventory = qc.getQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive());

            const remove = (old: DrugInventoryItem[] = []) => old.filter(d => d.id !== id);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog(), remove);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive(), remove);

            return { previousCatalog, previousInventory };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previousCatalog) qc.setQueryData(pharmacyKeys.catalog(), ctx.previousCatalog);
            if (ctx?.previousInventory) qc.setQueryData(pharmacyKeys.inventoryActive(), ctx.previousInventory);
        },

        onSettled: () => {
            qc.invalidateQueries({ queryKey: pharmacyKeys.catalog() });
            qc.invalidateQueries({ queryKey: pharmacyKeys.inventoryActive() });
        },
    });
}

export function useRestockDrug() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, qty }: { id: string; qty: number }) => PH.restockDrug(id, qty),

        // Optimistic quantity update
        onMutate: async ({ id, qty }) => {
            await qc.cancelQueries({ queryKey: pharmacyKeys.inventoryActive() });

            const update = (old: DrugInventoryItem[] = []) =>
                old.map(d => d.id === id ? { ...d, quantity: d.quantity + qty } : d);

            const prevInventory = qc.getQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive());
            const prevCatalog = qc.getQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog());

            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive(), update);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog(), update);

            return { prevInventory, prevCatalog };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.prevInventory) qc.setQueryData(pharmacyKeys.inventoryActive(), ctx.prevInventory);
            if (ctx?.prevCatalog) qc.setQueryData(pharmacyKeys.catalog(), ctx.prevCatalog);
        },

        onSuccess: (updated) => {
            // Update the exact record in both caches
            const set = (old: DrugInventoryItem[] = []) =>
                old.map(d => d.id === updated.id ? updated : d);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive(), set);
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog(), set);
        },
    });
}

export function useToggleDrugActive() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, current }: { id: string; current: boolean }) =>
            PH.toggleDrugActive(id, current),

        // Optimistic toggle
        onMutate: async ({ id, current }) => {
            const toggle = (old: DrugInventoryItem[] = []) =>
                old.map(d => d.id === id ? { ...d, is_active: !current } : d);

            const prevCatalog = qc.getQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog());
            qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.catalog(), toggle);
            // Active inventory: if deactivating, remove from active list
            if (current) {
                qc.setQueryData<DrugInventoryItem[]>(pharmacyKeys.inventoryActive(),
                    (old = []) => old.filter(d => d.id !== id)
                );
            }
            return { prevCatalog };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.prevCatalog) qc.setQueryData(pharmacyKeys.catalog(), ctx.prevCatalog);
        },

        onSettled: () => {
            qc.invalidateQueries({ queryKey: pharmacyKeys.catalog() });
            qc.invalidateQueries({ queryKey: pharmacyKeys.inventoryActive() });
        },
    });
}