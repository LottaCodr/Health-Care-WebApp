"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as NS from "@/lib/services/nurse-charts.service";
import { nursingKeys } from "../query-keys";

// ─── Drug Chart Query Keys ────────────────────────────────────────────────────

export const drugChartKeys = {
    all:       ()           => ["drug_chart"]                       as const,
    byPatient: (id: string) => ["drug_chart", "patient", id]        as const,
    detail:    (id: string) => ["drug_chart", "detail", id]         as const,
};

// ─── Fluid Balance Query Keys ─────────────────────────────────────────────────

export const fluidBalanceKeys = {
    all:            ()                              => ["fluid_balance"]                          as const,
    byPatientDate:  (id: string, date: string)      => ["fluid_balance", "patient", id, date]    as const,
};

// ─── Drug Chart Hooks ─────────────────────────────────────────────────────────

export function useDrugChartByPatient(patientId: string) {
    return useQuery({
        queryKey:             drugChartKeys.byPatient(patientId),
        queryFn:              () => NS.listDrugChartByPatient(patientId),
        enabled:              !!patientId,
        staleTime:            2 * 60_000,
        gcTime:               10 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateDrugChartEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: NS.CreateDrugChartInput) => NS.createDrugChartEntry(input),
        onSuccess: (entry) => {
            qc.invalidateQueries({ queryKey: drugChartKeys.byPatient(entry.patient_id) });
            qc.invalidateQueries({ queryKey: nursingKeys.byPatient(entry.patient_id) });
        },
    });
}

export function useUpdateDrugChartEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            updates,
        }: {
            id: string;
            updates: Partial<NS.CreateDrugChartInput & { isActive: boolean }>;
        }) => NS.updateDrugChartEntry(id, updates),
        onSuccess: (entry) => {
            qc.invalidateQueries({ queryKey: drugChartKeys.byPatient(entry.patient_id) });
        },
    });
}

export function useDeleteDrugChartEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, patientId }: { id: string; patientId: string }) =>
            NS.deleteDrugChartEntry(id),
        onSuccess: (_, { patientId }) => {
            qc.invalidateQueries({ queryKey: drugChartKeys.byPatient(patientId) });
        },
    });
}

// ─── Drug Administration Hooks ────────────────────────────────────────────────

export function useLogDrugAdministration() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: Parameters<typeof NS.logDrugAdministration>[0]) =>
            NS.logDrugAdministration(input),
        onSuccess: (record) => {
            qc.invalidateQueries({ queryKey: drugChartKeys.byPatient(record.patient_id) });
        },
    });
}

// ─── Fluid Balance Hooks ──────────────────────────────────────────────────────

export function useFluidBalanceByPatientDate(patientId: string, date: string) {
    return useQuery({
        queryKey:             fluidBalanceKeys.byPatientDate(patientId, date),
        queryFn:              () => NS.listFluidBalanceByPatientDate(patientId, date),
        enabled:              !!patientId && !!date,
        staleTime:            2 * 60_000,
        gcTime:               10 * 60_000,
        refetchOnWindowFocus: false,
    });
}

export function useCreateFluidEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: NS.CreateFluidEntryInput) => NS.createFluidEntry(input),
        onSuccess: (entry) => {
            qc.invalidateQueries({
                queryKey: fluidBalanceKeys.byPatientDate(entry.patient_id, entry.record_date),
            });
            qc.invalidateQueries({ queryKey: nursingKeys.byPatient(entry.patient_id) });
        },
    });
}

export function useDeleteFluidEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            patientId,
            date,
        }: {
            id: string;
            patientId: string;
            date: string;
        }) => NS.deleteFluidEntry(id),
        onSuccess: (_, { patientId, date }) => {
            qc.invalidateQueries({
                queryKey: fluidBalanceKeys.byPatientDate(patientId, date),
            });
        },
    });
}