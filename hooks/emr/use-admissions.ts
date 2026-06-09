"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as AS from "@/lib/services/admission.service";
import type { CreateAdmissionInput, AssignWardInput } from "@/types/admission.types";
import { admissionKeys } from "../query-keys";


const STALE = 30_000;
const GC    = 5 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useActiveAdmissions() {
    return useQuery({
        queryKey:        admissionKeys.active(),
        queryFn:         AS.getActiveAdmissions,
        staleTime:       STALE,
        gcTime:          GC,
        refetchInterval: 60_000,
    });
}

export function usePatientAdmissions(patientId: string) {
    return useQuery({
        queryKey:  admissionKeys.byPatient(patientId),
        queryFn:   () => AS.getAdmissionsByPatient(patientId),
        enabled:   !!patientId,
        staleTime: STALE,
        gcTime:    GC,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAdmission() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateAdmissionInput) => AS.createAdmission(input),
        onSuccess:  (data) => {
            qc.invalidateQueries({ queryKey: admissionKeys.active() });
            qc.invalidateQueries({ queryKey: admissionKeys.byPatient(data.patient_id) });
            qc.invalidateQueries({ queryKey: ["patients"] });
        },
    });
}

export function useAssignWard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AssignWardInput) => AS.assignWard(input),
        onSuccess:  (data) => {
            qc.invalidateQueries({ queryKey: admissionKeys.active() });
            qc.invalidateQueries({ queryKey: admissionKeys.byPatient(data.patient_id) });
        },
    });
}

export function useDischargeFromWard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (admissionId: string) => AS.dischargeFromWard(admissionId),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: admissionKeys.active() });
            qc.invalidateQueries({ queryKey: ["patients"] });
        },
    });
}