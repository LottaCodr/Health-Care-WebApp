"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labKeys, patientKeys } from "../query-keys";
import * as LS from "@/lib/services/lab.service";
import type { LabRequest } from "@/types/models";

const LIST_STALE = 30_000;       // lab queue refreshes often
const CATALOG_STALE = 5 * 60_000;  // catalog rarely changes
const GC_TIME = 10 * 60_000;

// ─── Lab Request Queries ──────────────────────────────────────────────────────

export function useLabRequestsByPatient(patientId: string) {
    return useQuery({
        queryKey: labKeys.byPatient(patientId),
        queryFn: () => LS.listLabRequestsByPatient(patientId),
        enabled: !!patientId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function usePendingLabRequests() {
    return useQuery({
        queryKey: labKeys.pending(),
        queryFn: LS.listPendingLabRequests,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: 60_000,  // auto-refresh every 60s for lab tech dashboard
    });
}

export function useCompletedLabRequests() {
    return useQuery({
        queryKey: labKeys.completed(),
        queryFn: LS.listCompletedLabRequests,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useLabRequest(id: string) {
    return useQuery({
        queryKey: labKeys.detail(id),
        queryFn: () => LS.getLabRequestById(id),
        enabled: !!id,
        staleTime: 60_000,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Lab Request Mutations ────────────────────────────────────────────────────

export function useCreateLabRequest() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: LS.CreateLabRequestInput) => LS.createLabRequest(data),

        onSuccess: (request) => {
            qc.setQueryData(labKeys.detail(request.id), request);
            // Bust patient's lab list and the pending queue
            qc.invalidateQueries({ queryKey: labKeys.byPatient(request.id) });
            qc.invalidateQueries({ queryKey: labKeys.pending() });
            // Patient status likely changed (sent-to-lab)
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdateLabRequest() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: {
            id: string;
            updates: Parameters<typeof LS.updateLabRequest>[1];
        }) => LS.updateLabRequest(id, updates),

        // Optimistic — status chips update instantly
        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: labKeys.detail(id) });
            const previous = qc.getQueryData<LabRequest>(labKeys.detail(id));
            if (previous) qc.setQueryData(labKeys.detail(id), { ...previous, ...updates });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(labKeys.detail(ctx.id), ctx.previous);
        },

        onSuccess: (updated) => {
            qc.setQueryData(labKeys.detail(updated.id), updated);
            qc.invalidateQueries({ queryKey: labKeys.byPatient(updated.id) });
            qc.invalidateQueries({ queryKey: labKeys.pending() });
            qc.invalidateQueries({ queryKey: labKeys.completed() });
        },
    });
}

// ─── Lab Test Catalog Queries ─────────────────────────────────────────────────

export function useActiveLabTests() {
    return useQuery({
        queryKey: labKeys.catalogActive(),
        queryFn: LS.listActiveLabTests,
        staleTime: CATALOG_STALE,  // catalog barely changes
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        select: (data) =>
            // Group by category for dropdown use
            data.reduce<Record<string, LS.LabTestCatalogItem[]>>((acc, test) => {
                const cat = test.category ?? "Other";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(test);
                return acc;
            }, {}),
    });
}

export function useLabTestCatalog() {
    return useQuery({
        queryKey: labKeys.catalog(),
        queryFn: LS.listAllLabTests,
        staleTime: CATALOG_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Lab Test Catalog Mutations ───────────────────────────────────────────────

export function useUpsertLabTest() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ test, id }: { test: Partial<LS.LabTestCatalogItem>; id?: string }) =>
            LS.upsertLabTest(test, id),

        onSuccess: (upserted) => {
            // Update detail in both catalog caches
            qc.setQueryData<LS.LabTestCatalogItem[]>(labKeys.catalog(), (old = []) => {
                const idx = old.findIndex(t => t.id === upserted.id);
                return idx >= 0
                    ? old.map(t => t.id === upserted.id ? upserted : t)
                    : [upserted, ...old];
            });
            // Active catalog may have changed
            qc.invalidateQueries({ queryKey: labKeys.catalogActive() });
        },
    });
}

export function useDeleteLabTest() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => LS.deleteLabTest(id),

        // Optimistic remove
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: labKeys.catalog() });
            const previous = qc.getQueryData<LS.LabTestCatalogItem[]>(labKeys.catalog());
            qc.setQueryData<LS.LabTestCatalogItem[]>(labKeys.catalog(),
                (old = []) => old.filter(t => t.id !== id)
            );
            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(labKeys.catalog(), ctx.previous);
        },

        onSettled: () => {
            qc.invalidateQueries({ queryKey: labKeys.catalog() });
            qc.invalidateQueries({ queryKey: labKeys.catalogActive() });
        },
    });
}

export function useToggleLabTestActive() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, current }: { id: string; current: boolean }) =>
            LS.toggleLabTestActive(id, current),

        // Optimistic toggle
        onMutate: async ({ id, current }) => {
            await qc.cancelQueries({ queryKey: labKeys.catalog() });
            const previous = qc.getQueryData<LS.LabTestCatalogItem[]>(labKeys.catalog());
            qc.setQueryData<LS.LabTestCatalogItem[]>(labKeys.catalog(),
                (old = []) => old.map(t => t.id === id ? { ...t, is_active: !current } : t)
            );
            return { previous };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(labKeys.catalog(), ctx.previous);
        },

        onSettled: () => {
            qc.invalidateQueries({ queryKey: labKeys.catalog() });
            qc.invalidateQueries({ queryKey: labKeys.catalogActive() });
        },
    });
}