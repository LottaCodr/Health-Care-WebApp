"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { consultationKeys, patientKeys } from "../query-keys";
import * as CS from "@/lib/services/consultation.service";
import type { Consultation } from "@/types/models";

const LIST_STALE = 30_000;
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useConsultationsByPatient(patientId: string) {
    return useQuery({
        queryKey: consultationKeys.byPatient(patientId),
        queryFn: () => CS.listConsultationsByPatient(patientId),
        enabled: !!patientId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useConsultationsByDoctor(doctorId: string) {
    return useQuery({
        queryKey: consultationKeys.byDoctor(doctorId),
        queryFn: () => CS.listConsultationsByDoctor(doctorId),
        enabled: !!doctorId,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function useConsultation(id: string) {
    return useQuery({
        queryKey: consultationKeys.detail(id),
        queryFn: () => CS.getConsultationById(id),
        enabled: !!id,
        staleTime: 60_000,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateConsultation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: CS.CreateConsultationInput) => CS.createConsultation(data),

        onSuccess: (consultation) => {
            qc.setQueryData(consultationKeys.detail(consultation.id), consultation);
            // Bust patient's consultation list
            qc.invalidateQueries({
                queryKey: consultationKeys.byPatient(consultation.patient_id),
            });
            qc.invalidateQueries({
                queryKey: consultationKeys.byDoctor(consultation.doctor_id),
            });
            // Patient status may have changed (now under-consultation)
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdateConsultation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Consultation> }) =>
            CS.updateConsultation(id, updates),

        onMutate: async ({ id, updates }) => {
            await qc.cancelQueries({ queryKey: consultationKeys.detail(id) });
            const previous = qc.getQueryData<Consultation>(consultationKeys.detail(id));
            if (previous) qc.setQueryData(consultationKeys.detail(id), { ...previous, ...updates });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(consultationKeys.detail(ctx.id), ctx.previous);
        },

        onSuccess: (updated) => {
            qc.setQueryData(consultationKeys.detail(updated.id), updated);
            qc.invalidateQueries({ queryKey: consultationKeys.byPatient(updated.patient_id) });
            qc.invalidateQueries({ queryKey: consultationKeys.byDoctor(updated.doctor_id) });
        },
    });
}

export function useDeleteConsultation() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => CS.deleteConsultation(id),

        onSuccess: (_data, id) => {
            qc.removeQueries({ queryKey: consultationKeys.detail(id) });
            // Invalidate all consultation lists — we don't know which patient
            qc.invalidateQueries({ queryKey: consultationKeys.all() });
        },
    });
}