"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nursingKeys, patientKeys } from "../query-keys";
import * as NS from "@/lib/services/nursing.service";

const LIST_STALE = 30_000;
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePendingNursingActions() {
    return useQuery({
        queryKey: nursingKeys.pending(),
        queryFn: NS.listPendingNursingActions,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: 60_000,   // auto-refresh for nurse dashboard
    });
}

export function useNursingActionsByPatient(
    patientId: string,
    opts?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: nursingKeys.byPatient(patientId),
        queryFn: () => NS.listNursingActionsByPatient(patientId),
        enabled: !!patientId && opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateNursingAction() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: NS.CreateNursingActionInput) => NS.createNursingAction(data),

        onSuccess: (action) => {
            qc.invalidateQueries({ queryKey: nursingKeys.byPatient(action.patient_id) });
            qc.invalidateQueries({ queryKey: nursingKeys.pending() });
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdateNursingAction() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: NS.UpdateNursingActionInput }) =>
            NS.updateNursingAction(id, updates),

        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: nursingKeys.byPatient(updated.patient_id) });
            qc.invalidateQueries({ queryKey: nursingKeys.pending() });
        },
    });
}