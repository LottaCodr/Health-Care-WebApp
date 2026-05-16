"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientKeys } from "../query-keys";
import * as PatientService from "@/lib/services/patient.service";
import type { Patient, PatientStatus } from "@/types/models";

// ─── Cache config ─────────────────────────────────────────────────────────────

const LIST_STALE = 30_000;       // 30s  — queue changes often
const DETAIL_STALE = 60_000;       // 1min — patient detail
const GC_TIME = 10 * 60_000;  // 10min — keep in memory after unmount

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePatient(id: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: patientKeys.detail(id),
        queryFn: () => PatientService.getPatientById(id),
        enabled: !!id && opts?.enabled !== false,
        staleTime: DETAIL_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function usePatientsByStatus(status: PatientStatus) {
    return useQuery({
        queryKey: patientKeys.byStatus(status),
        queryFn: () => PatientService.listPatientsByStatus(status),
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useSearchPatients(query: string) {
    return useQuery({
        queryKey: patientKeys.search(query),
        queryFn: () => PatientService.searchPatients(query),
        enabled: query.trim().length >= 2,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,   // keep showing previous results while new query fetches
    });
}

export function useAllPatients() {
    return useQuery({
        queryKey: patientKeys.lists(),
        queryFn: () => PatientService.getAllPatients(),
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePatient() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: Parameters<typeof PatientService.createPatient>[0]) =>
            PatientService.createPatient(data),

        onSuccess: (patient) => {
            // Seed detail cache — instant navigation without extra request
            qc.setQueryData(patientKeys.detail(patient.id), patient);
            // Bust all patient lists
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdatePatient() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Patient> }) =>
            PatientService.updatePatient(id, updates),

        onSuccess: (updated) => {
            qc.setQueryData(patientKeys.detail(updated.id), updated);
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdatePatientStatus() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: PatientStatus }) =>
            PatientService.updatePatientStatus(id, status),

        // Optimistic: status badge updates instantly, rolls back on failure
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: patientKeys.detail(id) });
            const previous = qc.getQueryData<Patient>(patientKeys.detail(id));
            if (previous) qc.setQueryData(patientKeys.detail(id), { ...previous, status });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(patientKeys.detail(ctx.id), ctx.previous);
        },

        onSettled: (_data, _err, { id }) => {
            qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}